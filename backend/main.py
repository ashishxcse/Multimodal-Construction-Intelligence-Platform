"""
FastAPI main application - AI-Powered Multimodal Construction Intelligence Platform
All financial values in INR (₹). Structured JSON responses via Pydantic v2.
"""
import logging
from datetime import date
from io import BytesIO
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, Field, model_validator
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from schemas import (
    SiteAnalysisResponse, CostEstimationResponse, SafetyInspectionResponse,
    ProgressMonitoringResponse, MaterialAnalysisResponse, ProjectReportResponse,
    ChatResponse, ErrorResponse, HealthResponse,
)
from ai_service import AIServiceError, GroqAIService
from config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


class APIRequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

# ─────────────────── App Lifespan ────────────────────────────────

ai_service: Optional[GroqAIService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ai_service
    if settings.groq_api_key:
        ai_service = GroqAIService(
            api_key=settings.groq_api_key,
            vision_model=settings.groq_vision_model,
            text_model=settings.groq_text_model,
            base_url=settings.groq_base_url,
        )
        logger.info(
            "Groq AI service initialized (text: %s, vision: %s).",
            settings.groq_text_model,
            settings.groq_vision_model,
        )
    else:
        ai_service = None
        logger.warning("GROQ_API_KEY is not configured; AI endpoints are unavailable.")
    yield
    logger.info("Shutting down Construction Intelligence Platform.")


app = FastAPI(
    title="AI Construction Intelligence Platform",
    description="Multimodal AI system for construction site analysis, safety inspection, cost estimation, and reporting.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AIServiceError)
async def ai_service_error_handler(request: Request, error: AIServiceError):
    detail = (
        "The AI provider returned an invalid response. Please retry."
        if error.code == "invalid_ai_response"
        else "The AI provider is temporarily unavailable. Please retry."
    )
    return JSONResponse(
        status_code=502,
        content=ErrorResponse(detail=detail, code=error.code).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, error: HTTPException):
    if isinstance(error.detail, dict):
        code = error.detail.get("code", "http_error")
        detail = error.detail.get("message", "Request failed.")
    else:
        code = f"http_{error.status_code}"
        detail = error.detail
    body = ErrorResponse(detail=detail, code=code).model_dump()
    return JSONResponse(status_code=error.status_code, content=body, headers=error.headers)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, error: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            detail="Request validation failed.",
            code="validation_error",
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, error: Exception):
    logger.error("Unhandled request error (%s)", type(error).__name__)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail="An unexpected server error occurred.",
            code="internal_error",
        ).model_dump(),
    )

# ─────────────────── Dependency ──────────────────────────────────

def get_ai_service() -> GroqAIService:
    if ai_service is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "ai_unavailable",
                "message": "AI features are unavailable until GROQ_API_KEY is configured.",
            },
        )
    return ai_service


# ─────────────────── Health Check ────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Construction Intelligence Platform",
        "ai_available": ai_service is not None,
        "version": "1.0.0"
    }


async def read_image_upload(image: UploadFile) -> tuple[bytes, str]:
    allowed_formats = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "GIF": "image/gif"}
    image_bytes = await image.read(settings.max_image_size_bytes + 1)
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > settings.max_image_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Maximum size is {settings.max_image_size_mb} MB.",
        )

    try:
        with Image.open(BytesIO(image_bytes)) as decoded_image:
            if decoded_image.format not in allowed_formats:
                raise HTTPException(status_code=400, detail="Use a JPEG, PNG, WEBP, or GIF image.")
            if decoded_image.width * decoded_image.height > 40_000_000:
                raise HTTPException(status_code=413, detail="Image dimensions exceed the supported limit.")
            decoded_image.verify()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as error:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from error

    return image_bytes, allowed_formats[decoded_image.format]


# ─────────────────── 1. Site Analysis (Multimodal) ───────────────

@app.post("/api/site-analysis", response_model=SiteAnalysisResponse, tags=["Analysis"])
async def analyze_site(
    image: UploadFile = File(..., description="Construction site image"),
    context: str = Form(default="", max_length=4000, description="Additional context about the site"),
    service: GroqAIService = Depends(get_ai_service),
):
    """
    Analyze a construction site image using multimodal AI.
    Returns site conditions, detected elements, safety concerns, and recommendations.
    """
    image_bytes, image_type = await read_image_upload(image)

    system_prompt = """You are an expert construction site analyst with 20+ years of experience.
Analyze the provided construction site image and extract detailed information about:
- Site conditions and readiness
- Detected construction elements and infrastructure
- Visible structural distress, including cracks, spalling, exposed reinforcement, or deformation
- Safety hazards and concerns
- Infrastructure readiness assessment
- Actionable recommendations for site engineers
All assessments must be practical and conservative. Image findings are preliminary visual observations, not engineering diagnoses.
For each structural finding, include location, risk level, corrective action, confidence, and uncertainty notes.
Return an empty structural_findings list if no relevant distress is visible. Require qualified professional review of suspected defects."""

    user_prompt = f"""Analyze this construction site image comprehensively.
{f'Additional context: {context}' if context else ''}
Provide a thorough analysis including site condition, detected elements, visible crack/structural findings, safety concerns,
risk assessment, uncertainty notes, and recommended actions. Use applicable Indian standards and regulatory references.
Express infrastructure readiness and confidence as scores from 0-100. Do not infer crack depth, structural capacity, or hidden damage from an image."""

    return await run_in_threadpool(service.analyze_image_with_text,
        image_bytes=image_bytes,
        image_type=image_type,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema=SiteAnalysisResponse,
    )


# ─────────────────── 2. Cost Estimation ──────────────────────────

class CostEstimationRequest(APIRequestModel):
    project_type: str = Field(default="Residential", min_length=1, max_length=100)
    location: str = Field(default="Mumbai, Maharashtra", min_length=1, max_length=200)
    built_up_area_sqft: float = Field(default=1000.0, gt=0, le=10_000_000)
    floors: int = Field(default=1, ge=1, le=100)
    quality_standard: str = Field(default="Standard", min_length=1, max_length=100)
    special_requirements: Optional[str] = Field(default=None, max_length=4000)


@app.post("/api/cost-estimation", response_model=CostEstimationResponse, tags=["Estimation"])
async def estimate_cost(
    request: CostEstimationRequest,
    service: GroqAIService = Depends(get_ai_service),
):
    """
    Generate detailed cost estimation for construction projects in INR (₹).
    """
    system_prompt = """You are a certified quantity surveyor and cost consultant specializing in Indian construction markets.
Generate an indicative construction estimate in Indian Rupees (₹/INR), not a quotation.
No live market-rate source is connected. State assumptions and uncertainty; never claim current or verified rates.
For each line item provide quantity, unit, and estimated unit rate. The server calculates line and grand totals."""

    user_prompt = f"""Generate a comprehensive construction cost estimate for:
- Project Type: {request.project_type}
- Location: {request.location}
- Built-up Area: {request.built_up_area_sqft} sq.ft
- Number of Floors: {request.floors}
- Quality Standard: {request.quality_standard}
{f'- Special Requirements: {request.special_requirements}' if request.special_requirements else ''}

Provide an itemized estimate with quantities, units, estimated unit rates in INR, assumptions, uncertainty, and risks.
Cover civil work, finishing, MEP services, external development, fees and approvals, and contingency where applicable.
Do not invent live supplier quotes or rate-source citations. The server calculates line and grand totals from quantities and rates."""

    result = await run_in_threadpool(service.query_text,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema=CostEstimationResponse,
    )
    result.cost_per_sqft_inr = round(result.total_estimated_cost_inr / request.built_up_area_sqft, 2)
    return result


# ─────────────────── 3. Safety Inspection (Multimodal) ───────────

@app.post("/api/safety-inspection", response_model=SafetyInspectionResponse, tags=["Safety"])
async def inspect_safety(
    image: UploadFile = File(..., description="Site safety inspection image"),
    site_type: str = Form(default="construction", max_length=100, description="Type of construction site"),
    service: GroqAIService = Depends(get_ai_service),
):
    """
    AI-powered safety inspection using site images.
    Detects PPE violations, safety hazards, and compliance issues.
    """
    image_bytes, image_type = await read_image_upload(image)

    system_prompt = """You are a certified construction safety inspector with expertise in Indian safety regulations.
Analyze construction site images for safety compliance per:
- The Factories Act 1948
- Building & Other Construction Workers Act 1996
- IS 4130 Safety Requirements
- OSHA guidelines adapted for Indian context
Be thorough, precise, and conservative in safety assessments."""

    user_prompt = f"""Inspect this {site_type} construction site image for safety compliance.
Identify:
1. PPE compliance (helmets, safety vests, gloves, safety boots)
2. Safety violations and their severity
3. Structural or environmental hazards
4. Regulatory compliance issues
5. Corrective actions required
6. Estimated penalties for violations in INR
Score overall safety from 0 (critical danger) to 100 (fully compliant). Include a risk level, confidence score from 0-100,
and uncertainty notes. Treat results as preliminary screening, not certification or legal advice; require qualified safety review."""

    return await run_in_threadpool(service.analyze_image_with_text,
        image_bytes=image_bytes,
        image_type=image_type,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema=SafetyInspectionResponse,
    )


# ─────────────────── 4. Progress Monitoring ──────────────────────

class ProgressRequest(APIRequestModel):
    project_name: str = Field(default="Construction Project", min_length=1, max_length=200)
    start_date: date = date(2024, 1, 1)
    planned_end_date: date = date(2024, 12, 31)
    total_budget_inr: float = Field(default=10_000_000.0, gt=0)
    spent_so_far_inr: float = Field(default=5_000_000.0, ge=0)
    current_phase: str = Field(default="Structure", min_length=1, max_length=100)
    completed_phases: list[str] = Field(default_factory=list, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.planned_end_date <= self.start_date:
            raise ValueError("planned_end_date must be after start_date")
        return self


@app.post("/api/progress-monitoring", response_model=ProgressMonitoringResponse, tags=["Monitoring"])
async def monitor_progress(
    request: ProgressRequest,
    service: GroqAIService = Depends(get_ai_service),
):
    """
    AI-driven project progress monitoring and schedule analysis.
    """
    system_prompt = """You are an expert construction project manager and schedule analyst.
Analyze project progress data and provide accurate assessment of:
- Schedule adherence and variance
- Budget utilization efficiency  
- Phase-by-phase progress evaluation
- Critical path analysis
- Resource optimization recommendations
Use Earned Value Management (EVM) principles where applicable."""

    user_prompt = f"""Analyze construction project progress:
- Project: {request.project_name}
- Start Date: {request.start_date}
- Planned End Date: {request.planned_end_date}
- Total Budget: ₹{request.total_budget_inr:,.0f}
- Spent So Far: ₹{request.spent_so_far_inr:,.0f}
- Current Phase: {request.current_phase}
- Completed Phases: {', '.join(request.completed_phases) or 'None'}
{f'- Notes: {request.notes}' if request.notes else ''}

Provide detailed progress analysis including phase completion percentages, schedule variance, 
budget tracking, and projected completion date. All amounts in INR."""

    return await run_in_threadpool(service.query_text,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema=ProgressMonitoringResponse,
    )


# ─────────────────── 5. Material Analysis ────────────────────────

class MaterialRequest(APIRequestModel):
    project_type: str = Field(default="Residential", min_length=1, max_length=100)
    built_up_area_sqft: float = Field(default=1000.0, gt=0, le=10_000_000)
    location: str = Field(default="Bengaluru, Karnataka", min_length=1, max_length=200)
    quality_grade: str = Field(default="Standard", min_length=1, max_length=100)
    construction_type: str = Field(default="RCC Frame Structure", min_length=1, max_length=100)
    special_materials: Optional[str] = Field(default=None, max_length=4000)


@app.post("/api/material-analysis", response_model=MaterialAnalysisResponse, tags=["Materials"])
async def analyze_materials(
    request: MaterialRequest,
    service: GroqAIService = Depends(get_ai_service),
):
    """
    AI-powered material requirement analysis and cost optimization.
    Returns an indicative BOQ with server-calculated line and grand totals.
    """
    system_prompt = """You are an expert construction materials analyst and procurement specialist.
Generate an indicative Bill of Quantities, not a quotation. No live price feed is connected.
State assumptions and uncertainty; do not claim prices are current or verified. Provide quantity, unit, and estimated unit rate for each item.
The server calculates line and grand totals. Use Indian Rupees (₹/INR)."""

    user_prompt = f"""Generate comprehensive material analysis and BOQ for:
- Project Type: {request.project_type}
- Built-up Area: {request.built_up_area_sqft} sq.ft
- Location: {request.location}
- Quality Grade: {request.quality_grade}
- Construction Type: {request.construction_type}
{f'- Special Materials: {request.special_materials}' if request.special_materials else ''}

Include cement, steel, aggregates, sand, bricks, tiles, waterproofing, paint, electrical and plumbing materials.
Provide estimated unit rates in INR, assumptions, uncertainty, supplier category recommendations, and quality grades.
Do not claim live prices or verified supplier offers."""

    return await run_in_threadpool(service.query_text,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema=MaterialAnalysisResponse,
    )


# ─────────────────── 6. Project Report Generation ────────────────

class ReportRequest(APIRequestModel):
    project_name: str = Field(min_length=1, max_length=200)
    project_type: str = Field(default="Residential", min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=200)
    start_date: date
    planned_end_date: date
    total_budget_inr: float = Field(gt=0)
    spent_inr: float = Field(ge=0)
    current_progress_percent: float = Field(ge=0, le=100)
    current_phase: str = Field(min_length=1, max_length=100)
    team_size: int = Field(default=50, ge=1, le=100_000)
    key_issues: Optional[str] = Field(default=None, max_length=4000)
    achievements: Optional[str] = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.planned_end_date <= self.start_date:
            raise ValueError("planned_end_date must be after start_date")
        return self


@app.post("/api/project-report", response_model=ProjectReportResponse, tags=["Reports"])
async def generate_report(
    request: ReportRequest,
    service: GroqAIService = Depends(get_ai_service),
):
    """
    Generate comprehensive AI-powered project status report.
    """
    system_prompt = """You are a senior construction project manager generating executive-level project reports.
Produce comprehensive, professional reports that provide actionable insights for:
- Project owners and investors
- Site engineers and contractors
- Regulatory and compliance teams
Use EVM, KPI frameworks, and Indian construction industry standards."""

    user_prompt = f"""Generate a comprehensive project status report for:
- Project Name: {request.project_name}
- Type: {request.project_type} at {request.location}
- Timeline: {request.start_date} to {request.planned_end_date}
- Budget: ₹{request.total_budget_inr:,.0f} | Spent: ₹{request.spent_inr:,.0f}
- Progress: {request.current_progress_percent}% | Phase: {request.current_phase}
- Team Size: {request.team_size} workers
{f'- Key Issues: {request.key_issues}' if request.key_issues else ''}
{f'- Achievements: {request.achievements}' if request.achievements else ''}

Generate executive summary, KPIs, milestone status, financial summary, risk register, and action items.
All financial figures in Indian Rupees (₹)."""

    return await run_in_threadpool(service.query_text,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema=ProjectReportResponse,
    )


# ─────────────────── 7. AI Chat Assistant ────────────────────────

class ChatRequest(APIRequestModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=4000)
    context: Optional[str] = Field(default=None, max_length=4000)


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_ai(
    request: ChatRequest,
    service: GroqAIService = Depends(get_ai_service),
):
    """
    AI construction expert chat assistant.
    Answers queries about construction, costs (INR), safety, materials, and regulations.
    """
    system_prompt = """You are ConstructAI, an expert AI assistant specialized in Indian construction industry.
You have deep knowledge of:
- Indian construction standards (IS codes, BIS standards)
- Building bylaws and local authority regulations
- Material costs and market prices in INR (₹)
- Safety regulations (Factories Act, BOCW Act)
- Project management (PERT, CPM, EVM)
- Structural engineering and architecture
- Environmental and sustainability aspects

Always provide practical, actionable advice. Quote prices in Indian Rupees (₹).
Be concise but comprehensive. Reference relevant IS codes and regulations when applicable."""

    user_prompt = f"""{request.message}
{f'Context: {request.context}' if request.context else ''}"""

    return await run_in_threadpool(service.chat_query,
        system_prompt=system_prompt,
        user_message=user_prompt,
        schema=ChatResponse,
    )


# ─────────────────── 8. Image-based Progress (Multimodal) ─────────

@app.post("/api/visual-progress", response_model=ProgressMonitoringResponse, tags=["Monitoring"])
async def visual_progress_analysis(
    image: UploadFile = File(...),
    project_name: str = Form(default="Construction Project", min_length=1, max_length=200),
    total_budget_inr: float = Form(default=10000000.0, gt=0),
    service: GroqAIService = Depends(get_ai_service),
):
    """
    Analyze construction progress from an image using multimodal AI.
    """
    image_bytes, image_type = await read_image_upload(image)

    system_prompt = """You are an expert construction progress analyst using computer vision.
Analyze construction site images to determine:
- Overall construction progress percentage
- Visible construction phases and their completion
- Resource utilization (workers, equipment)
- Quality observations
- Schedule adherence indicators
Be precise and conservative in progress estimates."""

    user_prompt = f"""Analyze this construction site image for project: {project_name}
Total project budget: ₹{total_budget_inr:,.0f}

Estimate:
1. Overall progress percentage (0-100%)
2. Which construction phases are visible and their completion
3. Number of visible workers and equipment
4. Quality observations
5. Projected completion based on visible progress
6. Budget utilization estimate in ₹"""

    return await run_in_threadpool(service.analyze_image_with_text,
        image_bytes=image_bytes,
        image_type=image_type,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema=ProgressMonitoringResponse,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)

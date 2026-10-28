"""
Pydantic schemas for AI response validation with fallback defaults.
All financial values are in Indian Rupees (INR/₹).
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ResponseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ErrorResponse(ResponseModel):
    detail: str
    code: str


class HealthResponse(ResponseModel):
    status: Literal["healthy"]
    service: str
    ai_available: bool
    version: str


# ─────────────────────────── Shared ────────────────────────────

class RiskItem(ResponseModel):
    severity: Literal["low", "medium", "high", "critical"]
    description: str
    mitigation: str


class StructuralFinding(ResponseModel):
    finding: str
    location: str
    risk_level: Literal["low", "medium", "high", "critical"]
    recommended_action: str
    confidence_score: int = Field(ge=0, le=100)
    uncertainty_notes: list[str]


class CostItem(ResponseModel):
    label: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=40)
    quantity: float = Field(gt=0, le=1_000_000_000)
    unit_rate_inr: float = Field(ge=0)
    amount_inr: float = Field(default=0, ge=0, description="Server-calculated amount in Indian Rupees")

    @model_validator(mode="after")
    def calculate_amount(self):
        self.amount_inr = round(self.quantity * self.unit_rate_inr, 2)
        return self


# ─────────────────── Site Analysis (Image) ──────────────────────

class SiteAnalysisResponse(ResponseModel):
    summary: str
    site_condition: str
    detected_elements: list[str]
    safety_concerns: list[str]
    recommended_actions: list[str]
    risk_level: Literal["low", "medium", "high", "critical"]
    estimated_site_area_sqft: float | None
    infrastructure_readiness_score: int = Field(ge=0, le=100)
    confidence_score: int = Field(ge=0, le=100)
    uncertainty_notes: list[str]
    professional_review_required: Literal[True] = True
    professional_review_warning: Literal[
        "AI-assisted visual screening only; a qualified construction professional must verify findings on site."
    ] = "AI-assisted visual screening only; a qualified construction professional must verify findings on site."
    structural_findings: list[StructuralFinding]
    risks: list[RiskItem]


# ─────────────────── Cost Estimation ─────────────────────────────

class CostEstimationResponse(ResponseModel):
    project_name: str
    project_type: str
    total_estimated_cost_inr: float = Field(default=0, ge=0)
    cost_breakdown: list[CostItem] = Field(min_length=1, max_length=1000)
    cost_per_sqft_inr: float = Field(default=0, ge=0)
    timeline_months: int = Field(ge=1)
    risks: list[RiskItem]
    recommendations: list[str]
    assumptions: list[str] = Field(min_length=1, max_length=50)
    estimate_source: Literal["AI-generated indicative estimate; no live rate feed"] = "AI-generated indicative estimate; no live rate feed"
    confidence_score: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def calculate_total(self):
        self.total_estimated_cost_inr = round(sum(item.amount_inr for item in self.cost_breakdown), 2)
        return self


# ─────────────────── Safety Inspection ──────────────────────────

class SafetyViolation(ResponseModel):
    violation_type: str
    location_in_image: str
    severity: Literal["low", "medium", "high", "critical"]
    corrective_action: str
    regulatory_reference: str


class PPECompliance(ResponseModel):
    helmet: bool
    safety_vest: bool
    gloves: bool
    safety_boots: bool


class SafetyInspectionResponse(ResponseModel):
    overall_safety_score: int = Field(ge=0, le=100)
    compliance_status: str
    violations: list[SafetyViolation]
    ppe_compliance: PPECompliance
    immediate_actions_required: list[str]
    recommendations: list[str]
    estimated_penalty_inr: float = Field(ge=0)
    next_inspection_date: str
    risk_level: Literal["low", "medium", "high", "critical"]
    confidence_score: int = Field(ge=0, le=100)
    uncertainty_notes: list[str]
    professional_review_required: Literal[True] = True
    professional_review_warning: Literal[
        "AI-assisted screening is not a compliance certification; a qualified safety professional must verify findings on site."
    ] = "AI-assisted screening is not a compliance certification; a qualified safety professional must verify findings on site."


# ─────────────────── Progress Monitoring ─────────────────────────

class PhaseProgress(ResponseModel):
    phase_name: str
    planned_percent: float = Field(ge=0, le=100)
    actual_percent: float = Field(ge=0, le=100)
    status: Literal["pending", "in_progress", "delayed", "completed"]
    delay_days: int = Field(ge=0)


class ProgressMonitoringResponse(ResponseModel):
    overall_progress_percent: float = Field(ge=0, le=100)
    schedule_variance_days: int
    phases: list[PhaseProgress]
    resource_utilization_percent: float = Field(ge=0, le=100)
    budget_utilized_inr: float = Field(ge=0)
    budget_remaining_inr: float
    key_observations: list[str]
    recommendations: list[str]
    projected_completion_date: str


# ─────────────────── Material Analysis ──────────────────────────

class MaterialItem(ResponseModel):
    name: str = Field(min_length=1, max_length=100)
    quantity_required: float = Field(gt=0, le=1_000_000_000)
    unit: str = Field(min_length=1, max_length=40)
    unit_cost_inr: float = Field(ge=0)
    total_cost_inr: float = Field(default=0, ge=0)
    supplier_recommendation: str
    quality_grade: str

    @model_validator(mode="after")
    def calculate_total(self):
        self.total_cost_inr = round(self.quantity_required * self.unit_cost_inr, 2)
        return self


class MaterialAnalysisResponse(ResponseModel):
    project_description: str
    total_material_cost_inr: float = Field(default=0, ge=0)
    materials: list[MaterialItem] = Field(min_length=1, max_length=1000)
    wastage_factor_percent: float = Field(ge=0, le=100)
    procurement_timeline_days: int = Field(ge=0)
    recommendations: list[str]
    cost_optimization_tips: list[str]
    assumptions: list[str] = Field(min_length=1, max_length=50)
    estimate_source: Literal["AI-generated indicative estimate; no live rate feed"] = "AI-generated indicative estimate; no live rate feed"

    @model_validator(mode="after")
    def calculate_total(self):
        self.total_material_cost_inr = round(sum(item.total_cost_inr for item in self.materials), 2)
        return self


# ─────────────────── Project Report ─────────────────────────────

class MilestoneItem(ResponseModel):
    name: str
    planned_date: str
    actual_date: str | None
    status: Literal["pending", "in_progress", "delayed", "completed"]


class ProjectKPIs(ResponseModel):
    budget_utilization: str | float
    schedule_adherence: str | float
    quality_score: str | float
    safety_score: str | float


class FinancialSummary(ResponseModel):
    total_budget_inr: float = Field(ge=0)
    spent_inr: float = Field(ge=0)
    remaining_inr: float
    projected_overrun_inr: float = Field(ge=0)


class ProjectReportResponse(ResponseModel):
    project_name: str
    report_date: str
    executive_summary: str
    overall_health: Literal["On Track", "Delayed", "At Risk", "Completed"]
    kpis: ProjectKPIs
    milestones: list[MilestoneItem]
    financial_summary: FinancialSummary
    risks: list[RiskItem]
    action_items: list[str]
    next_steps: list[str]


# ─────────────────── Chat / General Query ───────────────────────

class ChatResponse(ResponseModel):
    answer: str
    follow_up_suggestions: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    data_points: list[str]

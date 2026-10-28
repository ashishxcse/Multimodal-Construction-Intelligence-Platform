"""Tests for API routing, validation, uploads, and provider error contracts."""
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

import main
from ai_service import AIServiceError
from config import Settings
from schemas import CostEstimationResponse


png_buffer = BytesIO()
Image.new("RGB", (1, 1), color="white").save(png_buffer, format="PNG")
TINY_PNG = png_buffer.getvalue()


def enable_validation_test(client: TestClient) -> None:
    client.app.dependency_overrides[main.get_ai_service] = lambda: object()


class TestHealth:
    def test_health_returns_200(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200

    def test_api_health_alias_returns_200(self, client: TestClient):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["ai_available"] is False

    def test_health_body_schema(self, client: TestClient):
        body = client.get("/health").json()
        assert "status" in body
        assert "version" in body
        assert "ai_available" in body
        assert body["status"] == "healthy"

    def test_health_service_name(self, client: TestClient):
        body = client.get("/health").json()
        assert "service" in body
        assert "Construction" in body["service"]


class TestMissingConfiguration:
    def test_missing_groq_key_defaults_to_empty(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        assert Settings(_env_file=None).groq_api_key == ""


class TestCORS:
    def test_cors_preflight_allowed_origin(self, client: TestClient):
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        # FastAPI CORS middleware returns 200 on preflight
        assert response.status_code in (200, 204)

    def test_cors_rejects_unlisted_origin(self, client: TestClient):
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 400
        assert "access-control-allow-origin" not in response.headers


class TestAIEndpointsWithoutKey:
    def test_chat_503_without_key(self, client: TestClient):
        response = client.post("/api/chat", json={"message": "hello"})
        assert response.status_code == 503
        assert response.json() == {
            "detail": "AI features are unavailable until GROQ_API_KEY is configured.",
            "code": "ai_unavailable",
        }

    def test_cost_estimation_rejects_invalid_area(self, client: TestClient):
        enable_validation_test(client)
        response = client.post(
            "/api/cost-estimation",
            json={"built_up_area_sqft": -100, "location": "Mumbai"},
        )
        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"

    def test_progress_rejects_negative_budget(self, client: TestClient):
        enable_validation_test(client)
        response = client.post(
            "/api/progress-monitoring",
            json={"total_budget_inr": -100},
        )
        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"

    def test_chat_rejects_empty_message(self, client: TestClient):
        enable_validation_test(client)
        response = client.post("/api/chat", json={"message": "  "})
        assert response.status_code == 422

    def test_ai_provider_failure_returns_structured_502(self, client: TestClient):
        class FailingService:
            def chat_query(self, **kwargs):
                raise AIServiceError("ai_provider_error")

        client.app.dependency_overrides[main.get_ai_service] = lambda: FailingService()
        response = client.post("/api/chat", json={"message": "Explain concrete curing"})

        assert response.status_code == 502
        assert response.json()["code"] == "ai_provider_error"
        assert "answer" not in response.json()

    def test_malformed_ai_output_returns_structured_502(self, client: TestClient):
        class MalformedService:
            def chat_query(self, **kwargs):
                raise AIServiceError("invalid_ai_response")

        client.app.dependency_overrides[main.get_ai_service] = lambda: MalformedService()
        response = client.post("/api/chat", json={"message": "Explain concrete curing"})

        assert response.status_code == 502
        assert response.json() == {
            "detail": "The AI provider returned an invalid response. Please retry.",
            "code": "invalid_ai_response",
        }

    def test_cost_total_and_rate_are_server_calculated(self, client: TestClient):
        class EstimateService:
            def query_text(self, **kwargs):
                return CostEstimationResponse.model_validate({
                    "project_name": "Sample",
                    "project_type": "Residential",
                    "total_estimated_cost_inr": 999999,
                    "cost_breakdown": [{
                        "label": "Concrete",
                        "unit": "m3",
                        "quantity": 2,
                        "unit_rate_inr": 1500,
                        "amount_inr": 1,
                    }],
                    "cost_per_sqft_inr": 999999,
                    "timeline_months": 3,
                    "risks": [],
                    "recommendations": [],
                    "assumptions": ["Indicative rate"],
                    "confidence_score": 40,
                })

        client.app.dependency_overrides[main.get_ai_service] = lambda: EstimateService()
        response = client.post("/api/cost-estimation", json={"built_up_area_sqft": 100})

        assert response.status_code == 200
        assert response.json()["total_estimated_cost_inr"] == 3000
        assert response.json()["cost_breakdown"][0]["amount_inr"] == 3000
        assert response.json()["cost_per_sqft_inr"] == 30

    def test_invalid_image_bytes_are_rejected(self, client: TestClient):
        enable_validation_test(client)
        response = client.post(
            "/api/site-analysis",
            files={"image": ("site.png", b"not an image", "image/png")},
        )

        assert response.status_code == 400
        assert response.json()["code"] == "http_400"

    def test_oversized_image_is_rejected_before_decode(self, client: TestClient, monkeypatch):
        enable_validation_test(client)
        monkeypatch.setattr(main.settings, "max_image_size_mb", 1)
        response = client.post(
            "/api/site-analysis",
            files={"image": ("large.png", b"x" * (1024 * 1024 + 1), "image/png")},
        )

        assert response.status_code == 413
        assert response.json()["code"] == "http_413"

    def test_safety_upload_returns_validated_reviewable_result(self, client: TestClient):
        class SafetyService:
            def analyze_image_with_text(self, schema, **kwargs):
                return schema.model_validate({
                    "overall_safety_score": 72,
                    "compliance_status": "Review required",
                    "violations": [],
                    "ppe_compliance": {
                        "helmet": True,
                        "safety_vest": True,
                        "gloves": False,
                        "safety_boots": True,
                    },
                    "immediate_actions_required": [],
                    "recommendations": ["Review glove use"],
                    "estimated_penalty_inr": 0,
                    "next_inspection_date": "Within 7 days",
                    "risk_level": "medium",
                    "confidence_score": 63,
                    "uncertainty_notes": ["Some workers are partly obscured"],
                })

        client.app.dependency_overrides[main.get_ai_service] = lambda: SafetyService()
        response = client.post(
            "/api/safety-inspection",
            files={"image": ("site.png", TINY_PNG, "image/png")},
            data={"site_type": "construction"},
        )

        assert response.status_code == 200
        assert response.json()["risk_level"] == "medium"
        assert response.json()["professional_review_required"] is True
        assert response.json()["uncertainty_notes"]

    def test_site_analysis_returns_structural_findings(self, client: TestClient):
        class SiteService:
            def analyze_image_with_text(self, schema, **kwargs):
                return schema.model_validate({
                    "summary": "Visible crack-like mark requires review.",
                    "site_condition": "Active construction",
                    "detected_elements": ["Concrete column"],
                    "safety_concerns": [],
                    "recommended_actions": ["Request engineer inspection"],
                    "risk_level": "medium",
                    "estimated_site_area_sqft": None,
                    "infrastructure_readiness_score": 60,
                    "confidence_score": 42,
                    "uncertainty_notes": ["Crack depth cannot be determined from the image"],
                    "structural_findings": [{
                        "finding": "Visible crack-like line",
                        "location": "Column C2",
                        "risk_level": "medium",
                        "recommended_action": "Have a structural engineer inspect the column",
                        "confidence_score": 42,
                        "uncertainty_notes": ["Cause and depth are not measurable from this image"],
                    }],
                    "risks": [],
                })

        client.app.dependency_overrides[main.get_ai_service] = lambda: SiteService()
        response = client.post(
            "/api/site-analysis",
            files={"image": ("site.png", TINY_PNG, "image/png")},
        )

        assert response.status_code == 200
        assert response.json()["structural_findings"][0]["risk_level"] == "medium"
        assert response.json()["professional_review_required"] is True

    def test_visual_progress_returns_validated_response(self, client: TestClient):
        class VisualService:
            def analyze_image_with_text(self, schema, **kwargs):
                return schema.model_validate({
                    "overall_progress_percent": 20,
                    "schedule_variance_days": 0,
                    "phases": [{
                        "phase_name": "Foundation",
                        "planned_percent": 25,
                        "actual_percent": 20,
                        "status": "in_progress",
                        "delay_days": 0,
                    }],
                    "resource_utilization_percent": 40,
                    "budget_utilized_inr": 100000,
                    "budget_remaining_inr": 900000,
                    "key_observations": ["Foundation work visible"],
                    "recommendations": [],
                    "projected_completion_date": "2027-01-01",
                })

        client.app.dependency_overrides[main.get_ai_service] = lambda: VisualService()
        response = client.post(
            "/api/visual-progress",
            files={"image": ("site.png", TINY_PNG, "image/png")},
            data={"total_budget_inr": "1000000"},
        )

        assert response.status_code == 200
        assert response.json()["overall_progress_percent"] == 20

    def test_chat_returns_validated_response(self, client: TestClient):
        class ChatService:
            def chat_query(self, **kwargs):
                return {
                    "answer": "Cure concrete as specified by the project engineer.",
                    "follow_up_suggestions": [],
                    "confidence": 0.7,
                    "data_points": [],
                }

        client.app.dependency_overrides[main.get_ai_service] = lambda: ChatService()
        response = client.post("/api/chat", json={"message": "How should I cure concrete?"})

        assert response.status_code == 200
        assert response.json()["answer"].startswith("Cure concrete")

    def test_progress_endpoint_returns_validated_response(self, client: TestClient):
        class ProgressService:
            def query_text(self, schema, **kwargs):
                return schema.model_validate({
                    "overall_progress_percent": 35,
                    "schedule_variance_days": 2,
                    "phases": [{
                        "phase_name": "Structure",
                        "planned_percent": 40,
                        "actual_percent": 35,
                        "status": "delayed",
                        "delay_days": 2,
                    }],
                    "resource_utilization_percent": 70,
                    "budget_utilized_inr": 300000,
                    "budget_remaining_inr": 700000,
                    "key_observations": [],
                    "recommendations": ["Review schedule"],
                    "projected_completion_date": "2026-12-01",
                })

        client.app.dependency_overrides[main.get_ai_service] = lambda: ProgressService()
        response = client.post("/api/progress-monitoring", json={})

        assert response.status_code == 200
        assert response.json()["overall_progress_percent"] == 35

    def test_material_endpoint_returns_calculated_boq(self, client: TestClient):
        class MaterialService:
            def query_text(self, schema, **kwargs):
                return schema.model_validate({
                    "project_description": "Sample building",
                    "materials": [{
                        "name": "Cement",
                        "quantity_required": 10,
                        "unit": "bags",
                        "unit_cost_inr": 400,
                        "total_cost_inr": 1,
                        "supplier_recommendation": "Local supplier category",
                        "quality_grade": "Standard",
                    }],
                    "wastage_factor_percent": 5,
                    "procurement_timeline_days": 14,
                    "recommendations": [],
                    "cost_optimization_tips": [],
                    "assumptions": ["Indicative rate; confirm locally"],
                })

        client.app.dependency_overrides[main.get_ai_service] = lambda: MaterialService()
        response = client.post("/api/material-analysis", json={})

        assert response.status_code == 200
        assert response.json()["materials"][0]["total_cost_inr"] == 4000
        assert response.json()["total_material_cost_inr"] == 4000

    def test_report_endpoint_returns_validated_response(self, client: TestClient):
        class ReportService:
            def query_text(self, schema, **kwargs):
                return schema.model_validate({
                    "project_name": "Sample",
                    "report_date": "2026-10-26",
                    "executive_summary": "Review required.",
                    "overall_health": "At Risk",
                    "kpis": {
                        "budget_utilization": "50%",
                        "schedule_adherence": "60%",
                        "quality_score": "70%",
                        "safety_score": "80%",
                    },
                    "milestones": [],
                    "financial_summary": {
                        "total_budget_inr": 100000,
                        "spent_inr": 50000,
                        "remaining_inr": 50000,
                        "projected_overrun_inr": 0,
                    },
                    "risks": [],
                    "action_items": [],
                    "next_steps": [],
                })

        client.app.dependency_overrides[main.get_ai_service] = lambda: ReportService()
        response = client.post("/api/project-report", json={
            "project_name": "Sample",
            "location": "Pune",
            "start_date": "2026-01-01",
            "planned_end_date": "2026-12-31",
            "total_budget_inr": 100000,
            "spent_inr": 50000,
            "current_progress_percent": 50,
            "current_phase": "Structure",
        })

        assert response.status_code == 200
        assert response.json()["overall_health"] == "At Risk"

"""Tests for strict Pydantic response models used by AI endpoints."""
import pytest
from pydantic import ValidationError

from schemas import (
    ChatResponse,
    CostEstimationResponse,
    CostItem,
    MaterialAnalysisResponse,
    MaterialItem,
    SafetyInspectionResponse,
    SiteAnalysisResponse,
    StructuralFinding,
)


class TestResponseSchemas:
    def test_chat_response_requires_complete_provider_payload(self):
        with pytest.raises(ValidationError):
            ChatResponse.model_validate({})

        response = ChatResponse.model_validate({
            "answer": "Use a qualified engineer.",
            "follow_up_suggestions": [],
            "confidence": 0.7,
            "data_points": [],
        })
        assert response.answer == "Use a qualified engineer."

    def test_unknown_response_fields_are_rejected(self):
        with pytest.raises(ValidationError):
            ChatResponse.model_validate({
                "answer": "Answer",
                "follow_up_suggestions": [],
                "confidence": 0.7,
                "data_points": [],
                "made_up": True,
            })

    def test_cost_item_rejects_negative_amounts(self):
        with pytest.raises(ValidationError):
            CostItem(label="Concrete", unit="m3", quantity=1, unit_rate_inr=-1)

    def test_cost_item_amount_is_calculated_from_quantity_and_rate(self):
        item = CostItem.model_validate({
            "label": "Concrete",
            "unit": "m3",
            "quantity": 2,
            "unit_rate_inr": 1500,
            "amount_inr": 1,
        })
        assert item.amount_inr == 3000

    def test_material_total_is_calculated_from_line_items(self):
        item = MaterialItem(
            name="Cement",
            quantity_required=3,
            unit="bags",
            unit_cost_inr=400,
            supplier_recommendation="Local supplier category",
            quality_grade="Standard",
        )
        response = MaterialAnalysisResponse(
            project_description="Sample estimate",
            materials=[item],
            wastage_factor_percent=5,
            procurement_timeline_days=14,
            recommendations=[],
            cost_optimization_tips=[],
            assumptions=["Indicative rate"],
        )
        assert item.total_cost_inr == 1200
        assert response.total_material_cost_inr == 1200

    def test_site_score_range_is_enforced(self):
        with pytest.raises(ValidationError):
            SiteAnalysisResponse.model_validate({
                "summary": "Summary",
                "site_condition": "Active",
                "detected_elements": [],
                "safety_concerns": [],
                "recommended_actions": [],
                "risk_level": "low",
                "estimated_site_area_sqft": None,
                "infrastructure_readiness_score": 101,
                "confidence_score": 50,
                "uncertainty_notes": [],
                "structural_findings": [],
                "risks": [],
            })

    def test_structural_finding_requires_reviewable_details(self):
        finding = StructuralFinding(
            finding="Visible crack-like line",
            location="Column C2",
            risk_level="high",
            recommended_action="Restrict nearby access and request an engineer inspection",
            confidence_score=45,
            uncertainty_notes=["Depth and cause cannot be determined from the image"],
        )
        assert finding.risk_level == "high"
        assert finding.uncertainty_notes

    def test_safety_response_requires_professional_review(self):
        response = SafetyInspectionResponse.model_validate({
            "overall_safety_score": 50,
            "compliance_status": "Review required",
            "violations": [],
            "ppe_compliance": {"helmet": True, "safety_vest": False, "gloves": True, "safety_boots": True},
            "immediate_actions_required": [],
            "recommendations": [],
            "estimated_penalty_inr": 0,
            "next_inspection_date": "Before work resumes",
            "risk_level": "medium",
            "confidence_score": 50,
            "uncertainty_notes": ["Some workers are obscured"],
        })
        assert response.professional_review_required is True
        assert "qualified safety professional" in response.professional_review_warning
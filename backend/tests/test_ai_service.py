"""Unit tests for malformed AI output and provider failure handling."""
from types import SimpleNamespace

import pytest

from ai_service import AIServiceError, GroqAIService, _safe_parse
from schemas import ChatResponse


@pytest.mark.parametrize("content", ["not json", "{}", "```json\n{\"answer\": 1}\n```"])
def test_malformed_or_incomplete_provider_output_is_rejected(content: str):
    with pytest.raises(AIServiceError) as error:
        _safe_parse(content, ChatResponse)

    assert error.value.code == "invalid_ai_response"


def test_provider_exception_is_wrapped_as_ai_service_error():
    service = GroqAIService(api_key="test-key")

    def fail_request(**kwargs):
        raise TimeoutError("provider timed out")

    service.client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=fail_request),
        ),
    )

    with pytest.raises(AIServiceError) as error:
        service.query_text(
            system_prompt="system",
            user_prompt="question",
            schema=ChatResponse,
        )

    assert error.value.code == "ai_provider_error"
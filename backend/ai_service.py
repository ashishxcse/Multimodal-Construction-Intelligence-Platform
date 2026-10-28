"""
Centralized Groq MLLM integration layer.
Handles AI interactions with strict structured output and explicit provider errors.
"""
import json
import base64
import logging
from typing import Optional, Type, TypeVar

from groq import Groq
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

DEFAULT_GROQ_VISION_MODEL = "qwen/qwen3.8-27b"
DEFAULT_GROQ_TEXT_MODEL = "openai/gpt-oss-120b"
GROQ_MODEL = DEFAULT_GROQ_VISION_MODEL  # Maintained for backward compatibility
GROQ_TEXT_MODEL = DEFAULT_GROQ_TEXT_MODEL  # Maintained for backward compatibility


class AIServiceError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def _encode_image(image_bytes: bytes) -> str:
    """Encode image bytes to base64 string."""
    return base64.b64encode(image_bytes).decode("utf-8")


def _safe_parse(response_text: str, schema: Type[T]) -> T:
    """Parse and validate a complete JSON response from the provider."""
    try:
        # Try to extract JSON from markdown code blocks
        text = response_text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        data = json.loads(text)
        return schema.model_validate(data)
    except (json.JSONDecodeError, ValidationError, IndexError, KeyError, TypeError) as error:
        logger.warning("AI response validation failed (%s)", type(error).__name__)
        raise AIServiceError("invalid_ai_response") from error


def build_json_prompt(schema: Type[T], extra_instruction: str = "") -> str:
    """Generate a prompt that instructs the AI to respond with valid JSON."""
    schema_json = json.dumps(schema.model_json_schema(), indent=2)
    return f"""You MUST respond with ONLY valid JSON conforming to this schema. No markdown, no explanation outside the JSON block.
{extra_instruction}

JSON Schema:
{schema_json}

Respond with a single valid JSON object only. Do not include any text before or after the JSON."""


class GroqAIService:
    """Centralized AI service using Groq SDK."""

    def __init__(
        self,
        api_key: str,
        vision_model: str = DEFAULT_GROQ_VISION_MODEL,
        text_model: str = DEFAULT_GROQ_TEXT_MODEL,
        base_url: Optional[str] = None,
    ):
        self.vision_model = vision_model
        self.text_model = text_model
        client_kwargs = {
            "api_key": api_key,
            "timeout": 45.0,
            "max_retries": 0,
        }
        if base_url:
            client_kwargs["base_url"] = base_url
        self.client = Groq(**client_kwargs)

    def _log_provider_error(self, operation: str, error: Exception) -> None:
        """Log provider HTTP status and error details without leaking API keys or request data."""
        status_code = getattr(error, "status_code", None)
        message = getattr(error, "message", None) or str(error)
        if status_code is not None:
            logger.error("Groq %s failed (HTTP %s): %s", operation, status_code, message)
        else:
            logger.error("Groq %s failed (%s): %s", operation, type(error).__name__, message)

    def analyze_image_with_text(
        self,
        image_bytes: bytes,
        image_type: str,
        system_prompt: str,
        user_prompt: str,
        schema: Type[T],
    ) -> T:
        """Send an image + text query to the multimodal model and parse structured output."""
        try:
            b64_image = _encode_image(image_bytes)
            json_instruction = build_json_prompt(schema)

            completion = self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {"role": "system", "content": system_prompt + "\n\n" + json_instruction},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{image_type};base64,{b64_image}"
                                },
                            },
                            {"type": "text", "text": user_prompt},
                        ],
                    },
                ],
                temperature=0.3,
                max_tokens=4096,
            )
            content = completion.choices[0].message.content or ""
            return _safe_parse(content, schema)
        except AIServiceError:
            raise
        except Exception as error:
            self._log_provider_error("image analysis", error)
            raise AIServiceError("ai_provider_error") from error

    def query_text(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: Type[T],
    ) -> T:
        """Send a text-only query to the LLM and parse structured output."""
        try:
            json_instruction = build_json_prompt(schema)

            completion = self.client.chat.completions.create(
                model=self.text_model,
                messages=[
                    {"role": "system", "content": system_prompt + "\n\n" + json_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.4,
                max_tokens=4096,
            )
            content = completion.choices[0].message.content or ""
            return _safe_parse(content, schema)
        except AIServiceError:
            raise
        except Exception as error:
            self._log_provider_error("text query", error)
            raise AIServiceError("ai_provider_error") from error

    def chat_query(self, system_prompt: str, user_message: str, schema: Type[T]) -> T:
        """General-purpose chat query with structured output."""
        return self.query_text(system_prompt, user_message, schema)

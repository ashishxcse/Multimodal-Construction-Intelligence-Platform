"""
Pytest configuration and shared fixtures for the ConstructAI backend.
"""
import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Use a deterministic offline service state for API contract tests."""
    with TestClient(main.app, raise_server_exceptions=True) as c:
        monkeypatch.setattr(main, "ai_service", None)
        yield c
        main.app.dependency_overrides.clear()

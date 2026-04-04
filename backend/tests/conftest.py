"""Shared pytest configuration for backend tests."""

import pytest


@pytest.fixture(autouse=True)
def _silence_scheduling_agent_log(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid writing debug NDJSON during tests; keep scheduling tests hermetic."""
    noop = lambda *a, **k: None
    monkeypatch.setattr("services.scheduling.agent_log", noop)
    # main.py imports agent_log inside route handlers from this module
    monkeypatch.setattr("services.debug_agent.agent_log", noop)

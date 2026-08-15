"""Tests for the append-only NDJSON debug logger."""

import json
from pathlib import Path

import pytest

from services import debug_agent

# Bound at import time so the conftest autouse no-op patch does not hide the real writer.
agent_log = debug_agent.agent_log


@pytest.fixture
def log_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "nested" / "debug.log"
    monkeypatch.setattr(debug_agent, "LOG_PATH", str(path))
    return path


def test_agent_log_appends_ndjson_and_creates_parent_dir(log_path: Path) -> None:
    agent_log("scheduling.book", "slot taken", {"slug": "intro"}, "h1")
    agent_log("scheduling.slots", "generated", {"count": 3}, "h2")

    lines = log_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2

    first = json.loads(lines[0])
    assert first["sessionId"] == debug_agent.SESSION_ID
    assert first["location"] == "scheduling.book"
    assert first["message"] == "slot taken"
    assert first["data"] == {"slug": "intro"}
    assert first["hypothesisId"] == "h1"
    assert isinstance(first["timestamp"], int)

    assert json.loads(lines[1])["location"] == "scheduling.slots"


def test_agent_log_serializes_non_json_values(log_path: Path) -> None:
    agent_log("x", "y", {"path": Path("/tmp/a"), "obj": object()}, "h")

    entry = json.loads(log_path.read_text(encoding="utf-8"))
    assert entry["data"]["path"] == "/tmp/a"
    assert isinstance(entry["data"]["obj"], str)


def test_agent_log_swallows_filesystem_errors(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    blocker = tmp_path / "not-a-dir"
    blocker.write_text("regular file", encoding="utf-8")
    monkeypatch.setattr(debug_agent, "LOG_PATH", str(blocker / "debug.log"))

    agent_log("x", "y", {}, "h")  # must not raise

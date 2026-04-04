"""FastAPI route tests for scheduling (service layer mocked)."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from services.scheduling import SchedulingService

client = TestClient(app)


def test_health() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_list_public_meeting_types() -> None:
    rows = [
        {
            "slug": "intro",
            "name": "Intro call",
            "duration_min": 30,
            "description": "Quick chat",
            "location_type": "zoom",
        }
    ]
    with patch.object(SchedulingService, "list_active_meeting_types", return_value=rows):
        resp = client.get("/scheduling/meeting-types")
    assert resp.status_code == 200
    assert resp.json() == {"meeting_types": rows}


def test_get_slots_returns_meeting_and_slots() -> None:
    meeting = {
        "name": "Intro call",
        "duration_min": 30,
        "description": None,
        "location_type": "zoom",
    }
    slots = [
        {"start": "2026-06-01T15:00:00+00:00", "end": "2026-06-01T15:30:00+00:00"},
    ]

    async def fake_slots(slug: str, start_date: str, days: int = 14):
        assert slug == "intro"
        return slots

    with (
        patch.object(
            SchedulingService,
            "get_meeting_type",
            staticmethod(lambda s: meeting),
        ),
        patch.object(
            SchedulingService,
            "get_available_slots",
            staticmethod(fake_slots),
        ),
    ):
        resp = client.get("/scheduling/slots/intro?start_date=2026-06-01&days=7")

    assert resp.status_code == 200
    body = resp.json()
    assert body["slug"] == "intro"
    assert body["meeting"]["name"] == "Intro call"
    assert body["slots"] == slots


def test_get_slots_not_found() -> None:
    with patch.object(
        SchedulingService,
        "get_meeting_type",
        staticmethod(lambda slug: None),
    ):
        resp = client.get("/scheduling/slots/missing?start_date=2026-06-01")
    assert resp.status_code == 404


def test_book_slot_success() -> None:
    async def fake_book(**kwargs):
        return {
            "event_id": "evt_1",
            "html_link": "https://calendar.example/e/1",
            "start": "2026-06-01T15:00:00+00:00",
            "end": "2026-06-01T15:30:00+00:00",
            "summary": "Intro call with Pat",
        }

    payload = {
        "slot_start": "2026-06-01T15:00:00+00:00",
        "guest_name": "Pat",
        "guest_email": "pat@example.com",
    }
    with patch.object(SchedulingService, "book", staticmethod(fake_book)):
        resp = client.post("/scheduling/book/intro", json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "booked"
    assert data["event"]["event_id"] == "evt_1"


def test_book_slot_conflict_returns_409() -> None:
    async def raise_conflict(**kwargs):
        raise ValueError("Selected slot is no longer available.")

    payload = {
        "slot_start": "2026-06-01T15:00:00+00:00",
        "guest_name": "Pat",
        "guest_email": "pat@example.com",
    }
    with patch.object(SchedulingService, "book", staticmethod(raise_conflict)):
        resp = client.post("/scheduling/book/intro", json=payload)

    assert resp.status_code == 409
    assert "error" in resp.json()

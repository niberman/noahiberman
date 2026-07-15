"""Google Calendar HTTP integration tests using mocked httpx (respx)."""

import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch
from zoneinfo import ZoneInfo

import httpx
import pytest
import respx

from services.scheduling import (
    SchedulingService,
    _fetch_busy_ranges,
    _get_access_token,
    create_calendar_event,
)


@pytest.mark.asyncio
async def test_fetch_busy_ranges_parses_google_response() -> None:
    tmin = datetime(2026, 4, 1, 0, 0, tzinfo=ZoneInfo("UTC"))
    tmax = datetime(2026, 4, 2, 0, 0, tzinfo=ZoneInfo("UTC"))
    payload = {
        "calendars": {
            "primary": {
                "busy": [
                    {
                        "start": "2026-04-01T14:00:00+00:00",
                        "end": "2026-04-01T15:00:00+00:00",
                    }
                ]
            }
        }
    }
    with respx.mock:
        route = respx.post("https://www.googleapis.com/calendar/v3/freeBusy").mock(
            return_value=httpx.Response(200, json=payload)
        )
        busy = await _fetch_busy_ranges("fake-access-token", tmin, tmax)

    assert len(busy) == 1
    assert busy[0][0].hour == 14
    assert route.called


@pytest.mark.asyncio
async def test_create_calendar_event_posts_expected_body() -> None:
    start = datetime(2026, 6, 15, 16, 0, tzinfo=ZoneInfo("UTC"))
    end = start + timedelta(minutes=30)

    with respx.mock:
        events_route = respx.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        ).mock(
            return_value=httpx.Response(
                200,
                json={"id": "evt_123", "htmlLink": "https://calendar.google.com/e/1"},
            )
        )

        with patch(
            "services.scheduling._get_access_token",
            AsyncMock(return_value="test-access-token"),
        ):
            result = await create_calendar_event(
                summary="Intro call",
                start=start,
                end=end,
                description="Details",
                location="Zoom",
                attendee_email="guest@example.com",
            )

    assert result["id"] == "evt_123"
    assert events_route.called
    sent = events_route.calls[0].request
    assert sent.headers["authorization"] == "Bearer test-access-token"
    parsed = json.loads(sent.content.decode())
    assert parsed["summary"] == "Intro call"
    assert parsed["attendees"] == [{"email": "guest@example.com"}]
    assert parsed["start"]["timeZone"] == "UTC"


class _FakeSupabase:
    """Stub for the scheduling_auth refresh-token lookup."""

    def __init__(self, rows):
        self._rows = rows

    def table(self, _name):
        return self

    def select(self, *_a, **_k):
        return self

    def limit(self, _n):
        return self

    def execute(self):
        return type("R", (), {"data": self._rows})()


@pytest.mark.asyncio
async def test_get_access_token_dead_refresh_token_raises_runtime_error(monkeypatch) -> None:
    """invalid_grant from Google (revoked/expired token) becomes RuntimeError, not a 500."""
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "cid")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "secret")

    with respx.mock:
        respx.post("https://oauth2.googleapis.com/token").mock(
            return_value=httpx.Response(400, json={"error": "invalid_grant"})
        )
        with patch(
            "services.scheduling._supabase",
            lambda: _FakeSupabase([{"refresh_token": "dead-token"}]),
        ):
            with pytest.raises(RuntimeError, match="invalid_grant"):
                await _get_access_token()


@pytest.mark.asyncio
async def test_get_available_slots_degrades_when_token_refresh_fails() -> None:
    """Slots endpoint must keep working (raw profile slots) when the token is dead."""
    start_date = (datetime.now(ZoneInfo("UTC")) + timedelta(days=60)).strftime("%Y-%m-%d")

    with (
        patch.object(
            SchedulingService,
            "get_meeting_type",
            staticmethod(lambda slug: _fake_meeting()),
        ),
        patch(
            "services.scheduling._get_access_token",
            AsyncMock(side_effect=RuntimeError("Google token refresh failed (400: invalid_grant).")),
        ),
    ):
        slots = await SchedulingService.get_available_slots("any-slug", start_date, days=3)

    assert len(slots) >= 1


def _fake_meeting() -> dict:
    return {
        "name": "Strategy call",
        "duration_min": 30,
        "buffer_min": 15,
        "location_type": "zoom",
        "location_details": None,
        "availability_profiles": {
            "timezone": "America/Denver",
            "rules": {d: ["09:00-17:00"] for d in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")},
        },
    }


@pytest.mark.asyncio
async def test_get_available_slots_with_google_empty_busy_returns_slots() -> None:
    start_date = (datetime.now(ZoneInfo("UTC")) + timedelta(days=60)).strftime("%Y-%m-%d")
    freebusy_payload = {"calendars": {"primary": {"busy": []}}}

    with respx.mock:
        respx.post("https://www.googleapis.com/calendar/v3/freeBusy").mock(
            return_value=httpx.Response(200, json=freebusy_payload)
        )
        with (
            patch.object(
                SchedulingService,
                "get_meeting_type",
                staticmethod(lambda slug: _fake_meeting()),
            ),
            patch(
                "services.scheduling._get_access_token",
                AsyncMock(return_value="token"),
            ),
        ):
            slots = await SchedulingService.get_available_slots("any-slug", start_date, days=3)

    assert isinstance(slots, list)
    assert len(slots) >= 1
    assert "start" in slots[0] and "end" in slots[0]


@pytest.mark.asyncio
async def test_get_available_slots_with_full_range_busy_returns_empty() -> None:
    start_date = (datetime.now(ZoneInfo("UTC")) + timedelta(days=60)).strftime("%Y-%m-%d")
    freebusy_payload = {
        "calendars": {
            "primary": {
                "busy": [
                    {
                        "start": "2000-01-01T00:00:00+00:00",
                        "end": "2100-01-01T00:00:00+00:00",
                    }
                ]
            }
        }
    }

    with respx.mock:
        respx.post("https://www.googleapis.com/calendar/v3/freeBusy").mock(
            return_value=httpx.Response(200, json=freebusy_payload)
        )
        with (
            patch.object(
                SchedulingService,
                "get_meeting_type",
                staticmethod(lambda slug: _fake_meeting()),
            ),
            patch(
                "services.scheduling._get_access_token",
                AsyncMock(return_value="token"),
            ),
        ):
            slots = await SchedulingService.get_available_slots("any-slug", start_date, days=2)

    assert slots == []


@pytest.mark.asyncio
async def test_book_creates_event_when_freebusy_empty() -> None:
    slot_start = (datetime.now(ZoneInfo("UTC")) + timedelta(days=60)).replace(
        hour=15, minute=0, second=0, microsecond=0
    )
    iso_start = slot_start.isoformat()

    with respx.mock:
        respx.post("https://www.googleapis.com/calendar/v3/freeBusy").mock(
            return_value=httpx.Response(200, json={"calendars": {"primary": {"busy": []}}})
        )
        respx.post("https://www.googleapis.com/calendar/v3/calendars/primary/events").mock(
            return_value=httpx.Response(
                200,
                json={"id": "new_evt", "htmlLink": "https://calendar.example/event"},
            )
        )
        with (
            patch.object(
                SchedulingService,
                "get_meeting_type",
                staticmethod(lambda slug: _fake_meeting()),
            ),
            patch(
                "services.scheduling._get_access_token",
                AsyncMock(return_value="token"),
            ),
        ):
            result = await SchedulingService.book(
                slug="x",
                slot_start=iso_start,
                guest_name="Alex",
                guest_email="alex@example.com",
            )

    assert result["event_id"] == "new_evt"
    assert "Alex" in result["summary"]


@pytest.mark.asyncio
async def test_book_google_meet_requests_conference_and_returns_link() -> None:
    slot_start = (datetime.now(ZoneInfo("UTC")) + timedelta(days=60)).replace(
        hour=15, minute=0, second=0, microsecond=0
    )
    meeting = _fake_meeting()
    meeting["location_type"] = "google_meet"

    with respx.mock:
        respx.post("https://www.googleapis.com/calendar/v3/freeBusy").mock(
            return_value=httpx.Response(200, json={"calendars": {"primary": {"busy": []}}})
        )
        events_route = respx.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        ).mock(
            return_value=httpx.Response(
                200,
                json={
                    "id": "meet_evt",
                    "htmlLink": "https://calendar.example/event",
                    "hangoutLink": "https://meet.google.com/abc-defg-hij",
                },
            )
        )
        with (
            patch.object(
                SchedulingService,
                "get_meeting_type",
                staticmethod(lambda slug: meeting),
            ),
            patch(
                "services.scheduling._get_access_token",
                AsyncMock(return_value="token"),
            ),
        ):
            result = await SchedulingService.book(
                slug="x",
                slot_start=slot_start.isoformat(),
                guest_name="Alex",
                guest_email="alex@example.com",
            )

    assert result["meet_link"] == "https://meet.google.com/abc-defg-hij"
    sent = events_route.calls[0].request
    assert "conferenceDataVersion=1" in str(sent.url)
    body = json.loads(sent.content.decode())
    assert body["conferenceData"]["createRequest"]["conferenceSolutionKey"] == {
        "type": "hangoutsMeet"
    }
    assert body["conferenceData"]["createRequest"]["requestId"]
    assert "location" not in body


@pytest.mark.asyncio
async def test_book_raises_when_slot_busy() -> None:
    slot_start = (datetime.now(ZoneInfo("UTC")) + timedelta(days=60)).replace(
        hour=15, minute=0, second=0, microsecond=0
    )
    busy = {
        "calendars": {
            "primary": {
                "busy": [
                    {
                        "start": (slot_start - timedelta(hours=1)).isoformat(),
                        "end": (slot_start + timedelta(hours=1)).isoformat(),
                    }
                ]
            }
        }
    }

    with respx.mock:
        respx.post("https://www.googleapis.com/calendar/v3/freeBusy").mock(
            return_value=httpx.Response(200, json=busy)
        )
        with (
            patch.object(
                SchedulingService,
                "get_meeting_type",
                staticmethod(lambda slug: _fake_meeting()),
            ),
            patch(
                "services.scheduling._get_access_token",
                AsyncMock(return_value="token"),
            ),
        ):
            with pytest.raises(ValueError, match="no longer available"):
                await SchedulingService.book(
                    slug="x",
                    slot_start=slot_start.isoformat(),
                    guest_name="Alex",
                    guest_email="alex@example.com",
                )

@pytest.mark.asyncio
async def test_book_honors_buffer_window() -> None:
    """An event inside the buffer (but outside the raw slot) blocks booking."""
    slot_start = (datetime.now(ZoneInfo("UTC")) + timedelta(days=60)).replace(
        hour=15, minute=0, second=0, microsecond=0
    )
    adjacent_busy = {
        "calendars": {
            "primary": {
                "busy": [
                    {
                        "start": (slot_start - timedelta(minutes=40)).isoformat(),
                        "end": (slot_start - timedelta(minutes=10)).isoformat(),
                    }
                ]
            }
        }
    }

    with respx.mock:
        route = respx.post("https://www.googleapis.com/calendar/v3/freeBusy").mock(
            return_value=httpx.Response(200, json=adjacent_busy)
        )
        with (
            patch.object(
                SchedulingService,
                "get_meeting_type",
                staticmethod(lambda slug: _fake_meeting()),
            ),
            patch(
                "services.scheduling._get_access_token",
                AsyncMock(return_value="token"),
            ),
        ):
            with pytest.raises(ValueError, match="no longer available"):
                await SchedulingService.book(
                    slug="x",
                    slot_start=slot_start.isoformat(),
                    guest_name="Alex",
                    guest_email="alex@example.com",
                )

    # The freeBusy window must be padded by buffer_min (15) on both sides.
    body = json.loads(route.calls.last.request.content)
    assert body["timeMin"] == (slot_start - timedelta(minutes=15)).isoformat()
    assert body["timeMax"] == (slot_start + timedelta(minutes=30 + 15)).isoformat()

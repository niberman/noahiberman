"""
Opt-in live tests against Google OAuth + Calendar APIs (no Supabase).

Set all of the following to run:
  RUN_GOOGLE_CALENDAR_LIVE_TESTS=1
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_TEST_REFRESH_TOKEN   # OAuth refresh token with calendar scopes

These tests do not create calendar events; they only refresh an access token
and query freeBusy for a short window.
"""

import os

import httpx
import pytest

pytestmark = pytest.mark.integration


def _live_env_ready() -> bool:
    return bool(
        os.environ.get("RUN_GOOGLE_CALENDAR_LIVE_TESTS")
        and os.environ.get("GOOGLE_CLIENT_ID")
        and os.environ.get("GOOGLE_CLIENT_SECRET")
        and os.environ.get("GOOGLE_TEST_REFRESH_TOKEN")
    )


@pytest.mark.skipif(not _live_env_ready(), reason="Live Google Calendar env not configured")
@pytest.mark.asyncio
async def test_live_refresh_token_yields_access_token() -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": os.environ["GOOGLE_CLIENT_ID"],
                "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                "refresh_token": os.environ["GOOGLE_TEST_REFRESH_TOKEN"],
                "grant_type": "refresh_token",
            },
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data.get("token_type") == "Bearer"


@pytest.mark.skipif(not _live_env_ready(), reason="Live Google Calendar env not configured")
@pytest.mark.asyncio
async def test_live_freebusy_primary_calendar() -> None:
    async with httpx.AsyncClient() as client:
        tok_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": os.environ["GOOGLE_CLIENT_ID"],
                "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                "refresh_token": os.environ["GOOGLE_TEST_REFRESH_TOKEN"],
                "grant_type": "refresh_token",
            },
        )
        tok_resp.raise_for_status()
        access = tok_resp.json()["access_token"]

        fb_resp = await client.post(
            "https://www.googleapis.com/calendar/v3/freeBusy",
            headers={"Authorization": f"Bearer {access}"},
            json={
                "timeMin": "2026-04-01T00:00:00Z",
                "timeMax": "2026-04-01T01:00:00Z",
                "items": [{"id": "primary"}],
            },
        )
    assert fb_resp.status_code == 200, fb_resp.text
    body = fb_resp.json()
    assert "calendars" in body
    assert "primary" in body["calendars"]

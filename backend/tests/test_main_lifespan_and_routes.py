"""Lifespan/scheduler wiring and the remaining thin scheduling routes."""

import asyncio
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

import main
from main import lifespan
from services.scheduling import SchedulingService

client = TestClient(main.app)

# The Google Calendar connection routes are owner-only; the token itself is
# validated by _is_valid_supabase_user_token, which these tests patch.
OWNER_HEADERS = {"Authorization": "Bearer owner-token"}


class FakeScheduler:
    instances: list["FakeScheduler"] = []

    def __init__(self, timezone: str | None = None) -> None:
        self.timezone = timezone
        self.jobs: list[dict[str, Any]] = []
        self.started = False
        self.shutdown_wait: bool | None = None
        FakeScheduler.instances.append(self)

    def add_job(self, func: Any, **kwargs: Any) -> None:
        self.jobs.append({"func": func, **kwargs})

    def start(self) -> None:
        self.started = True

    def shutdown(self, wait: bool = True) -> None:
        self.shutdown_wait = wait


@pytest.fixture(autouse=True)
def _reset_scheduler_instances(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeScheduler.instances = []
    monkeypatch.delenv("VERCEL", raising=False)


def test_lifespan_starts_and_stops_daily_sync_job(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "BackgroundScheduler", FakeScheduler)

    async def run() -> None:
        async with lifespan(None):
            scheduler = FakeScheduler.instances[0]
            assert scheduler.started
            assert scheduler.timezone == "UTC"
            assert scheduler.jobs[0]["func"] is main.sync_monthly_logbook_from_email
            assert scheduler.jobs[0]["id"] == "monthly_logbook_sync"
            assert scheduler.jobs[0]["hours"] == 24
            assert scheduler.jobs[0]["max_instances"] == 1

    asyncio.run(run())

    assert FakeScheduler.instances[0].shutdown_wait is False


def test_lifespan_survives_scheduler_setup_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        main, "BackgroundScheduler", lambda **_: (_ for _ in ()).throw(RuntimeError("no threads"))
    )
    entered = []

    async def run() -> None:
        async with lifespan(None):
            entered.append(True)

    asyncio.run(run())

    assert entered == [True]


def test_scheduling_auth_url_route() -> None:
    with (
        patch("main._is_valid_supabase_user_token", return_value=True),
        patch("main.get_auth_url", return_value="https://accounts.google.com/o/oauth2/v2/auth?x=1"),
    ):
        resp = client.get("/scheduling/auth/url", headers=OWNER_HEADERS)

    assert resp.status_code == 200
    assert resp.json() == {"url": "https://accounts.google.com/o/oauth2/v2/auth?x=1"}


def test_scheduling_auth_exchange_route() -> None:
    exchange = AsyncMock(return_value={"refresh_token": "rt"})
    with (
        patch("main._is_valid_supabase_user_token", return_value=True),
        patch("main.exchange_code", exchange),
    ):
        resp = client.post(
            "/scheduling/auth/exchange", json={"code": "abc"}, headers=OWNER_HEADERS
        )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "message": "Google Calendar connected."}
    exchange.assert_awaited_once_with("abc")


def test_oauth_callback_redirects_on_success() -> None:
    with (
        patch("main.verify_oauth_state", return_value=True),
        patch("main.exchange_code", AsyncMock(return_value={})),
    ):
        resp = client.get("/scheduling/auth/callback", params={"code": "abc"}, follow_redirects=False)

    assert resp.status_code == 307
    assert resp.headers["location"] == "/dashboard?calendar_connected=true"


def test_oauth_callback_redirects_with_error_flag_on_failure() -> None:
    with (
        patch("main.verify_oauth_state", return_value=True),
        patch("main.exchange_code", AsyncMock(side_effect=RuntimeError("bad code"))),
    ):
        resp = client.get("/scheduling/auth/callback", params={"code": "abc"}, follow_redirects=False)

    assert resp.status_code == 307
    assert resp.headers["location"] == "/dashboard?calendar_error=true"


def test_oauth_callback_requires_code() -> None:
    assert client.get("/scheduling/auth/callback").status_code == 422


@pytest.mark.parametrize("slug", ["intro", None])
def test_primary_meeting_route(slug: str | None) -> None:
    with patch.object(SchedulingService, "get_primary_meeting_slug", staticmethod(lambda: slug)):
        resp = client.get("/scheduling/primary-meeting")

    assert resp.status_code == 200
    assert resp.json() == {"slug": slug}

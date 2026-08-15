"""Tests for the scheduling env/OAuth helpers and Supabase-backed lookups."""

from typing import Any
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
import respx

from services import scheduling
from services.scheduling import SchedulingService, _env, exchange_code, get_auth_url


class FakeQuery:
    """Records the Supabase query chain and returns canned rows."""

    def __init__(self, store: "FakeSupabase") -> None:
        self.store = store

    def select(self, *args: Any, **_: Any) -> "FakeQuery":
        self.store.calls.append(("select", args))
        return self

    def eq(self, column: str, value: Any) -> "FakeQuery":
        self.store.calls.append(("eq", (column, value)))
        return self

    def order(self, column: str) -> "FakeQuery":
        self.store.calls.append(("order", (column,)))
        return self

    def limit(self, count: int) -> "FakeQuery":
        self.store.calls.append(("limit", (count,)))
        return self

    def single(self) -> "FakeQuery":
        self.store.calls.append(("single", ()))
        return self

    def insert(self, payload: Any) -> "FakeQuery":
        self.store.calls.append(("insert", (payload,)))
        return self

    def update(self, payload: Any) -> "FakeQuery":
        self.store.calls.append(("update", (payload,)))
        return self

    def execute(self) -> Any:
        self.store.calls.append(("execute", ()))
        return type("Result", (), {"data": self.store.next_data()})()


class FakeSupabase:
    def __init__(self, *results: Any) -> None:
        self._results = list(results)
        self.calls: list[tuple[str, tuple[Any, ...]]] = []
        self.tables: list[str] = []

    def table(self, name: str) -> FakeQuery:
        self.tables.append(name)
        return FakeQuery(self)

    def next_data(self) -> Any:
        return self._results.pop(0) if self._results else None


@pytest.fixture
def fake_sb(monkeypatch: pytest.MonkeyPatch):
    def install(*results: Any) -> FakeSupabase:
        sb = FakeSupabase(*results)
        monkeypatch.setattr(scheduling, "_supabase", lambda: sb)
        return sb

    return install


@pytest.fixture(autouse=True)
def _google_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "client-secret")
    monkeypatch.delenv("GOOGLE_REDIRECT_URI", raising=False)


def test_env_returns_value_and_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SOME_KEY", "value")
    assert _env("SOME_KEY") == "value"
    assert _env("MISSING_KEY", "fallback") == "fallback"


def test_env_raises_at_call_time_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MISSING_KEY", raising=False)
    with pytest.raises(RuntimeError, match="Missing required environment variable: MISSING_KEY"):
        _env("MISSING_KEY")


def test_supabase_client_built_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    seen: dict[str, str] = {}

    def fake_create_client(url: str, key: str) -> str:
        seen["url"], seen["key"] = url, key
        return "client"

    monkeypatch.setattr(scheduling, "create_client", fake_create_client)

    assert scheduling._supabase() == "client"
    assert seen == {"url": "https://project.supabase.co", "key": "service-key"}


def test_get_auth_url_contains_offline_consent_and_scopes() -> None:
    url = get_auth_url()

    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == (
        "https://accounts.google.com/o/oauth2/v2/auth"
    )
    assert query["client_id"] == ["client-id"]
    assert query["response_type"] == ["code"]
    assert query["access_type"] == ["offline"]
    assert query["prompt"] == ["consent"]
    assert query["redirect_uri"] == ["http://localhost:8000/scheduling/auth/callback"]
    assert query["scope"] == [" ".join(scheduling.GOOGLE_SCOPES)]


def test_get_auth_url_uses_configured_redirect_uri(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "https://noahiberman.com/scheduling/auth/callback")

    query = parse_qs(urlparse(get_auth_url()).query)

    assert query["redirect_uri"] == ["https://noahiberman.com/scheduling/auth/callback"]


@pytest.mark.asyncio
async def test_exchange_code_inserts_first_refresh_token(fake_sb) -> None:
    sb = fake_sb([], None)  # no existing row, then the insert result

    with respx.mock:
        route = respx.post("https://oauth2.googleapis.com/token").mock(
            return_value=httpx.Response(200, json={"refresh_token": "rt-1", "access_token": "at-1"})
        )
        tokens = await exchange_code("auth-code")

    assert tokens["refresh_token"] == "rt-1"
    sent = parse_qs(route.calls[0].request.content.decode())
    assert sent["code"] == ["auth-code"]
    assert sent["grant_type"] == ["authorization_code"]
    assert sent["client_secret"] == ["client-secret"]
    assert ("insert", ({"refresh_token": "rt-1"},)) in sb.calls
    assert sb.tables == ["scheduling_auth", "scheduling_auth"]


@pytest.mark.asyncio
async def test_exchange_code_updates_existing_refresh_token(fake_sb) -> None:
    sb = fake_sb([{"id": 7}], None)

    with respx.mock:
        respx.post("https://oauth2.googleapis.com/token").mock(
            return_value=httpx.Response(200, json={"refresh_token": "rt-2"})
        )
        await exchange_code("auth-code")

    assert ("update", ({"refresh_token": "rt-2"},)) in sb.calls
    assert ("eq", ("id", 7)) in sb.calls


@pytest.mark.asyncio
async def test_exchange_code_without_refresh_token_does_not_touch_supabase(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        scheduling, "_supabase", lambda: pytest.fail("Supabase must not be touched")
    )

    with respx.mock:
        respx.post("https://oauth2.googleapis.com/token").mock(
            return_value=httpx.Response(200, json={"access_token": "at-only"})
        )
        tokens = await exchange_code("auth-code")

    assert tokens == {"access_token": "at-only"}


@pytest.mark.asyncio
async def test_exchange_code_raises_on_google_error() -> None:
    with respx.mock:
        respx.post("https://oauth2.googleapis.com/token").mock(
            return_value=httpx.Response(400, json={"error": "invalid_grant"})
        )
        with pytest.raises(httpx.HTTPStatusError):
            await exchange_code("bad-code")


@pytest.mark.asyncio
async def test_get_access_token_requires_stored_token(fake_sb) -> None:
    fake_sb([])

    with pytest.raises(RuntimeError, match="No Google refresh token stored"):
        await scheduling._get_access_token()


@pytest.mark.asyncio
async def test_get_access_token_returns_fresh_access_token(fake_sb) -> None:
    fake_sb([{"refresh_token": "rt"}])

    with respx.mock:
        route = respx.post("https://oauth2.googleapis.com/token").mock(
            return_value=httpx.Response(200, json={"access_token": "fresh"})
        )
        token = await scheduling._get_access_token()

    assert token == "fresh"
    sent = parse_qs(route.calls[0].request.content.decode())
    assert sent["grant_type"] == ["refresh_token"]
    assert sent["refresh_token"] == ["rt"]


@pytest.mark.asyncio
async def test_get_access_token_error_falls_back_to_response_text(fake_sb) -> None:
    fake_sb([{"refresh_token": "rt"}])

    with respx.mock:
        respx.post("https://oauth2.googleapis.com/token").mock(
            return_value=httpx.Response(503, text="upstream unavailable")
        )
        with pytest.raises(RuntimeError, match="503: upstream unavailable"):
            await scheduling._get_access_token()


@pytest.mark.parametrize(
    ("rows", "expected"),
    [
        ([], False),
        ([{"refresh_token": None}], False),
        ([{"refresh_token": ""}], False),
        ([{"refresh_token": "rt"}], True),
    ],
)
def test_is_google_calendar_connected(fake_sb, rows: list[dict], expected: bool) -> None:
    fake_sb(rows)
    assert SchedulingService.is_google_calendar_connected() is expected


@pytest.mark.asyncio
async def test_verify_connection_false_without_stored_token(fake_sb) -> None:
    fake_sb([])
    assert await SchedulingService.verify_google_calendar_connection() is False


@pytest.mark.asyncio
async def test_verify_connection_true_when_token_refreshes(fake_sb) -> None:
    fake_sb([{"refresh_token": "rt"}])

    with patch("services.scheduling._get_access_token", AsyncMock(return_value="fresh")):
        assert await SchedulingService.verify_google_calendar_connection() is True


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "error",
    [RuntimeError("dead token"), httpx.ConnectError("network down")],
)
async def test_verify_connection_false_when_refresh_fails(fake_sb, error: Exception) -> None:
    fake_sb([{"refresh_token": "rt"}])

    with patch("services.scheduling._get_access_token", AsyncMock(side_effect=error)):
        assert await SchedulingService.verify_google_calendar_connection() is False


def test_get_meeting_type_filters_active_slug(fake_sb) -> None:
    row = {"slug": "intro", "availability_profiles": {"timezone": "America/Denver"}}
    sb = fake_sb(row)

    assert SchedulingService.get_meeting_type("intro") == row
    assert sb.tables == ["meeting_types"]
    assert ("eq", ("slug", "intro")) in sb.calls
    assert ("eq", ("is_active", True)) in sb.calls
    assert ("single", ()) in sb.calls


@pytest.mark.parametrize(
    ("rows", "expected"),
    [([{"slug": "intro"}], "intro"), ([], None), (None, None)],
)
def test_get_primary_meeting_slug(fake_sb, rows: Any, expected: str | None) -> None:
    sb = fake_sb(rows)

    assert SchedulingService.get_primary_meeting_slug() == expected
    assert ("eq", ("is_primary", True)) in sb.calls


def test_list_active_meeting_types_returns_public_fields_ordered(fake_sb) -> None:
    rows = [{"slug": "intro", "name": "Intro"}]
    sb = fake_sb(rows)

    assert SchedulingService.list_active_meeting_types() == rows
    assert ("order", ("name",)) in sb.calls
    assert ("eq", ("is_active", True)) in sb.calls
    selected = next(args[0] for name, args in sb.calls if name == "select")
    assert selected == "slug, name, duration_min, description, location_type"


def test_list_active_meeting_types_handles_empty_result(fake_sb) -> None:
    fake_sb(None)
    assert SchedulingService.list_active_meeting_types() == []

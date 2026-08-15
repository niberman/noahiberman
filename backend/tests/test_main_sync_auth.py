"""Auth tests for the /sync/logbook cron + dashboard endpoint."""

from typing import Any
from urllib import error as urllib_error

import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)

SYNC_RESULT = {"status": "ok", "emails_found": 1}


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in ("CRON_SECRET", "SUPABASE_URL", "SUPABASE_ANON_KEY"):
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def sync_calls(monkeypatch: pytest.MonkeyPatch) -> list[int]:
    calls: list[int] = []

    def fake_sync() -> dict[str, Any]:
        calls.append(1)
        return SYNC_RESULT

    monkeypatch.setattr(main, "sync_monthly_logbook_from_email", fake_sync)
    return calls


class _FakeResponse:
    def __init__(self, status: int) -> None:
        self.status = status

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *_: object) -> None:
        return None


def _patch_auth_endpoint(monkeypatch: pytest.MonkeyPatch, result: Any) -> list[Any]:
    """Stub urlopen for Supabase /auth/v1/user; result is a response or an exception."""
    requests: list[Any] = []

    def fake_urlopen(req: Any, timeout: int | None = None) -> _FakeResponse:
        requests.append(req)
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    return requests


@pytest.mark.parametrize("header", [None, "", "token abc", "Basic abc"])
def test_sync_rejects_missing_or_malformed_authorization(
    sync_calls: list[int], header: str | None
) -> None:
    headers = {"Authorization": header} if header is not None else {}

    resp = client.get("/sync/logbook", headers=headers)

    assert resp.status_code == 401
    assert resp.json() == {"detail": "Unauthorized."}
    assert sync_calls == []


def test_sync_accepts_cron_secret(monkeypatch: pytest.MonkeyPatch, sync_calls: list[int]) -> None:
    monkeypatch.setenv("CRON_SECRET", "cron-token")

    resp = client.get("/sync/logbook", headers={"Authorization": "Bearer cron-token"})

    assert resp.status_code == 200
    assert resp.json() == SYNC_RESULT
    assert sync_calls == [1]


def test_sync_rejects_wrong_cron_secret_without_supabase_fallback(
    monkeypatch: pytest.MonkeyPatch, sync_calls: list[int]
) -> None:
    monkeypatch.setenv("CRON_SECRET", "cron-token")

    resp = client.get("/sync/logbook", headers={"Authorization": "Bearer nope"})

    assert resp.status_code == 401
    assert sync_calls == []


def test_sync_accepts_valid_supabase_user_token(
    monkeypatch: pytest.MonkeyPatch, sync_calls: list[int]
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co/")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key")
    requests = _patch_auth_endpoint(monkeypatch, _FakeResponse(200))

    resp = client.get("/sync/logbook", headers={"Authorization": "Bearer user-jwt"})

    assert resp.status_code == 200
    assert sync_calls == [1]
    assert requests[0].full_url == "https://project.supabase.co/auth/v1/user"
    assert requests[0].get_header("Authorization") == "Bearer user-jwt"
    assert requests[0].get_header("Apikey") == "anon-key"


def test_sync_rejects_non_200_supabase_response(
    monkeypatch: pytest.MonkeyPatch, sync_calls: list[int]
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key")
    _patch_auth_endpoint(monkeypatch, _FakeResponse(204))

    resp = client.get("/sync/logbook", headers={"Authorization": "Bearer user-jwt"})

    assert resp.status_code == 401
    assert sync_calls == []


@pytest.mark.parametrize(
    "error",
    [
        urllib_error.HTTPError(url="https://p.co", code=401, msg="no", hdrs=None, fp=None),
        urllib_error.URLError("dns down"),
    ],
)
def test_token_validation_treats_auth_errors_as_invalid(
    monkeypatch: pytest.MonkeyPatch, error: Exception
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key")
    _patch_auth_endpoint(monkeypatch, error)

    assert main._is_valid_supabase_user_token("user-jwt") is False


@pytest.mark.parametrize("present", ["SUPABASE_URL", "SUPABASE_ANON_KEY"])
def test_token_validation_requires_both_supabase_settings(
    monkeypatch: pytest.MonkeyPatch, present: str
) -> None:
    monkeypatch.setenv(present, "value")
    monkeypatch.setattr(
        "urllib.request.urlopen", lambda *a, **k: pytest.fail("must not call Supabase")
    )

    assert main._is_valid_supabase_user_token("user-jwt") is False


def test_sync_returns_service_payload_verbatim(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRON_SECRET", "cron-token")
    payload = {"status": "skipped", "reason": "gmail_credentials_missing"}
    monkeypatch.setattr(main, "sync_monthly_logbook_from_email", lambda: payload)

    resp = client.get("/sync/logbook", headers={"Authorization": "Bearer cron-token"})

    assert resp.json() == payload

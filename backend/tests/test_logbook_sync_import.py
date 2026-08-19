"""Supabase snapshot-replace tests for import_logbook_data (no network)."""

import io
import json
from typing import Any
from urllib import error as urllib_error

import pytest

from services import logbook_sync

FLIGHTS_CSV = (
    "Flights Table\n"
    "Date,AircraftID,From,To,Route,TotalTime\n"
    "2026-01-01,N123AB,KSFO,KLAX,,1.0\n"
)


@pytest.fixture
def calls(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    recorded: list[dict[str, Any]] = []

    def fake_rest_call(**kwargs: Any) -> None:
        recorded.append(kwargs)

    monkeypatch.setattr(logbook_sync, "_rest_call", fake_rest_call)
    return recorded


@pytest.fixture(autouse=True)
def _supabase_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co/")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")


def test_supabase_headers() -> None:
    assert logbook_sync._supabase_headers("k") == {
        "apikey": "k",
        "Authorization": "Bearer k",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


@pytest.mark.parametrize("missing", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])
def test_import_skips_without_credentials(monkeypatch: pytest.MonkeyPatch, missing: str) -> None:
    monkeypatch.delenv(missing, raising=False)

    result = logbook_sync.import_logbook_data(io.BytesIO(FLIGHTS_CSV.encode()))

    assert result == {"status": "skipped", "reason": "supabase_credentials_missing"}


def test_import_returns_zero_when_no_rows_and_makes_no_calls(calls: list[dict[str, Any]]) -> None:
    empty = io.BytesIO(b"Flights Table\nDate,AircraftID,From,To\n")

    result = logbook_sync.import_logbook_data(empty)

    assert result == {"status": "ok", "flights_imported": 0, "airports_upserted": 0}
    assert calls == []


def test_import_deletes_then_inserts_flights(calls: list[dict[str, Any]]) -> None:
    result = logbook_sync.import_logbook_data(io.BytesIO(FLIGHTS_CSV.encode()))

    assert result == {"status": "ok", "flights_imported": 1, "airports_upserted": 0}
    assert [c["method"] for c in calls] == ["DELETE", "POST"]

    delete, insert = calls
    assert delete["url"] == "https://project.supabase.co/rest/v1/flights"
    assert delete["params"] == {"id": "not.is.null"}
    assert insert["url"] == "https://project.supabase.co/rest/v1/flights"
    assert len(insert["payload"]) == 1
    assert insert["headers"]["Authorization"] == "Bearer service-key"


def test_import_batches_inserts_in_chunks_of_500(calls: list[dict[str, Any]]) -> None:
    rows = "".join(f"2026-01-01,N123AB,KSFO,KLAX,,1.0\n" for _ in range(1001))
    csv_file = io.BytesIO(("Flights Table\nDate,AircraftID,From,To,Route,TotalTime\n" + rows).encode())

    result = logbook_sync.import_logbook_data(csv_file)

    assert result["flights_imported"] == 1001
    inserts = [c for c in calls if c["method"] == "POST"]
    assert [len(c["payload"]) for c in inserts] == [500, 500, 1]


def test_import_upserts_airport_coordinates_with_merge_header(calls: list[dict[str, Any]]) -> None:
    csv_file = io.BytesIO(
        (
            "Flights Table\n"
            "Date,AircraftID,From,To,Route,TotalTime,FromLatitude,FromLongitude,FromName\n"
            "2026-01-01,N123AB,KSFO,KLAX,,1.0,37.6,-122.4,San Francisco Intl\n"
        ).encode()
    )

    result = logbook_sync.import_logbook_data(csv_file)

    assert result["airports_upserted"] == 1
    airport_call = calls[-1]
    assert airport_call["url"].endswith("/rest/v1/airport_coordinates")
    assert airport_call["params"] == {"on_conflict": "code"}
    assert airport_call["headers"]["Prefer"] == "resolution=merge-duplicates,return=minimal"
    # The flights headers must not be mutated by the airport upsert.
    assert calls[0]["headers"]["Prefer"] == "return=minimal"


def test_import_propagates_rest_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(**_: Any) -> None:
        raise RuntimeError("Supabase API error 500: nope")

    monkeypatch.setattr(logbook_sync, "_rest_call", boom)

    with pytest.raises(RuntimeError, match="Supabase API error 500"):
        logbook_sync.import_logbook_data(io.BytesIO(FLIGHTS_CSV.encode()))


class _FakeResponse:
    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *_: object) -> None:
        return None


def test_rest_call_builds_request_with_query_and_json_body(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    def fake_urlopen(req: Any, timeout: int | None = None) -> _FakeResponse:
        seen["url"] = req.full_url
        seen["method"] = req.method
        seen["body"] = req.data
        seen["timeout"] = timeout
        return _FakeResponse()

    monkeypatch.setattr(logbook_sync.urllib_request, "urlopen", fake_urlopen)

    logbook_sync._rest_call(
        method="POST",
        url="https://project.supabase.co/rest/v1/flights",
        headers={"apikey": "k"},
        params={"on_conflict": "code"},
        payload=[{"id": "ff-1"}],
        timeout=7,
    )

    assert seen["url"] == "https://project.supabase.co/rest/v1/flights?on_conflict=code"
    assert seen["method"] == "POST"
    assert json.loads(seen["body"]) == [{"id": "ff-1"}]
    assert seen["timeout"] == 7


def test_rest_call_sends_no_body_without_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    def fake_urlopen(req: Any, timeout: int | None = None) -> _FakeResponse:
        seen["url"] = req.full_url
        seen["body"] = req.data
        return _FakeResponse()

    monkeypatch.setattr(logbook_sync.urllib_request, "urlopen", fake_urlopen)

    logbook_sync._rest_call(method="DELETE", url="https://p.co/rest/v1/flights", headers={})

    assert seen["url"] == "https://p.co/rest/v1/flights"
    assert seen["body"] is None


def test_rest_call_wraps_http_error_with_response_body(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(*_: Any, **__: Any) -> None:
        raise urllib_error.HTTPError(
            url="https://p.co", code=401, msg="Unauthorized", hdrs=None, fp=io.BytesIO(b"bad key")
        )

    monkeypatch.setattr(logbook_sync.urllib_request, "urlopen", fake_urlopen)

    with pytest.raises(RuntimeError, match="Supabase API error 401: bad key"):
        logbook_sync._rest_call(method="GET", url="https://p.co", headers={})


def test_rest_call_wraps_connection_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(*_: Any, **__: Any) -> None:
        raise urllib_error.URLError("dns down")

    monkeypatch.setattr(logbook_sync.urllib_request, "urlopen", fake_urlopen)

    with pytest.raises(RuntimeError, match="Supabase API connection error"):
        logbook_sync._rest_call(method="GET", url="https://p.co", headers={})

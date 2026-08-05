"""Integration tests for the iNoah visibility tiering.

These hit the hosted Supabase project directly, so they are opt-in: set
SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to run them.
Without those the module skips, which keeps CI green (CI has no Supabase
secrets). They also require the visibility tiering migration to be applied.

The embedding fixtures use a synthetic unit vector rather than a real Gemini
embedding: the tests assert reachability through the RPCs, not retrieval
quality, and a vector that matches itself with similarity 1.0 makes the
assertions exact and free.
"""

import os
import uuid

import httpx
import pytest

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not (SUPABASE_URL and ANON_KEY and SERVICE_KEY),
        reason="SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are not all set",
    ),
]

# A unit vector: cosine similarity with itself is exactly 1.0, so a threshold
# of 0.5 must return the row if and only if the RPC can see it.
PROBE_VECTOR = "[" + ",".join(["1"] + ["0"] * 767) + "]"


def _headers(key: str, token: str | None = None) -> dict:
    return {
        "apikey": key,
        "Authorization": f"Bearer {token or key}",
        "Content-Type": "application/json",
    }


def _insert_memory(content: str, visibility: str) -> dict:
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/memories",
        headers={**_headers(SERVICE_KEY), "Prefer": "return=representation"},
        json={
            "content": content,
            "collection": "tiering-test",
            "embedding": PROBE_VECTOR,
            "visibility": visibility,
        },
        timeout=30,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()[0]


def _delete_memory(row_id: str) -> None:
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/memories?id=eq.{row_id}",
        headers=_headers(SERVICE_KEY),
        timeout=30,
    )


@pytest.fixture
def private_row():
    marker = f"zx{uuid.uuid4().hex}"
    row = _insert_memory(f"tiering test secret marker {marker}", "private")
    yield row
    _delete_memory(row["id"])


def _rpc(name: str, key: str, token: str | None = None) -> httpx.Response:
    return httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        headers=_headers(key, token),
        json={
            "query_embedding": PROBE_VECTOR,
            "match_threshold": 0.5,
            "match_count": 10,
        },
        timeout=30,
    )


def test_anonymous_debug_mode_returns_no_debug_key():
    resp = httpx.post(
        f"{SUPABASE_URL}/functions/v1/inoah-chat",
        headers=_headers(ANON_KEY),
        json={"prompt": "what do you know about noah", "debug_mode": True},
        timeout=90,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "debug" not in body


def test_private_row_is_invisible_to_public_rpc(private_row):
    resp = _rpc("match_memories_public", ANON_KEY)
    assert resp.status_code == 200, resp.text
    returned_ids = {r["id"] for r in resp.json()}
    assert private_row["id"] not in returned_ids


def test_private_row_is_visible_to_private_rpc(private_row):
    resp = _rpc("match_memories_private", SERVICE_KEY)
    assert resp.status_code == 200, resp.text
    match = [r for r in resp.json() if r["id"] == private_row["id"]]
    assert match, "private RPC did not return the private row"
    assert match[0]["similarity"] == pytest.approx(1.0)


def test_private_rpc_is_not_executable_anonymously(private_row):
    resp = _rpc("match_memories_private", ANON_KEY)
    assert resp.status_code in (401, 403, 404), resp.text


def test_never_visibility_is_terminal():
    row = _insert_memory("tiering test terminal row", "never")
    try:
        resp = httpx.patch(
            f"{SUPABASE_URL}/rest/v1/memories?id=eq.{row['id']}",
            headers=_headers(SERVICE_KEY),
            json={"visibility": "public"},
            timeout=30,
        )
        assert resp.status_code >= 400
        assert "terminal" in resp.text
    finally:
        _delete_memory(row["id"])


def test_ingest_rejects_bad_secret():
    resp = httpx.post(
        f"{SUPABASE_URL}/functions/v1/inoah-ingest",
        headers=_headers(ANON_KEY),
        json={"action": "ingest", "secret": "wrong", "items": []},
        timeout=30,
    )
    assert resp.status_code == 403


def test_ingest_has_no_bootstrap():
    resp = httpx.post(
        f"{SUPABASE_URL}/functions/v1/inoah-ingest",
        headers=_headers(ANON_KEY),
        json={"action": "bootstrap"},
        timeout=30,
    )
    # Secret check comes first, so even naming the removed action is a 403.
    assert resp.status_code == 403


@pytest.mark.skipif(not os.environ.get("INGEST_SECRET"), reason="INGEST_SECRET not set")
def test_ingest_rejects_visibility_in_body():
    resp = httpx.post(
        f"{SUPABASE_URL}/functions/v1/inoah-ingest",
        headers=_headers(ANON_KEY),
        json={
            "action": "ingest",
            "secret": os.environ["INGEST_SECRET"],
            "source_kind": "repo_file",
            "source_external_id": "does-not-matter",
            "items": [
                {
                    "content": "x",
                    "source_id": "s",
                    "chunk_index": 0,
                    "visibility": "public",
                }
            ],
        },
        timeout=30,
    )
    # Either the unregistered source or the visibility key must reject it;
    # both are 4xx and nothing is written.
    assert 400 <= resp.status_code < 500


def test_authenticated_non_owner_reads_zero_rows(private_row):
    email = f"tiering-test-{uuid.uuid4().hex[:12]}@example.com"
    password = uuid.uuid4().hex
    created = httpx.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=_headers(SERVICE_KEY),
        json={"email": email, "password": password, "email_confirm": True},
        timeout=30,
    )
    assert created.status_code in (200, 201), created.text
    user_id = created.json()["id"]

    try:
        signin = httpx.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=_headers(ANON_KEY),
            json={"email": email, "password": password},
            timeout=30,
        )
        assert signin.status_code == 200, signin.text
        jwt = signin.json()["access_token"]

        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/memories?select=id&limit=5",
            headers=_headers(ANON_KEY, jwt),
            timeout=30,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json() == []
    finally:
        httpx.delete(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_headers(SERVICE_KEY),
            timeout=30,
        )

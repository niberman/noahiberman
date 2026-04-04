"""Tests for the Vercel ASGI entrypoint wrapper."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


_ROOT = Path(__file__).resolve().parents[2]
_API_INDEX = _ROOT / "api" / "index.py"
_SPEC = spec_from_file_location("vercel_api_index", _API_INDEX)
assert _SPEC and _SPEC.loader
_MODULE = module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
StripPrefixMiddleware = _MODULE.StripPrefixMiddleware


async def _noop_app(scope, receive, send):
    await send({"type": "http.response.start", "status": 204, "headers": []})
    await send({"type": "http.response.body", "body": b"", "more_body": False})


def test_strip_prefix_middleware_trims_api_prefix():
    seen = {}

    async def capture_app(scope, receive, send):
        seen["path"] = scope["path"]
        seen["root_path"] = scope.get("root_path")
        seen["raw_path"] = scope.get("raw_path")
        await _noop_app(scope, receive, send)

    app = StripPrefixMiddleware(capture_app, "/api")
    messages = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    import asyncio

    asyncio.run(
        app(
            {
                "type": "http",
                "path": "/api/scheduling/auth/url",
                "root_path": "",
                "raw_path": b"/api/scheduling/auth/url",
            },
            receive,
            send,
        )
    )

    assert seen["path"] == "/scheduling/auth/url"
    assert seen["root_path"] == "/api"
    assert seen["raw_path"] == b"/scheduling/auth/url"
    assert messages[0]["type"] == "http.response.start"

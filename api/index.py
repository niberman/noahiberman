import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app as backend_app  # noqa: E402


class StripPrefixMiddleware:
    """Allow the FastAPI app to run under Vercel's `/api` function prefix."""

    def __init__(self, app, prefix: str):
        self.app = app
        self.prefix = prefix.rstrip("/")

    async def __call__(self, scope, receive, send):
        if scope["type"] in {"http", "websocket"}:
            path = scope.get("path", "")
            if path.startswith(self.prefix):
                trimmed = path[len(self.prefix) :] or "/"
                if not trimmed.startswith("/"):
                    trimmed = f"/{trimmed}"

                updated_scope = dict(scope)
                updated_scope["path"] = trimmed
                updated_scope["root_path"] = f"{scope.get('root_path', '')}{self.prefix}"

                raw_path = scope.get("raw_path")
                if raw_path is not None and raw_path.startswith(self.prefix.encode()):
                    trimmed_raw = raw_path[len(self.prefix) :] or b"/"
                    if not trimmed_raw.startswith(b"/"):
                        trimmed_raw = b"/" + trimmed_raw
                    updated_scope["raw_path"] = trimmed_raw

                return await self.app(updated_scope, receive, send)

        return await self.app(scope, receive, send)


app = StripPrefixMiddleware(backend_app, "/api")

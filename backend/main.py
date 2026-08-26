import hmac
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Load env files before service imports (they read os.environ at import time).
_backend_dir = Path(__file__).resolve().parent
_repo_root = _backend_dir.parent
for _path, _override in (
    (_repo_root / ".env", False),
    (_repo_root / ".env.local", True),
    (_backend_dir / ".env", True),
):
    if _path.is_file():
        load_dotenv(_path, override=_override)

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse
from pydantic import BaseModel

from services.logbook_sync import sync_monthly_logbook_from_email
from services.scheduling import (
    SchedulingService,
    exchange_code,
    get_auth_url,
    verify_oauth_state,
)

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    scheduler: BackgroundScheduler | None = None

    try:
        if os.environ.get("VERCEL") == "1":
            LOGGER.info("Skipping background logbook scheduler in Vercel runtime.")
        else:
            scheduler = BackgroundScheduler(timezone="UTC")
            scheduler.add_job(
                sync_monthly_logbook_from_email,
                trigger="interval",
                hours=24,
                id="monthly_logbook_sync",
                replace_existing=True,
                coalesce=True,
                max_instances=1,
            )
            scheduler.start()
            LOGGER.info("Background logbook sync scheduler started (interval: 24h).")
    except Exception as exc:
        # Keep the API alive even if scheduler setup cannot complete.
        LOGGER.warning("Scheduler setup skipped: %s", exc)
        scheduler = None

    try:
        yield
    finally:
        if scheduler:
            scheduler.shutdown(wait=False)
            LOGGER.info("Background logbook sync scheduler stopped.")


app = FastAPI(lifespan=lifespan)

DEFAULT_ALLOWED_ORIGINS = (
    "https://noahiberman.com",
    "https://www.noahiberman.com",
    "http://localhost:8080",
    "http://localhost:5173",
)


def _allowed_origins() -> list[str]:
    configured = os.environ.get("ALLOWED_ORIGINS", "")
    origins = [o.strip() for o in configured.split(",") if o.strip()]
    return origins or list(DEFAULT_ALLOWED_ORIGINS)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Machine-readable site content (llms.txt spec: https://llmstxt.org)
# ---------------------------------------------------------------------------

_LLMS_TXT_PATH = _repo_root / "public" / "llms.txt"


def _fetch_published_posts() -> list[dict]:
    """Published blog posts, read with the anon key so RLS decides what is public."""
    supabase_url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not anon_key:
        return []
    resp = httpx.get(
        f"{supabase_url.rstrip('/')}/rest/v1/blog_posts",
        params={
            "select": "title,slug,excerpt,content,published_at",
            "is_published": "eq.true",
            "order": "published_at.desc.nullslast",
            # ponytail: hard cap far above a personal blog; PostgREST silently
            # truncates at 1000 and Vercel caps responses at ~4.5MB anyway.
            "limit": "200",
        },
        headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


@app.get("/llms-full.txt")
def llms_full() -> PlainTextResponse:
    """llms.txt plus the full markdown of every published blog post."""
    sections = ["# Noah Berman\n\nSite facts: https://noahiberman.com/llms.txt"]
    try:
        if _LLMS_TXT_PATH.is_file():
            sections = [_LLMS_TXT_PATH.read_text(encoding="utf-8").rstrip()]
        for post in _fetch_published_posts():
            published = str(post.get("published_at") or "")[:10]
            dateline = f", published {published}" if published else ""
            sections.append(
                f"## Blog: {post.get('title')}\n\n"
                f"https://noahiberman.com/blog/{post.get('slug')}{dateline}\n\n"
                + (post.get("content") or post.get("excerpt") or "")
            )
    except Exception as exc:
        # Whatever made it into sections so far is still a correct answer;
        # never 500 a crawler.
        LOGGER.warning("llms-full.txt degraded: %s", exc)

    return PlainTextResponse(
        "\n\n".join(sections) + "\n",
        headers={"Cache-Control": "public, max-age=3600, s-maxage=3600"},
    )


# ---------------------------------------------------------------------------
# Logbook sync (Vercel Cron target + dashboard manual trigger)
# ---------------------------------------------------------------------------


def _is_valid_supabase_user_token(token: str) -> bool:
    """Ask Supabase Auth whether this access token resolves to a real user."""
    from urllib import error as urllib_error
    from urllib import request as urllib_request

    supabase_url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not anon_key:
        return False

    url = f"{supabase_url.rstrip('/')}/auth/v1/user"
    req = urllib_request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "apikey": anon_key},
        method="GET",
    )
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except urllib_error.HTTPError as exc:
        LOGGER.warning("Supabase token check rejected: %s %s", exc.code, exc.reason)
        return False
    except urllib_error.URLError as exc:
        LOGGER.warning("Supabase token check unreachable: %s", exc.reason)
        return False


def _require_sync_auth(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    token = authorization[len("Bearer ") :]

    cron_secret = os.environ.get("CRON_SECRET")
    if cron_secret and hmac.compare_digest(token, cron_secret):
        return

    if _is_valid_supabase_user_token(token):
        return

    raise HTTPException(status_code=401, detail="Unauthorized.")


def _require_owner_auth(authorization: str | None) -> None:
    """Only a signed-in dashboard user may touch the Google Calendar connection."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    if not _is_valid_supabase_user_token(authorization[len("Bearer ") :]):
        raise HTTPException(status_code=401, detail="Unauthorized.")


@app.get("/sync/logbook")
def sync_logbook(authorization: str | None = Header(default=None)):
    """
    Pull the latest ForeFlight CSV from Gmail and replace the Supabase flights
    snapshot. Accepts CRON_SECRET bearer (for Vercel Cron) or a Supabase user
    access token (for the dashboard's manual Sync button).
    """
    _require_sync_auth(authorization)
    result = sync_monthly_logbook_from_email()
    if result.get("status") == "error":
        # A failed sync must not look like a successful one to the cron job or
        # the dashboard's Sync button.
        return JSONResponse(status_code=502, content=result)
    return result


# ---------------------------------------------------------------------------
# Scheduling endpoints
# ---------------------------------------------------------------------------


@app.get("/scheduling/auth/url")
def scheduling_auth_url(authorization: str | None = Header(default=None)):
    """Return the Google OAuth consent URL (owner only)."""
    _require_owner_auth(authorization)
    return {"url": get_auth_url()}


@app.get("/scheduling/auth/status")
async def scheduling_auth_status(authorization: str | None = Header(default=None)):
    """Return whether Google Calendar is connected AND the token still works."""
    _require_owner_auth(authorization)
    return {"connected": await SchedulingService.verify_google_calendar_connection()}


class OAuthExchangeRequest(BaseModel):
    code: str


@app.post("/scheduling/auth/exchange")
async def scheduling_auth_exchange(
    body: OAuthExchangeRequest,
    authorization: str | None = Header(default=None),
):
    """Exchange an OAuth code for tokens and persist the refresh token."""
    _require_owner_auth(authorization)
    await exchange_code(body.code)
    return {"status": "ok", "message": "Google Calendar connected."}


@app.get("/scheduling/auth/callback")
async def scheduling_auth_callback(code: str = Query(...), state: str = Query(default="")):
    """Handle the Google OAuth callback, persist the refresh token, then redirect.

    The `state` value is the one minted by `get_auth_url`; rejecting anything
    else stops a third party from replaying their own authorization code and
    binding their Google Calendar to this deployment.
    """
    if not verify_oauth_state(state):
        LOGGER.warning("OAuth callback rejected: invalid state.")
        return RedirectResponse(url="/dashboard?calendar_error=true")
    try:
        await exchange_code(code)
        return RedirectResponse(url="/dashboard?calendar_connected=true")
    except Exception:
        LOGGER.exception("OAuth callback exchange failed.")
        return RedirectResponse(url="/dashboard?calendar_error=true")


@app.get("/scheduling/primary-meeting")
def primary_meeting():
    """Return the slug of the meeting type marked as the homepage CTA."""
    slug = SchedulingService.get_primary_meeting_slug()
    return {"slug": slug}


@app.get("/scheduling/meeting-types")
def list_public_meeting_types():
    """Active meeting types for the public booking landing page."""
    meetings = SchedulingService.list_active_meeting_types()
    return {"meeting_types": meetings}


@app.get("/scheduling/slots/{slug}")
async def get_slots(
    slug: str,
    start_date: str = Query(..., description="YYYY-MM-DD"),
    days: int = Query(14, ge=1, le=60),
):
    """Return available time slots for a meeting type."""
    meeting = SchedulingService.get_meeting_type(slug)
    if not meeting:
        return JSONResponse(
            status_code=404,
            content={"error": "Meeting type not found or inactive."},
        )

    slots = await SchedulingService.get_available_slots(slug, start_date, days)
    return {
        "slug": slug,
        "meeting": {
            "name": meeting["name"],
            "duration_min": meeting["duration_min"],
            "description": meeting.get("description"),
            "location_type": meeting["location_type"],
        },
        "slots": slots,
    }


class BookingRequest(BaseModel):
    slot_start: str
    guest_name: str
    guest_email: str


@app.post("/scheduling/book/{slug}")
async def book_slot(slug: str, body: BookingRequest):
    """Book a specific slot for a meeting type."""
    try:
        result = await SchedulingService.book(
            slug=slug,
            slot_start=body.slot_start,
            guest_name=body.guest_name,
            guest_email=body.guest_email,
        )
        return {"status": "booked", "event": result}
    except ValueError as exc:
        return JSONResponse(status_code=409, content={"error": str(exc)})
    except (RuntimeError, httpx.HTTPError) as exc:
        # Google Calendar unreachable (no token, refresh token dead, or a
        # transient Google API failure during freeBusy/event creation).
        LOGGER.error("Booking failed, Google Calendar unavailable: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"error": "Calendar connection is temporarily unavailable. Please try again later or use the contact form."},
        )

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from services.logbook_sync import sync_monthly_logbook_from_email
from services.scheduling import SchedulingService, get_auth_url, exchange_code

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    scheduler: BackgroundScheduler | None = None

    try:
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Scheduling endpoints
# ---------------------------------------------------------------------------


@app.get("/scheduling/auth/url")
def scheduling_auth_url():
    """Return the Google OAuth consent URL."""
    return {"url": get_auth_url()}


@app.get("/scheduling/auth/callback")
async def scheduling_auth_callback(code: str = Query(...)):
    """Handle the Google OAuth callback, persist the refresh token, then redirect."""
    await exchange_code(code)
    return RedirectResponse(url="/scheduling/auth/success")


@app.get("/scheduling/auth/success")
def scheduling_auth_success():
    return {"status": "ok", "message": "Google Calendar connected."}


@app.get("/scheduling/slots/{slug}")
async def get_slots(
    slug: str,
    start_date: str = Query(..., description="YYYY-MM-DD"),
    days: int = Query(14, ge=1, le=60),
):
    """Return available time slots for a meeting type."""
    meeting = SchedulingService.get_meeting_type(slug)
    if not meeting:
        return {"error": "Meeting type not found or inactive."}, 404

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
        return {"error": str(exc)}, 409

"""
Scheduling engine: Google Calendar OAuth, freeBusy intersection, event creation.

All availability logic uses America/Denver (or the profile's timezone) internally.
All responses return ISO 8601 strings for frontend consumption.
"""

import os
import logging
from datetime import datetime, timedelta, time as dt_time
from zoneinfo import ZoneInfo

import httpx
from supabase import create_client, Client

from .debug_agent import agent_log

LOGGER = logging.getLogger(__name__)

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
]


def _env(key: str, default: str | None = None) -> str:
    """Read an env var, raising at call time (not import time) if missing."""
    val = os.environ.get(key, default)
    if val is None:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return val

DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def _supabase() -> Client:
    return create_client(_env("SUPABASE_URL"), _env("SUPABASE_SERVICE_ROLE_KEY"))


# ---------------------------------------------------------------------------
# Google OAuth helpers
# ---------------------------------------------------------------------------

def get_auth_url() -> str:
    params = {
        "client_id": _env("GOOGLE_CLIENT_ID"),
        "redirect_uri": _env("GOOGLE_REDIRECT_URI", "http://localhost:8000/scheduling/auth/callback"),
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    qs = "&".join(f"{k}={httpx.URL('', params={k: v}).params[k]}" for k, v in params.items())
    return f"https://accounts.google.com/o/oauth2/v2/auth?{qs}"


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for tokens and persist the refresh token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": _env("GOOGLE_CLIENT_ID"),
                "client_secret": _env("GOOGLE_CLIENT_SECRET"),
                "redirect_uri": _env("GOOGLE_REDIRECT_URI", "http://localhost:8000/scheduling/auth/callback"),
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        tokens = resp.json()

    refresh_token = tokens.get("refresh_token")
    if refresh_token:
        sb = _supabase()
        existing = sb.table("scheduling_auth").select("id").limit(1).execute()
        if existing.data:
            sb.table("scheduling_auth").update(
                {"refresh_token": refresh_token}
            ).eq("id", existing.data[0]["id"]).execute()
        else:
            sb.table("scheduling_auth").insert(
                {"refresh_token": refresh_token}
            ).execute()

    return tokens


async def _get_access_token() -> str:
    """Retrieve stored refresh token and exchange it for a fresh access token."""
    sb = _supabase()
    row = sb.table("scheduling_auth").select("refresh_token").limit(1).execute()
    if not row.data:
        raise RuntimeError("No Google refresh token stored. Complete OAuth first.")

    refresh_token = row.data[0]["refresh_token"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "refresh_token": refresh_token,
                "client_id": _env("GOOGLE_CLIENT_ID"),
                "client_secret": _env("GOOGLE_CLIENT_SECRET"),
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


# ---------------------------------------------------------------------------
# Google Calendar operations
# ---------------------------------------------------------------------------

async def _fetch_busy_ranges(
    access_token: str,
    time_min: datetime,
    time_max: datetime,
) -> list[tuple[datetime, datetime]]:
    """Query Google freeBusy API and return busy intervals as UTC datetimes."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.googleapis.com/calendar/v3/freeBusy",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "timeMin": time_min.isoformat(),
                "timeMax": time_max.isoformat(),
                "items": [{"id": "primary"}],
            },
        )
        resp.raise_for_status()

    busy = []
    for period in resp.json().get("calendars", {}).get("primary", {}).get("busy", []):
        start = datetime.fromisoformat(period["start"])
        end = datetime.fromisoformat(period["end"])
        busy.append((start, end))
    return busy


async def create_calendar_event(
    summary: str,
    start: datetime,
    end: datetime,
    description: str = "",
    location: str = "",
    attendee_email: str = "",
) -> dict:
    """Create a Google Calendar event and return the API response."""
    access_token = await _get_access_token()

    event_body: dict = {
        "summary": summary,
        "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
    }
    if description:
        event_body["description"] = description
    if location:
        event_body["location"] = location
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            json=event_body,
            params={"sendUpdates": "all"},
        )
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Slot computation
# ---------------------------------------------------------------------------

def _parse_window(window_str: str) -> tuple[dt_time, dt_time]:
    """Parse '09:00-17:00' into (time(9,0), time(17,0))."""
    start_s, end_s = window_str.split("-")
    sh, sm = start_s.strip().split(":")
    eh, em = end_s.strip().split(":")
    return dt_time(int(sh), int(sm)), dt_time(int(eh), int(em))


def _generate_profile_slots(
    rules: dict,
    tz: ZoneInfo,
    date: datetime,
    duration_min: int,
) -> list[tuple[datetime, datetime]]:
    """Generate all possible slots for a single date from the availability profile rules."""
    day_key = DAY_KEYS[date.weekday()]
    windows = rules.get(day_key, [])
    slots = []

    for window_str in windows:
        win_start, win_end = _parse_window(window_str)
        cursor = datetime.combine(date.date(), win_start, tzinfo=tz)
        boundary = datetime.combine(date.date(), win_end, tzinfo=tz)

        while cursor + timedelta(minutes=duration_min) <= boundary:
            slot_end = cursor + timedelta(minutes=duration_min)
            slots.append((cursor, slot_end))
            cursor = slot_end

    return slots


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


def _subtract_busy_and_buffers(
    slots: list[tuple[datetime, datetime]],
    busy: list[tuple[datetime, datetime]],
    buffer_min: int,
) -> list[tuple[datetime, datetime]]:
    """Remove slots that overlap with busy periods (including buffer padding)."""
    available = []
    for s_start, s_end in slots:
        buffered_start = s_start - timedelta(minutes=buffer_min)
        buffered_end = s_end + timedelta(minutes=buffer_min)

        conflict = False
        for b_start, b_end in busy:
            if _overlaps(buffered_start, buffered_end, b_start, b_end):
                conflict = True
                break
        if not conflict:
            available.append((s_start, s_end))
    return available


# ---------------------------------------------------------------------------
# Public service interface
# ---------------------------------------------------------------------------

class SchedulingService:
    """Stateless service. Each method fetches what it needs from Supabase/Google."""

    @staticmethod
    def get_meeting_type(slug: str) -> dict:
        sb = _supabase()
        result = (
            sb.table("meeting_types")
            .select("*, availability_profiles(*)")
            .eq("slug", slug)
            .eq("is_active", True)
            .limit(1)
            .single()
            .execute()
        )
        return result.data

    @staticmethod
    async def get_available_slots(slug: str, start_date: str, days: int = 14) -> list[dict]:
        """
        Return available slots for the given meeting type over [start_date, start_date + days).

        Each slot is {"start": "<ISO>", "end": "<ISO>"} in UTC.
        """
        meeting = SchedulingService.get_meeting_type(slug)
        profile = meeting["availability_profiles"]
        tz = ZoneInfo(profile["timezone"])
        rules = profile["rules"]
        duration = meeting["duration_min"]
        buffer = meeting["buffer_min"]
        # region agent log
        agent_log(
            "scheduling.py:get_available_slots",
            "meeting_profile",
            {"timezone": profile.get("timezone"), "duration_min": duration, "buffer_min": buffer},
            "H3",
        )
        # endregion

        base = datetime.strptime(start_date, "%Y-%m-%d")
        now_utc = datetime.now(ZoneInfo("UTC"))

        # Build all profile-based slots across the date range.
        all_slots: list[tuple[datetime, datetime]] = []
        for offset in range(days):
            day = base + timedelta(days=offset)
            day_slots = _generate_profile_slots(rules, tz, day, duration)
            all_slots.extend(day_slots)

        if not all_slots:
            return []

        # Determine the full window in UTC for the freeBusy query.
        range_start = min(s[0] for s in all_slots).astimezone(ZoneInfo("UTC"))
        range_end = max(s[1] for s in all_slots).astimezone(ZoneInfo("UTC"))

        # If Google Calendar is connected, subtract busy times. Otherwise
        # return all profile slots (graceful degradation before OAuth setup).
        busy: list[tuple[datetime, datetime]] = []
        google_connected = False
        try:
            access_token = await _get_access_token()
            busy = await _fetch_busy_ranges(access_token, range_start, range_end)
            google_connected = True
        except RuntimeError:
            LOGGER.warning("Google Calendar not connected; returning raw profile slots.")
        # region agent log
        agent_log(
            "scheduling.py:get_available_slots",
            "google_freebusy",
            {"google_connected": google_connected, "busy_segments": len(busy), "raw_slot_count": len(all_slots)},
            "H2",
        )
        # endregion

        # Convert slots to UTC for comparison with busy ranges.
        utc_slots = [
            (s.astimezone(ZoneInfo("UTC")), e.astimezone(ZoneInfo("UTC")))
            for s, e in all_slots
        ]

        available = _subtract_busy_and_buffers(utc_slots, busy, buffer)

        # Filter out past slots.
        available = [(s, e) for s, e in available if s > now_utc]

        # region agent log
        agent_log(
            "scheduling.py:get_available_slots",
            "final_slots",
            {"available_after_filter": len(available)},
            "H1",
        )
        # endregion
        return [
            {"start": s.isoformat(), "end": e.isoformat()}
            for s, e in available
        ]

    @staticmethod
    async def book(slug: str, slot_start: str, guest_name: str, guest_email: str) -> dict:
        """Book a slot: validate it is still available, then create the calendar event."""
        meeting = SchedulingService.get_meeting_type(slug)
        profile = meeting["availability_profiles"]

        start_dt = datetime.fromisoformat(slot_start).astimezone(ZoneInfo("UTC"))
        end_dt = start_dt + timedelta(minutes=meeting["duration_min"])

        # Verify the slot is still free.
        access_token = await _get_access_token()
        busy = await _fetch_busy_ranges(access_token, start_dt, end_dt)
        # region agent log
        agent_log(
            "scheduling.py:book",
            "pre_book_busy",
            {"busy_segments": len(busy)},
            "H5",
        )
        # endregion
        if busy:
            raise ValueError("Selected slot is no longer available.")

        location = meeting.get("location_details") or meeting.get("location_type", "")
        summary = f"{meeting['name']} with {guest_name}"
        description = (
            f"Meeting type: {meeting['name']}\n"
            f"Guest: {guest_name} ({guest_email})\n"
            f"Duration: {meeting['duration_min']} min\n"
            f"Timezone: {profile['timezone']}"
        )

        event = await create_calendar_event(
            summary=summary,
            start=start_dt,
            end=end_dt,
            description=description,
            location=location,
            attendee_email=guest_email,
        )
        # region agent log
        agent_log(
            "scheduling.py:book",
            "calendar_event_created",
            {"has_id": bool(event.get("id"))},
            "H5",
        )
        # endregion

        return {
            "event_id": event.get("id"),
            "html_link": event.get("htmlLink"),
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
            "summary": summary,
        }

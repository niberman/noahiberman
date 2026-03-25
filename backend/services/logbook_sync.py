import csv
import email
import imaplib
import io
import json
import logging
import os
from datetime import UTC, datetime, timedelta
from email import policy
from hashlib import sha1
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

LOGGER = logging.getLogger(__name__)

IMAP_HOST = "imap.gmail.com"
FORE_FLIGHT_FROM = "team@foreflight.com"
FORE_FLIGHT_SUBJECT = "Logbook"


def _imap_since_date(days: int) -> str:
    """
    Return an IMAP SINCE date string like '25-Mar-2026'.
    Uses UTC to avoid timezone surprises.
    """
    days = max(1, int(days))
    dt = datetime.now(UTC) - timedelta(days=days)
    return dt.strftime("%d-%b-%Y")


def _looks_like_foreflight_csv(payload: bytes) -> bool:
    if not payload:
        return False
    head = payload[:64 * 1024].decode("utf-8-sig", errors="replace")
    # ForeFlight exports include a Flights table with these column names.
    return ("Date" in head) and ("AircraftID" in head) and ("From" in head) and ("To" in head)


def _extract_foreflight_csv_attachments(
    parsed_msg: email.message.EmailMessage,
) -> list[tuple[str, bytes, dict[str, str]]]:
    """
    Extract candidate CSV payloads from an email.
    Accepts common variants: inline disposition, missing filename, content-type based CSV.
    Returns: (display_name, payload_bytes, meta)
    """
    candidates: list[tuple[str, bytes, dict[str, str]]] = []

    for msg_part in parsed_msg.walk():
        if msg_part.is_multipart():
            continue

        filename = msg_part.get_filename() or ""
        disposition = msg_part.get_content_disposition() or ""
        content_type = (msg_part.get_content_type() or "").lower()

        payload = msg_part.get_payload(decode=True) or b""
        if not payload:
            continue

        name_lc = filename.lower()
        is_csv_name = bool(name_lc) and name_lc.endswith(".csv")
        is_csv_type = content_type in {"text/csv", "application/csv", "application/vnd.ms-excel"}
        is_attachmentish = disposition in {"attachment", "inline", ""}  # Gmail sometimes omits this.
        is_csv_sniff = _looks_like_foreflight_csv(payload)

        if not is_attachmentish:
            continue

        if not (is_csv_name or is_csv_type or is_csv_sniff):
            continue

        display_name = filename or f"part-{len(candidates) + 1}.csv"
        meta = {
            "filename": filename or "(none)",
            "disposition": disposition or "(none)",
            "content_type": content_type or "(none)",
            "bytes": str(len(payload)),
        }
        candidates.append((display_name, payload, meta))

    return candidates


def _parse_total_time(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""

    try:
        total = float(raw)
    except ValueError:
        return raw

    hours = int(total)
    minutes = round((total - hours) * 60)
    if minutes == 60:
        hours += 1
        minutes = 0

    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def _parse_foreflight_csv(csv_file: io.BytesIO) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    csv_file.seek(0)
    text = csv_file.read().decode("utf-8-sig", errors="replace")
    rows = list(csv.reader(io.StringIO(text)))

    aircraft_map: dict[str, tuple[str, str]] = {}
    flights_header: list[str] = []
    flights_header_idx = -1

    for idx, row in enumerate(rows):
        if not row:
            continue
        if "AircraftID" in row and "TypeCode" in row:
            # Parse aircraft section until blank lines/next section.
            for aircraft_row in rows[idx + 1 :]:
                if not aircraft_row or not any(col.strip() for col in aircraft_row):
                    continue
                if "Date" in aircraft_row and "AircraftID" in aircraft_row and "From" in aircraft_row:
                    break
                if len(aircraft_row) < 5:
                    continue
                aircraft_id = aircraft_row[0].strip()
                make = aircraft_row[3].strip() if len(aircraft_row) > 3 else ""
                model = aircraft_row[4].strip() if len(aircraft_row) > 4 else ""
                if aircraft_id and aircraft_id != "AircraftID":
                    aircraft_map[aircraft_id] = (make or "Unknown", model or "Aircraft")

        if "Date" in row and "AircraftID" in row and "From" in row and "To" in row:
            flights_header = row
            flights_header_idx = idx
            break

    if flights_header_idx == -1:
        raise ValueError("Could not find ForeFlight Flights Table header.")

    flights: list[dict[str, Any]] = []
    airports_with_coords: dict[str, dict[str, Any]] = {}
    seen_flight_keys: set[str] = set()

    header_pos = {name: i for i, name in enumerate(flights_header)}

    for row in rows[flights_header_idx + 1 :]:
        if not row or not any(col.strip() for col in row):
            continue
        if len(row) < 4:
            continue

        def col(name: str, fallback_idx: int | None = None) -> str:
            if name in header_pos and header_pos[name] < len(row):
                return row[header_pos[name]].strip()
            if fallback_idx is not None and fallback_idx < len(row):
                return row[fallback_idx].strip()
            return ""

        date_str = col("Date", 0)
        aircraft_id = col("AircraftID", 1)
        origin = col("From", 2).upper()
        destination = col("To", 3).upper()
        route = col("Route", 4)
        total_time = col("TotalTime", 11)
        instructor_comments = col("InstructorComments", 52)
        pilot_comments = col("PilotComments", 56)

        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            continue

        if not aircraft_id or not origin or not destination:
            continue

        flight_key = f"{date_str}|{origin}|{destination}|{aircraft_id}"
        if flight_key in seen_flight_keys:
            continue
        seen_flight_keys.add(flight_key)

        make, model = aircraft_map.get(aircraft_id, ("Unknown", "Aircraft"))
        aircraft_type = " ".join([p for p in [make, model] if p]).strip() or "Unknown Aircraft"

        duration = _parse_total_time(total_time)
        comments = (instructor_comments or pilot_comments).replace('"""', "").replace('""', "").strip()
        route_text = f"Route: {route}" if route else ""
        description = comments
        if route_text and comments:
            description = f"{route_text} - {comments}"
        elif route_text:
            description = route_text

        unique_seed = f"{flight_key}|{len(flights)}"
        flight_id = f"ff-{sha1(unique_seed.encode('utf-8')).hexdigest()[:24]}"

        flights.append(
            {
                "id": flight_id,
                "date": date_str,
                "route": {
                    "origin": origin,
                    "originCode": origin,
                    "destination": destination,
                    "destinationCode": destination,
                },
                "aircraft": {
                    "type": aircraft_type,
                    "registration": aircraft_id,
                },
                "duration": duration or None,
                "status": "completed",
                "description": description or None,
            }
        )

        # Optional enrichment if coordinates are present in CSV columns.
        for code, lat_key, lon_key, name_key in [
            (origin, "FromLatitude", "FromLongitude", "FromName"),
            (destination, "ToLatitude", "ToLongitude", "ToName"),
        ]:
            lat_raw = col(lat_key)
            lon_raw = col(lon_key)
            if not lat_raw or not lon_raw:
                continue
            try:
                lat = float(lat_raw)
                lon = float(lon_raw)
            except ValueError:
                continue
            if code not in airports_with_coords:
                airports_with_coords[code] = {
                    "code": code,
                    "name": col(name_key) or code,
                    "latitude": lat,
                    "longitude": lon,
                }

    flights.sort(key=lambda item: item["date"], reverse=True)
    return flights, list(airports_with_coords.values())


def _supabase_headers(service_role_key: str) -> dict[str, str]:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def _rest_call(
    method: str,
    url: str,
    headers: dict[str, str],
    params: dict[str, str] | None = None,
    payload: Any = None,
    timeout: int = 30,
) -> None:
    full_url = url
    if params:
        full_url = f"{url}?{urllib_parse.urlencode(params)}"

    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    req = urllib_request.Request(full_url, data=body, headers=headers, method=method)

    try:
        with urllib_request.urlopen(req, timeout=timeout):
            return
    except urllib_error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase API error {exc.code}: {response_body}") from exc
    except urllib_error.URLError as exc:
        raise RuntimeError(f"Supabase API connection error: {exc}") from exc


def import_logbook_data(csv_file: io.BytesIO) -> None:
    """
    Import the newest ForeFlight logbook CSV as the latest snapshot.

    Snapshot mode:
    1) Parse CSV rows into flights table payload.
    2) Delete existing public.flights rows.
    3) Insert parsed rows.
    4) Optionally upsert airport coordinates when present in CSV.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_service_key:
        LOGGER.warning("Skipping import because Supabase credentials are not configured.")
        return

    flights, airports = _parse_foreflight_csv(csv_file)
    if not flights:
        LOGGER.info("Parsed CSV contained no importable flight rows.")
        return

    base = supabase_url.rstrip("/")
    headers = _supabase_headers(supabase_service_key)

    # Replace existing snapshot.
    _rest_call(
        method="DELETE",
        url=f"{base}/rest/v1/flights",
        headers=headers,
        params={"id": "not.is.null"},
        timeout=30,
    )

    batch_size = 500
    for i in range(0, len(flights), batch_size):
        batch = flights[i : i + batch_size]
        _rest_call(
            method="POST",
            url=f"{base}/rest/v1/flights",
            headers=headers,
            payload=batch,
            timeout=30,
        )

    if airports:
        airport_headers = dict(headers)
        airport_headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
        _rest_call(
            method="POST",
            url=f"{base}/rest/v1/airport_coordinates",
            headers=airport_headers,
            params={"on_conflict": "code"},
            payload=airports,
            timeout=30,
        )


def sync_monthly_logbook_from_email() -> None:
    gmail_user = os.getenv("GMAIL_USER")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_password:
        # Missing credentials is expected in some environments.
        return

    mail = imaplib.IMAP4_SSL(IMAP_HOST)

    try:
        mail.login(gmail_user, gmail_password)
        mail.select("INBOX")

        # Recovery-friendly: process recent messages even if they've been opened.
        since_days = int(os.getenv("FORE_FLIGHT_SINCE_DAYS", "60"))
        since_date = _imap_since_date(since_days)

        primary = f'(SINCE "{since_date}" FROM "foreflight.com" SUBJECT "{FORE_FLIGHT_SUBJECT}")'
        status, search_data = mail.search(None, primary)
        if status != "OK":
            LOGGER.warning("Gmail search failed with status: %s", status)
            return

        message_ids = search_data[0].split() if search_data and search_data[0] else []
        if not message_ids:
            fallback = f'(SINCE "{since_date}" FROM "{FORE_FLIGHT_FROM}" SUBJECT "{FORE_FLIGHT_SUBJECT}")'
            status, search_data = mail.search(None, fallback)
            if status != "OK":
                LOGGER.warning("Gmail search failed with status: %s", status)
                return
            message_ids = search_data[0].split() if search_data and search_data[0] else []

        if not message_ids:
            # Monthly cadence: no message most days is normal.
            return

        # Fetch & sort newest-first (best-effort based on Date header).
        parsed_messages: list[tuple[datetime, bytes, email.message.EmailMessage]] = []
        for message_id in message_ids:
            fetch_status, msg_data = mail.fetch(message_id, "(RFC822)")
            if fetch_status != "OK" or not msg_data:
                continue

            raw_email = None
            for part in msg_data:
                if isinstance(part, tuple) and len(part) > 1:
                    raw_email = part[1]
                    break
            if not raw_email:
                continue

            parsed_msg = email.message_from_bytes(raw_email, policy=policy.default)
            msg_date = parsed_msg.get("date")
            dt: datetime | None = None
            try:
                dt = msg_date.datetime if msg_date and hasattr(msg_date, "datetime") else None
            except Exception:
                dt = None

            parsed_messages.append((dt or datetime.min.replace(tzinfo=UTC), message_id, parsed_msg))

        parsed_messages.sort(key=lambda item: item[0], reverse=True)

        for _, message_id, parsed_msg in parsed_messages:
            LOGGER.info(
                "ForeFlight email candidate: from=%s subject=%s date=%s id=%s",
                parsed_msg.get("from"),
                parsed_msg.get("subject"),
                parsed_msg.get("date"),
                message_id.decode(errors="replace") if isinstance(message_id, (bytes, bytearray)) else str(message_id),
            )

            candidates = _extract_foreflight_csv_attachments(parsed_msg)
            if not candidates:
                LOGGER.warning(
                    "No CSV attachment found in matching email id=%s",
                    message_id.decode(errors="replace") if isinstance(message_id, (bytes, bytearray)) else str(message_id),
                )
                continue

            # Prefer the largest CSV payload (often the real export vs small fragments).
            candidates.sort(key=lambda item: len(item[1]), reverse=True)
            name, payload, meta = candidates[0]
            LOGGER.info("Selected ForeFlight CSV part: name=%s meta=%s", name, meta)

            csv_buffer = io.BytesIO(payload)
            import_logbook_data(csv_buffer)

            # Mark seen only after successful processing/import.
            mail.store(message_id, "+FLAGS", "\\Seen")
            break

    except Exception:
        LOGGER.exception("Monthly logbook sync failed.")
    finally:
        try:
            mail.logout()
        except Exception:
            pass

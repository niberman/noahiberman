"""Unit tests for scheduling slot math (no I/O)."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from services.scheduling import (
    _generate_profile_slots,
    _overlaps,
    _parse_window,
    _subtract_busy_and_buffers,
)


def test_parse_window() -> None:
    start, end = _parse_window("09:00-17:30")
    assert start.hour == 9 and start.minute == 0
    assert end.hour == 17 and end.minute == 30


def test_overlaps_touching_boundary_no_overlap() -> None:
    # [10:00, 11:00) and [11:00, 12:00) — end == start is not overlap
    a0 = datetime(2026, 4, 1, 10, 0, tzinfo=ZoneInfo("UTC"))
    a1 = datetime(2026, 4, 1, 11, 0, tzinfo=ZoneInfo("UTC"))
    b0 = datetime(2026, 4, 1, 11, 0, tzinfo=ZoneInfo("UTC"))
    b1 = datetime(2026, 4, 1, 12, 0, tzinfo=ZoneInfo("UTC"))
    assert _overlaps(a0, a1, b0, b1) is False


def test_overlaps_partial() -> None:
    a0 = datetime(2026, 4, 1, 10, 0, tzinfo=ZoneInfo("UTC"))
    a1 = datetime(2026, 4, 1, 12, 0, tzinfo=ZoneInfo("UTC"))
    b0 = datetime(2026, 4, 1, 11, 0, tzinfo=ZoneInfo("UTC"))
    b1 = datetime(2026, 4, 1, 13, 0, tzinfo=ZoneInfo("UTC"))
    assert _overlaps(a0, a1, b0, b1) is True


def test_generate_profile_slots_30min_within_window() -> None:
    tz = ZoneInfo("America/Denver")
    day = datetime(2026, 4, 6, 12, 0, 0)  # Monday
    rules = {"mon": ["10:00-11:30"]}
    slots = _generate_profile_slots(rules, tz, day, duration_min=30)
    assert len(slots) == 3
    assert slots[0][0].hour == 10 and slots[0][0].minute == 0
    assert slots[1][0].hour == 10 and slots[1][0].minute == 30
    assert slots[2][0].hour == 11 and slots[2][0].minute == 0


def test_subtract_busy_respects_buffer() -> None:
    tz = ZoneInfo("UTC")
    slot_start = datetime(2026, 4, 1, 14, 0, tzinfo=tz)
    slot_end = datetime(2026, 4, 1, 14, 30, tzinfo=tz)
    slots = [(slot_start, slot_end)]
    # Buffer 15 => padded window [13:45, 14:45); busy overlapping that removes the slot
    busy = [
        (
            datetime(2026, 4, 1, 13, 0, tzinfo=tz),
            datetime(2026, 4, 1, 14, 0, tzinfo=tz),
        )
    ]
    out = _subtract_busy_and_buffers(slots, busy, buffer_min=15)
    assert out == []

    # Busy ends before buffered window starts — slot survives
    busy_clear = [
        (
            datetime(2026, 4, 1, 13, 0, tzinfo=tz),
            datetime(2026, 4, 1, 13, 44, tzinfo=tz),
        )
    ]
    out2 = _subtract_busy_and_buffers(slots, busy_clear, buffer_min=15)
    assert len(out2) == 1


def test_subtract_busy_empty_returns_all() -> None:
    tz = ZoneInfo("UTC")
    s = datetime(2026, 4, 1, 14, 0, tzinfo=tz)
    e = datetime(2026, 4, 1, 14, 30, tzinfo=tz)
    assert _subtract_busy_and_buffers([(s, e)], [], buffer_min=10) == [(s, e)]

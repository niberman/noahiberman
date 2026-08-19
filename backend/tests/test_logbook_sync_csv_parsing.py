"""ForeFlight CSV parsing tests (pure functions, no network)."""

import io
from datetime import UTC, datetime, timedelta

import pytest

from services.logbook_sync import (
    _imap_since_date,
    _looks_like_foreflight_csv,
    _parse_foreflight_csv,
    _parse_total_time,
)

AIRCRAFT_HEADER = "AircraftID,EquipmentType,TypeCode,Make,Model,Category\n"
FLIGHTS_HEADER = "Date,AircraftID,From,To,Route,TotalTime,FromLatitude,FromLongitude,FromName,ToLatitude,ToLongitude,ToName\n"


def _csv(body: str) -> io.BytesIO:
    return io.BytesIO(body.encode("utf-8"))


def _flight_csv(*rows: str, aircraft: str = "N123AB,aircraft,C172,Cessna,172S,airplane\n") -> io.BytesIO:
    return _csv(
        "ForeFlight Logbook Import\n\n"
        "Aircraft Table\n"
        + AIRCRAFT_HEADER
        + aircraft
        + "\n"
        + "Flights Table\n"
        + FLIGHTS_HEADER
        + "".join(rows)
    )


def test_imap_since_date_formats_utc_offset() -> None:
    expected = (datetime.now(UTC) - timedelta(days=7)).strftime("%d-%b-%Y")
    assert _imap_since_date(7) == expected


@pytest.mark.parametrize("days", [0, -5])
def test_imap_since_date_clamps_to_one_day(days: int) -> None:
    expected = (datetime.now(UTC) - timedelta(days=1)).strftime("%d-%b-%Y")
    assert _imap_since_date(days) == expected


def test_looks_like_foreflight_csv() -> None:
    assert _looks_like_foreflight_csv(b"Date,AircraftID,From,To\n")
    assert not _looks_like_foreflight_csv(b"")
    assert not _looks_like_foreflight_csv(b"Name,Email\n")


def test_looks_like_foreflight_csv_tolerates_bom_and_binary() -> None:
    assert _looks_like_foreflight_csv(b"\xef\xbb\xbfDate,AircraftID,From,To\n")
    assert not _looks_like_foreflight_csv(b"\x00\x01\x02\x03")


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("", ""),
        ("   ", ""),
        ("not-a-number", "not-a-number"),
        ("1.5", "1h 30m"),
        ("2.0", "2h 0m"),
        ("0.5", "30m"),
        ("0.99", "59m"),
        ("0.999", "1h 0m"),  # rounds to 60 minutes and carries into the hour
    ],
)
def test_parse_total_time(raw: str, expected: str) -> None:
    assert _parse_total_time(raw) == expected


def test_parse_foreflight_csv_builds_flight_records() -> None:
    csv_file = _flight_csv("2026-01-02,N123AB,ksfo,klax,KSFO KLAX,1.5,,,,,,\n")

    flights, airports = _parse_foreflight_csv(csv_file)

    assert airports == []
    assert len(flights) == 1
    flight = flights[0]
    assert flight["id"].startswith("ff-")
    assert flight["date"] == "2026-01-02"
    assert flight["route"] == {
        "origin": "KSFO",
        "originCode": "KSFO",
        "destination": "KLAX",
        "destinationCode": "KLAX",
    }
    assert flight["aircraft"] == {"type": "Cessna 172S", "registration": "N123AB"}
    assert flight["duration"] == "1h 30m"
    assert flight["status"] == "completed"
    assert flight["description"] == "Route: KSFO KLAX"


def test_parse_foreflight_csv_sorts_newest_first_and_ids_are_unique() -> None:
    csv_file = _flight_csv(
        "2026-01-01,N123AB,KSFO,KSFO,,1.0,,,,,,\n",
        "2026-01-01,N123AB,KSFO,KSFO,,1.0,,,,,,\n",
        "2026-03-04,N123AB,KSFO,KLAX,,1.0,,,,,,\n",
    )

    flights, _ = _parse_foreflight_csv(csv_file)

    assert [f["date"] for f in flights] == ["2026-03-04", "2026-01-01", "2026-01-01"]
    assert len({f["id"] for f in flights}) == 3


def test_parse_foreflight_csv_skips_unusable_rows() -> None:
    csv_file = _flight_csv(
        "\n",
        ",,,\n",
        "2026-01-01,N1\n",  # too few columns
        "01/02/2026,N123AB,KSFO,KLAX,,1.0,,,,,,\n",  # unparseable date
        ",N123AB,KSFO,KLAX,,1.0,,,,,,\n",  # missing date
        "2026-01-05,,KSFO,KLAX,,1.0,,,,,,\n",  # missing aircraft
        "2026-01-06,N123AB,,,,1.0,,,,,,\n",  # no airports at all
        "2026-01-07,N123AB,KSFO,KLAX,,1.0,,,,,,\n",  # the only good row
    )

    flights, _ = _parse_foreflight_csv(csv_file)

    assert [f["date"] for f in flights] == ["2026-01-07"]


def test_parse_foreflight_csv_mirrors_single_airport_pattern_flights() -> None:
    csv_file = _flight_csv(
        "2026-01-01,N123AB,KSFO,,,1.0,,,,,,\n",
        "2026-01-02,N123AB,,KLAX,,1.0,,,,,,\n",
    )

    flights, _ = _parse_foreflight_csv(csv_file)

    routes = {f["date"]: (f["route"]["origin"], f["route"]["destination"]) for f in flights}
    assert routes == {"2026-01-01": ("KSFO", "KSFO"), "2026-01-02": ("KLAX", "KLAX")}


def test_parse_foreflight_csv_unknown_aircraft_falls_back() -> None:
    csv_file = _flight_csv("2026-01-01,N999ZZ,KSFO,KLAX,,,,,,,,\n")

    flights, _ = _parse_foreflight_csv(csv_file)

    assert flights[0]["aircraft"]["type"] == "Unknown Aircraft"
    assert flights[0]["duration"] is None
    assert flights[0]["description"] is None


def test_parse_foreflight_csv_collects_airport_coordinates_once() -> None:
    csv_file = _flight_csv(
        "2026-01-01,N123AB,KSFO,KLAX,,1.0,37.6,-122.4,San Francisco Intl,33.9,-118.4,Los Angeles Intl\n",
        "2026-01-02,N123AB,KSFO,KLAX,,1.0,99.9,-99.9,Bogus,33.9,-118.4,\n",
        "2026-01-03,N123AB,KSFO,KLAX,,1.0,not-a-number,-122.4,Bad,,,\n",
    )

    _, airports = _parse_foreflight_csv(csv_file)

    by_code = {a["code"]: a for a in airports}
    assert set(by_code) == {"KSFO", "KLAX"}
    assert by_code["KSFO"] == {
        "code": "KSFO",
        "name": "San Francisco Intl",
        "latitude": 37.6,
        "longitude": -122.4,
    }
    assert by_code["KLAX"]["name"] == "Los Angeles Intl"


def test_parse_foreflight_csv_strips_quote_artifacts_from_comments() -> None:
    header = "Date,AircraftID,From,To,Route,TotalTime,InstructorComments,PilotComments\n"
    csv_file = _csv(
        "Flights Table\n" + header + '2026-01-01,N123AB,KSFO,KLAX,,1.0,""solo"" xc,ignored\n'
    )

    flights, _ = _parse_foreflight_csv(csv_file)

    assert flights[0]["description"] == "solo xc"


def test_parse_foreflight_csv_prefers_instructor_comments() -> None:
    header = "Date,AircraftID,From,To,Route,TotalTime,InstructorComments,PilotComments\n"
    csv_file = _csv("Flights Table\n" + header + "2026-01-01,N123AB,KSFO,KLAX,,1.0,,pilot note\n")

    flights, _ = _parse_foreflight_csv(csv_file)

    assert flights[0]["description"] == "pilot note"


def test_parse_foreflight_csv_requires_flights_header() -> None:
    with pytest.raises(ValueError, match="Flights Table header"):
        _parse_foreflight_csv(_csv("Aircraft Table\n" + AIRCRAFT_HEADER))


def test_parse_foreflight_csv_decodes_bom_and_rereads_from_start() -> None:
    csv_file = _flight_csv("2026-01-01,N123AB,KSFO,KLAX,,1.0,,,,,,\n")
    csv_file.seek(3)  # parser must rewind before decoding

    flights, _ = _parse_foreflight_csv(csv_file)

    assert len(flights) == 1

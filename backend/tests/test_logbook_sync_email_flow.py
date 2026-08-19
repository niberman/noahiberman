"""sync_monthly_logbook_from_email tests against a fake IMAP server."""

from email.message import EmailMessage
from typing import Any

import pytest

from services import logbook_sync

CSV_BODY = b"Date,AircraftID,From,To\n2026-01-01,N123AB,KSFO,KLAX\n"


def _email(*, date: str, subject: str = "Logbook", attachment: bytes | None = CSV_BODY) -> bytes:
    msg = EmailMessage()
    msg["From"] = "team@foreflight.com"
    msg["Subject"] = subject
    msg["Date"] = date
    msg.set_content("Your logbook export is attached.")
    if attachment is not None:
        msg.add_attachment(attachment, maintype="text", subtype="csv", filename="Logbook.csv")
    return msg.as_bytes()


class FakeIMAP:
    """Minimal imaplib.IMAP4_SSL stand-in driven by a search-query -> ids mapping."""

    def __init__(self, *, searches: list[tuple[str, list[bytes]]], messages: dict[bytes, bytes]) -> None:
        self._searches = list(searches)
        self._messages = messages
        self.queries: list[str] = []
        self.stored: list[tuple[bytes, str, str]] = []
        self.logged_out = False
        self.selected: str | None = None

    def login(self, user: str, password: str) -> None:
        self.credentials = (user, password)

    def select(self, mailbox: str) -> None:
        self.selected = mailbox

    def search(self, _charset: Any, query: str) -> tuple[str, list[bytes | None]]:
        self.queries.append(query)
        status, ids = self._searches.pop(0)
        return status, [b" ".join(ids) if ids else b""]

    def fetch(self, message_id: bytes, _spec: str) -> tuple[str, list[Any]]:
        raw = self._messages.get(message_id)
        if raw is None:
            return "NO", []
        return "OK", [(b"1 (RFC822 {n}", raw), b")"]

    def store(self, message_id: bytes, flag_command: str, flags: str) -> tuple[str, list[Any]]:
        self.stored.append((message_id, flag_command, flags))
        # imaplib returns (typ, data); the sync checks typ before trusting the flag.
        return "OK", [b"1 (FLAGS (\\Seen))"]

    def logout(self) -> None:
        self.logged_out = True


@pytest.fixture(autouse=True)
def _gmail_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GMAIL_USER", "pilot@example.com")
    monkeypatch.setenv("GMAIL_APP_PASSWORD", "app-password")
    monkeypatch.delenv("FORE_FLIGHT_SINCE_DAYS", raising=False)


def _install(monkeypatch: pytest.MonkeyPatch, fake: FakeIMAP) -> None:
    monkeypatch.setattr(logbook_sync.imaplib, "IMAP4_SSL", lambda host: fake)


@pytest.fixture
def imported(monkeypatch: pytest.MonkeyPatch) -> list[bytes]:
    payloads: list[bytes] = []

    def fake_import(csv_file: Any) -> dict[str, Any]:
        payloads.append(csv_file.getvalue())
        return {"status": "ok", "flights_imported": 1, "airports_upserted": 0}

    monkeypatch.setattr(logbook_sync, "import_logbook_data", fake_import)
    return payloads


@pytest.mark.parametrize("missing", ["GMAIL_USER", "GMAIL_APP_PASSWORD"])
def test_skips_without_gmail_credentials(monkeypatch: pytest.MonkeyPatch, missing: str) -> None:
    monkeypatch.delenv(missing, raising=False)
    monkeypatch.setattr(
        logbook_sync.imaplib, "IMAP4_SSL", lambda host: pytest.fail("must not connect to IMAP")
    )

    assert logbook_sync.sync_monthly_logbook_from_email() == {
        "status": "skipped",
        "reason": "gmail_credentials_missing",
    }


def test_imports_newest_matching_email_and_marks_it_seen(
    monkeypatch: pytest.MonkeyPatch, imported: list[bytes]
) -> None:
    messages = {
        b"1": _email(date="Mon, 05 Jan 2026 10:00:00 +0000"),
        b"2": _email(date="Wed, 07 Jan 2026 10:00:00 +0000", attachment=CSV_BODY + b"2026-01-02,N123AB,KSFO,KSFO\n"),
    }
    fake = FakeIMAP(searches=[("OK", [b"1", b"2"])], messages=messages)
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result["status"] == "ok"
    assert result["emails_found"] == 2
    assert result["email_date"] == "Wed, 07 Jan 2026 10:00:00 +0000"
    assert result["csv_name"] == "Logbook.csv"
    assert result["import"] == {"status": "ok", "flights_imported": 1, "airports_upserted": 0}
    assert len(imported) == 1
    assert b"2026-01-02" in imported[0]
    assert fake.stored == [(b"2", "+FLAGS", "\\Seen")]
    assert fake.selected == "INBOX"
    assert fake.logged_out


def test_uses_since_days_env_in_search_query(monkeypatch: pytest.MonkeyPatch, imported: list[bytes]) -> None:
    monkeypatch.setenv("FORE_FLIGHT_SINCE_DAYS", "5")
    fake = FakeIMAP(searches=[("OK", [b"1"])], messages={b"1": _email(date="Mon, 05 Jan 2026 10:00:00 +0000")})
    _install(monkeypatch, fake)

    logbook_sync.sync_monthly_logbook_from_email()

    assert logbook_sync._imap_since_date(5) in fake.queries[0]
    assert 'SUBJECT "Logbook"' in fake.queries[0]


def test_falls_back_to_exact_sender_query(monkeypatch: pytest.MonkeyPatch, imported: list[bytes]) -> None:
    fake = FakeIMAP(
        searches=[("OK", []), ("OK", [b"9"])],
        messages={b"9": _email(date="Mon, 05 Jan 2026 10:00:00 +0000")},
    )
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result["status"] == "ok"
    assert 'FROM "foreflight.com"' in fake.queries[0]
    assert f'FROM "{logbook_sync.FORE_FLIGHT_FROM}"' in fake.queries[1]
    assert len(imported) == 1


def test_reports_no_emails_found(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeIMAP(searches=[("OK", []), ("OK", [])], messages={})
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result == {"status": "ok", "emails_found": 0, "since_days": 60}


@pytest.mark.parametrize("failing_search", [0, 1])
def test_reports_imap_search_failure(monkeypatch: pytest.MonkeyPatch, failing_search: int) -> None:
    searches: list[tuple[str, list[bytes]]] = [("OK", []), ("NO", [])]
    if failing_search == 0:
        searches = [("NO", [])]
    fake = FakeIMAP(searches=searches, messages={})
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result == {"status": "error", "reason": "imap_search_failed:NO"}
    assert fake.logged_out


def test_skips_emails_without_csv_attachment(monkeypatch: pytest.MonkeyPatch, imported: list[bytes]) -> None:
    fake = FakeIMAP(
        searches=[("OK", [b"1"])],
        messages={b"1": _email(date="Mon, 05 Jan 2026 10:00:00 +0000", attachment=None)},
    )
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result == {
        "status": "ok",
        "emails_found": 1,
        "imported": False,
        "reason": "no_csv_attachment",
    }
    assert imported == []
    assert fake.stored == []


def test_skips_unfetchable_messages(monkeypatch: pytest.MonkeyPatch, imported: list[bytes]) -> None:
    fake = FakeIMAP(
        searches=[("OK", [b"1", b"2"])],
        messages={b"2": _email(date="Mon, 05 Jan 2026 10:00:00 +0000")},
    )
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result["emails_found"] == 1
    assert len(imported) == 1


def test_handles_message_without_date_header(monkeypatch: pytest.MonkeyPatch, imported: list[bytes]) -> None:
    msg = EmailMessage()
    msg["From"] = "team@foreflight.com"
    msg["Subject"] = "Logbook"
    msg.set_content("no date header")
    msg.add_attachment(CSV_BODY, maintype="text", subtype="csv", filename="Logbook.csv")

    fake = FakeIMAP(searches=[("OK", [b"1"])], messages={b"1": msg.as_bytes()})
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result["status"] == "ok"
    assert result["email_date"] is None
    assert len(imported) == 1


def test_prefers_largest_csv_candidate(monkeypatch: pytest.MonkeyPatch, imported: list[bytes]) -> None:
    msg = EmailMessage()
    msg["From"] = "team@foreflight.com"
    msg["Subject"] = "Logbook"
    msg["Date"] = "Mon, 05 Jan 2026 10:00:00 +0000"
    msg.set_content("two attachments")
    msg.add_attachment(CSV_BODY, maintype="text", subtype="csv", filename="small.csv")
    big = CSV_BODY + b"2026-01-02,N123AB,KSFO,KSFO\n" * 20
    msg.add_attachment(big, maintype="text", subtype="csv", filename="big.csv")

    fake = FakeIMAP(searches=[("OK", [b"1"])], messages={b"1": msg.as_bytes()})
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result["csv_name"] == "big.csv"
    assert imported[0] == big


def test_returns_error_status_when_import_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(_: Any) -> dict[str, Any]:
        raise RuntimeError("Supabase API error 500: nope")

    monkeypatch.setattr(logbook_sync, "import_logbook_data", boom)
    fake = FakeIMAP(
        searches=[("OK", [b"1"])],
        messages={b"1": _email(date="Mon, 05 Jan 2026 10:00:00 +0000")},
    )
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result == {
        "status": "error",
        "reason": "exception:RuntimeError",
        "detail": "Supabase API error 500: nope",
    }
    assert fake.stored == []
    assert fake.logged_out


def test_returns_error_status_when_login_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeIMAP(searches=[], messages={})

    def failing_login(*_: Any) -> None:
        raise logbook_sync.imaplib.IMAP4.error("auth failed")

    fake.login = failing_login  # type: ignore[method-assign]
    _install(monkeypatch, fake)

    result = logbook_sync.sync_monthly_logbook_from_email()

    assert result == {
        "status": "error",
        "reason": "exception:error",
        "detail": "auth failed",
    }


def test_logout_failure_is_swallowed(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeIMAP(searches=[("OK", []), ("OK", [])], messages={})

    def failing_logout() -> None:
        raise OSError("connection reset")

    fake.logout = failing_logout  # type: ignore[method-assign]
    _install(monkeypatch, fake)

    assert logbook_sync.sync_monthly_logbook_from_email()["status"] == "ok"

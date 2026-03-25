import email
from email.message import EmailMessage

from services.logbook_sync import _extract_foreflight_csv_attachments


def _make_msg(*, disposition: str | None, filename: str | None, content_type: str, payload: bytes) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = "team@foreflight.com"
    msg["Subject"] = "Logbook"

    maintype, subtype = content_type.split("/", 1)
    if filename is not None:
        msg.add_attachment(payload, maintype=maintype, subtype=subtype, filename=filename, disposition=disposition)
    else:
        # add_attachment requires filename for attachment; create a part manually by setting headers
        part = EmailMessage()
        part.set_content(payload.decode("utf-8", errors="replace"))
        part.replace_header("Content-Type", content_type)
        if disposition is not None:
            part.add_header("Content-Disposition", disposition)
        msg.make_mixed()
        msg.attach(part)
    return msg


def test_extract_csv_by_filename_attachment() -> None:
    msg = _make_msg(
        disposition="attachment",
        filename="Logbook.csv",
        content_type="application/octet-stream",
        payload=b"Date,AircraftID,From,To\n2026-01-01,N123,KSFO,KLAX\n",
    )
    candidates = _extract_foreflight_csv_attachments(msg)
    assert len(candidates) == 1
    assert candidates[0][0].lower().endswith(".csv")


def test_extract_csv_by_content_type_inline() -> None:
    msg = _make_msg(
        disposition="inline",
        filename=None,
        content_type="text/csv",
        payload=b"Date,AircraftID,From,To\n2026-01-01,N123,KSFO,KLAX\n",
    )
    candidates = _extract_foreflight_csv_attachments(msg)
    assert len(candidates) == 1


def test_extract_csv_by_sniff_no_disposition() -> None:
    raw = b"Date,AircraftID,From,To\n2026-01-01,N123,KSFO,KLAX\n"
    msg = EmailMessage()
    msg["From"] = "team@foreflight.com"
    msg["Subject"] = "Logbook"
    msg.make_mixed()

    part = EmailMessage()
    part.add_header("Content-Type", "application/octet-stream")
    part.set_payload(raw)
    msg.attach(part)

    candidates = _extract_foreflight_csv_attachments(msg)
    assert len(candidates) == 1


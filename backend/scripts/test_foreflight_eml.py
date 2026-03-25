import argparse
import email
import io
from email import policy
from pathlib import Path

from services.logbook_sync import _extract_foreflight_csv_attachments, _parse_foreflight_csv


def main() -> int:
    parser = argparse.ArgumentParser(description="Replay a ForeFlight email (.eml) and extract/parse the logbook CSV.")
    parser.add_argument("eml_path", type=Path, help="Path to a downloaded .eml file (Gmail: More -> Download message).")
    parser.add_argument("--list-parts", action="store_true", help="List CSV candidate parts and exit.")
    args = parser.parse_args()

    raw = args.eml_path.read_bytes()
    msg = email.message_from_bytes(raw, policy=policy.default)

    print("From:", msg.get("from"))
    print("Subject:", msg.get("subject"))
    print("Date:", msg.get("date"))

    candidates = _extract_foreflight_csv_attachments(msg)
    if not candidates:
        print("No CSV candidates found.")
        return 2

    print(f"Found {len(candidates)} CSV candidate part(s).")
    for idx, (name, payload, meta) in enumerate(candidates, start=1):
        print(f"- [{idx}] name={name} bytes={len(payload)} meta={meta}")

    if args.list_parts:
        return 0

    # Prefer the largest payload, matching production selection.
    candidates.sort(key=lambda item: len(item[1]), reverse=True)
    name, payload, meta = candidates[0]
    print("Selected:", name, meta)

    flights, airports = _parse_foreflight_csv(io.BytesIO(payload))
    print("Parsed flights:", len(flights))
    print("Parsed airports:", len(airports))
    if flights:
        print("Newest flight date:", flights[0].get("date"))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


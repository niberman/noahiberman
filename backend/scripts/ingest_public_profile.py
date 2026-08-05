"""Ingest docs/public-profile.md into the iNoah corpus as the public tier.

Run whenever the profile changes:
    SUPABASE_URL=... SUPABASE_ANON_KEY=... INGEST_SECRET=... \
        python backend/scripts/ingest_public_profile.py

The Never publish section is stripped before chunking, always. Re-runs are
cheap: inoah-ingest skips chunks whose content hash is unchanged, and the
server drops anything the content policy excludes regardless of what this
script sends.
"""

import os
import re
import sys
from pathlib import Path

import httpx

# Mirrors projects/inoah-core/src/inoah_core/memory/ingest.py so chunk
# identity stays stable across ingesters.
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

PROFILE = Path(__file__).resolve().parents[2] / "docs" / "public-profile.md"
SOURCE_EXTERNAL_ID = "docs/public-profile.md"


def strip_never_publish(text: str) -> str:
    return re.split(r"^## Never publish\s*$", text, flags=re.MULTILINE)[0]


def chunk_text(text: str) -> list[str]:
    paragraphs = re.split(r"\n\n+", text)
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) > CHUNK_SIZE:
            if current:
                chunks.append(current.strip())
            if chunks and CHUNK_OVERLAP > 0:
                current = chunks[-1][-CHUNK_OVERLAP:] + "\n\n" + para
            else:
                current = para
        else:
            current = current + "\n\n" + para if current else para
    if current:
        chunks.append(current.strip())
    return chunks


def main() -> int:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    anon = os.environ.get("SUPABASE_ANON_KEY", "")
    secret = os.environ.get("INGEST_SECRET", "")
    if not (url and anon and secret):
        print("Set SUPABASE_URL, SUPABASE_ANON_KEY and INGEST_SECRET.")
        return 1
    if not PROFILE.exists():
        print(f"Missing {PROFILE}")
        return 1

    text = strip_never_publish(PROFILE.read_text(encoding="utf-8"))
    chunks = chunk_text(text)
    items = [
        {
            "content": c,
            "source_id": "repo:docs/public-profile.md",
            "chunk_index": i,
            "source_uri": None,
            "collection": "profile",
            "metadata": {"sync_origin": "repo_file:docs/public-profile.md"},
        }
        for i, c in enumerate(chunks)
    ]

    resp = httpx.post(
        f"{url}/functions/v1/inoah-ingest",
        headers={"apikey": anon, "Authorization": f"Bearer {anon}", "Content-Type": "application/json"},
        json={
            "action": "ingest",
            "secret": secret,
            "source_kind": "repo_file",
            "source_external_id": SOURCE_EXTERNAL_ID,
            "items": items,
        },
        timeout=300,
    )
    print(resp.status_code, resp.text[:400])
    return 0 if resp.status_code == 200 else 1


if __name__ == "__main__":
    sys.exit(main())

"""Append-only NDJSON debug logs for Cursor debug mode (no secrets)."""

from __future__ import annotations

import json
import time
from pathlib import Path

LOG_PATH = "/Users/noah/noahiberman/.cursor/debug-951172.log"
SESSION_ID = "951172"


def agent_log(location: str, message: str, data: dict, hypothesis_id: str) -> None:
    try:
        log_path = Path(LOG_PATH)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(
                json.dumps(
                    {
                        "sessionId": SESSION_ID,
                        "timestamp": int(time.time() * 1000),
                        "location": location,
                        "message": message,
                        "data": data,
                        "hypothesisId": hypothesis_id,
                    },
                    default=str,
                )
                + "\n"
            )
    except OSError:
        pass

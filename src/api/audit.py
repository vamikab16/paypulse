"""
Append-only inference audit log.

Every model inference served by the API is recorded as one JSON line:

  {
    "ts": ISO-8601 UTC,
    "request_id": uuid,
    "endpoint": "/api/ai/risk/S2",
    "model_id": "paypulse-risk-clf-v2",
    "subject_id": "S2",              # supplier / company being scored
    "features_hash": "sha1:...",     # reproducibility anchor
    "output": {"score": ..., "bucket": ...},
    "reason_codes": [...]
  }

Rationale: a bank validator, a regulator, or (under GDPR Art. 22) a
customer can demand to see exactly what the model said about a subject on
a given date, along with the features that produced that output. Without
an immutable, replayable audit trail this is impossible — and deployment
is blocked.

This is a deliberately minimal file-based implementation. In production
you would replace the backend with an append-only store (S3 Object Lock,
WORM-configured bucket, Kafka topic to compacted Iceberg table, etc.).
"""

from __future__ import annotations

import hashlib
import json
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

AUDIT_DIR = os.environ.get(
    "PAYPULSE_AUDIT_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "audit"),
)
os.makedirs(AUDIT_DIR, exist_ok=True)

_LOCK = threading.Lock()


def _log_path() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return os.path.join(AUDIT_DIR, f"inference-{stamp}.jsonl")


def features_hash(features: Any) -> str:
    """Stable SHA1 hash of a features payload — serves as a reproducibility anchor."""
    blob = json.dumps(features, sort_keys=True, default=str).encode("utf-8")
    return "sha1:" + hashlib.sha1(blob).hexdigest()


def log_inference(
    endpoint: str,
    model_id: str,
    subject_id: str,
    features: Any,
    output: Any,
    reason_codes: list | None = None,
    extra: dict | None = None,
) -> str:
    """
    Append one audit record. Returns the request_id.

    Never raises to the caller — audit failure must not block serving
    traffic, but is reported via stderr for monitoring.
    """
    rid = str(uuid.uuid4())
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "request_id": rid,
        "endpoint": endpoint,
        "model_id": model_id,
        "subject_id": subject_id,
        "features_hash": features_hash(features),
        "output": output,
        "reason_codes": reason_codes or [],
    }
    if extra:
        record["extra"] = extra
    try:
        with _LOCK:
            with open(_log_path(), "a", encoding="utf-8") as f:
                f.write(json.dumps(record, default=str) + "\n")
    except Exception as e:  # pragma: no cover - audit must not break serving
        import sys
        print(f"[audit] write failed: {e}", file=sys.stderr)
    return rid


def recent_audit_records(limit: int = 50) -> list[dict]:
    """Return the most recent `limit` audit records across today's log file."""
    path = _log_path()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception:
        return []
    out = []
    for line in lines[-limit:]:
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out

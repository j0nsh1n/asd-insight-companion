"""SQLite helpers for anonymous research sessions."""

from __future__ import annotations

import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

from app.core.config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    stage TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    consent_research_only INTEGER NOT NULL DEFAULT 0,
    consent_no_diagnosis INTEGER NOT NULL DEFAULT 0,
    consent_data_minimization INTEGER NOT NULL DEFAULT 0,
    consented_at TEXT,
    age_range TEXT,
    language TEXT,
    accessibility_prefs TEXT,
    optional_context TEXT
);
"""

# Wait for locks under concurrent writers (Phase 1 atomic transitions).
_SQLITE_TIMEOUT_S = 30.0


def get_db_path() -> Path:
    """Return the configured SQLite file path."""
    return Path(get_settings().sqlite_path)


def _configure_connection(conn: sqlite3.Connection) -> None:
    """Apply per-connection PRAGMAs for safety and concurrency."""
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")


def init_db() -> None:
    """Create schema (if needed) and enable WAL. Always closes the connection."""
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute(SCHEMA)
        # WAL once at init; subsequent connections inherit the journal mode on disk.
        conn.execute("PRAGMA journal_mode = WAL")


@contextmanager
def get_connection() -> Generator[sqlite3.Connection]:
    """Yield a configured SQLite connection; commit on success, always close."""
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=_SQLITE_TIMEOUT_S)
    _configure_connection(conn)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

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
    optional_context TEXT,
    questionnaire_started_at TEXT,
    questionnaire_completed_at TEXT,
    questionnaire_score INTEGER,
    questionnaire_item_count INTEGER,
    questionnaire_timing_summary TEXT
);

CREATE TABLE IF NOT EXISTS question_responses (
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    shown_at TEXT NOT NULL,
    answered_at TEXT NOT NULL,
    time_to_first_interaction_ms INTEGER NOT NULL,
    total_time_on_question_ms INTEGER NOT NULL,
    answer_change_count INTEGER NOT NULL,
    answer_value INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (session_id, question_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
"""

# Columns added after initial Phase 1 schema (idempotent migrate).
_SESSION_COLUMN_MIGRATIONS: tuple[tuple[str, str], ...] = (
    ("questionnaire_started_at", "TEXT"),
    ("questionnaire_completed_at", "TEXT"),
    ("questionnaire_score", "INTEGER"),
    ("questionnaire_item_count", "INTEGER"),
    ("questionnaire_timing_summary", "TEXT"),
)

# Wait for locks under concurrent writers.
_SQLITE_TIMEOUT_S = 30.0


def get_db_path() -> Path:
    """Return the configured SQLite file path."""
    return Path(get_settings().sqlite_path)


def _configure_connection(conn: sqlite3.Connection) -> None:
    """Apply per-connection PRAGMAs for safety and concurrency."""
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")


def _migrate_session_columns(conn: sqlite3.Connection) -> None:
    """Add Phase 2 columns to existing sessions tables if missing."""
    existing = {
        row[1] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()
    }
    for name, col_type in _SESSION_COLUMN_MIGRATIONS:
        if name not in existing:
            conn.execute(f"ALTER TABLE sessions ADD COLUMN {name} {col_type}")


def init_db() -> None:
    """Create schema (if needed) and enable WAL. Always closes the connection."""
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(SCHEMA)
        _migrate_session_columns(conn)
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

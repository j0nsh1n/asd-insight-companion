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


def get_db_path() -> Path:
    return Path(get_settings().sqlite_path)


def init_db() -> None:
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute(SCHEMA)
        conn.commit()


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

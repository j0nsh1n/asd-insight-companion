from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db import init_db
from app.main import app


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient]:
    db_path = tmp_path / "phase1-test.db"
    monkeypatch.setenv("SQLITE_PATH", str(db_path))
    get_settings.cache_clear()
    init_db()
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()

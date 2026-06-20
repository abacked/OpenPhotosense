from pathlib import Path

from fastapi.testclient import TestClient

from backend.config import settings
from backend.main import app


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_rejects_unsupported_upload(tmp_path: Path) -> None:
    settings.upload_dir = tmp_path
    with TestClient(app) as client:
        response = client.post("/api/v1/scans", files={"video": ("notes.txt", b"nope")})
    assert response.status_code == 415


def test_missing_job_returns_404(tmp_path: Path) -> None:
    settings.upload_dir = tmp_path
    with TestClient(app) as client:
        response = client.get("/api/v1/scans/unknown")
    assert response.status_code == 404


def test_missing_scan_cannot_create_fix(tmp_path: Path) -> None:
    settings.upload_dir = tmp_path
    with TestClient(app) as client:
        response = client.post("/api/v1/scans/unknown/fixes", json={"strategy": "smooth"})
    assert response.status_code == 404


def test_rejects_unknown_fix_strategy(tmp_path: Path) -> None:
    settings.upload_dir = tmp_path
    with TestClient(app) as client:
        response = client.post("/api/v1/scans/unknown/fixes", json={"strategy": "magic"})
    assert response.status_code == 422

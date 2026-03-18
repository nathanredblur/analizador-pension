"""Tests for the FastAPI extract-pdf endpoint."""

from pathlib import Path

from fastapi.testclient import TestClient

from src.api import app

_REPO_ROOT = Path(__file__).parent.parent
SAMPLE_PDF = _REPO_ROOT / "tests/fixtures/sample_colpensiones.pdf"

client = TestClient(app)


def test_extract_pdf_returns_data():
    pdf_bytes = SAMPLE_PDF.read_bytes()
    resp = client.post(
        "/api/extract-pdf",
        files={"file": ("sample.pdf", pdf_bytes, "application/pdf")},
        data={"password": ""},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body


def test_extract_pdf_invalid_file():
    resp = client.post(
        "/api/extract-pdf",
        files={"file": ("fake.pdf", b"not a pdf", "application/pdf")},
        data={"password": ""},
    )
    assert resp.status_code == 422


def test_extract_pdf_no_file():
    resp = client.post("/api/extract-pdf")
    assert resp.status_code == 422

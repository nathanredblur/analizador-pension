import os
import pandas as pd
import pytest
from pathlib import Path
from src.extractor import extract_semanas_df, ExtractionError

_REPO_ROOT = Path(__file__).parent.parent
REAL_PDF_PATH = _REPO_ROOT / "Semanas Cotizadas.pdf"
SAMPLE_PDF_PATH = _REPO_ROOT / "tests/fixtures/sample_colpensiones.pdf"

# Password for the real PDF (user's cedula). Not needed for the synthetic sample.
PDF_PASSWORD = os.environ.get("SEMANAS_PDF_PASSWORD", "")


def _active_pdf() -> tuple[Path, str]:
    """Return (path, password) for the best available PDF."""
    if REAL_PDF_PATH.exists():
        return REAL_PDF_PATH, PDF_PASSWORD
    return SAMPLE_PDF_PATH, ""


@pytest.fixture
def sample_df():
    """Load a PDF for integration tests.

    Priority:
    1. Real encrypted PDF (skipped if not present — never committed).
    2. Synthetic sample PDF with fictional data (always present in repo).
    """
    path, pwd = _active_pdf()
    if not path.exists():
        pytest.skip("No PDF available")
    return extract_semanas_df(path, password=pwd)


def test_extract_returns_dataframe(sample_df):
    assert isinstance(sample_df, pd.DataFrame)


def test_dataframe_has_required_columns(sample_df):
    required_cols = {"fecha_inicio", "fecha_fin", "empleador", "semanas", "salario"}
    assert required_cols.issubset(set(sample_df.columns)), (
        f"Missing columns: {required_cols - set(sample_df.columns)}"
    )


def test_dataframe_dates_are_datetime(sample_df):
    assert pd.api.types.is_datetime64_any_dtype(sample_df["fecha_inicio"])
    assert pd.api.types.is_datetime64_any_dtype(sample_df["fecha_fin"])


def test_dataframe_semanas_numeric(sample_df):
    assert pd.api.types.is_numeric_dtype(sample_df["semanas"])
    assert (sample_df["semanas"] >= 0).all()


def test_dataframe_not_empty(sample_df):
    assert len(sample_df) > 0


def test_total_semanas_reasonable(sample_df):
    assert sample_df["semanas"].sum() > 0


def test_wrong_password_raises_error():
    """An encrypted PDF with wrong password raises ExtractionError."""
    path, _ = _active_pdf()
    if not path.exists():
        pytest.skip("No PDF available")
    # The synthetic sample has no password; use real PDF only if present.
    if not REAL_PDF_PATH.exists():
        pytest.skip("Password test requires real encrypted PDF")
    with pytest.raises(ExtractionError):
        extract_semanas_df(REAL_PDF_PATH, password="wrong_password_xyz")


def test_invalid_file_raises_error(tmp_path):
    fake_pdf = tmp_path / "fake.pdf"
    fake_pdf.write_bytes(b"not a pdf")
    with pytest.raises(ExtractionError):
        extract_semanas_df(fake_pdf, password="")


# --- Export tests ---

def test_export_csv(sample_df, tmp_path):
    path, pwd = _active_pdf()
    out = tmp_path / "semanas.csv"
    extract_semanas_df(path, password=pwd, output_path=out)
    assert out.exists()
    loaded = pd.read_csv(out)
    assert len(loaded) == len(sample_df)
    assert "semanas" in loaded.columns


def test_export_json(sample_df, tmp_path):
    path, pwd = _active_pdf()
    out = tmp_path / "semanas.json"
    extract_semanas_df(path, password=pwd, output_path=out)
    assert out.exists()
    loaded = pd.read_json(out)
    assert len(loaded) == len(sample_df)


def test_export_xlsx(sample_df, tmp_path):
    path, pwd = _active_pdf()
    out = tmp_path / "semanas.xlsx"
    extract_semanas_df(path, password=pwd, output_path=out)
    assert out.exists()
    loaded = pd.read_excel(out)
    assert len(loaded) == len(sample_df)


def test_no_export_by_default(tmp_path):
    """Calling without output_path writes nothing to disk."""
    path, pwd = _active_pdf()
    if not path.exists():
        pytest.skip("No PDF available")
    before = set(tmp_path.iterdir())
    extract_semanas_df(path, password=pwd)
    assert set(tmp_path.iterdir()) == before

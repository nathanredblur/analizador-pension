import os
import pandas as pd
import pytest
from pathlib import Path
from src.extractor import extract_semanas_df, ExtractionError

PDF_PATH = Path("/Users/nathanredblur/my-projects/best-projects/semanas-cotizadas/Semanas Cotizadas.pdf")
# Password is the user's cedula (visible on first page of decrypted PDF)
PDF_PASSWORD = os.environ.get("SEMANAS_PDF_PASSWORD", "8177615")


@pytest.fixture
def sample_df():
    """Load the real PDF for integration tests."""
    if not PDF_PATH.exists():
        pytest.skip("Sample PDF not available")
    return extract_semanas_df(PDF_PATH, password=PDF_PASSWORD)


def test_extract_returns_dataframe(sample_df):
    """When given a valid PDF path and password, returns a DataFrame."""
    assert isinstance(sample_df, pd.DataFrame)


def test_dataframe_has_required_columns(sample_df):
    """DataFrame must have: fecha_inicio, fecha_fin, empleador, semanas, salario."""
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
    assert len(sample_df) > 0, "DataFrame should not be empty"


def test_total_semanas_reasonable(sample_df):
    """Total semanas should be a positive number > 0."""
    total = sample_df["semanas"].sum()
    assert total > 0


def test_wrong_password_raises_error():
    if not PDF_PATH.exists():
        pytest.skip("Sample PDF not available")
    with pytest.raises(ExtractionError):
        extract_semanas_df(PDF_PATH, password="wrong_password_xyz")


def test_invalid_file_raises_error(tmp_path):
    fake_pdf = tmp_path / "fake.pdf"
    fake_pdf.write_bytes(b"not a pdf")
    with pytest.raises(ExtractionError):
        extract_semanas_df(fake_pdf, password="")


# --- Export tests ---

def test_export_csv(sample_df, tmp_path):
    out = tmp_path / "semanas.csv"
    extract_semanas_df(PDF_PATH, password=PDF_PASSWORD, output_path=out)
    assert out.exists()
    loaded = pd.read_csv(out)
    assert len(loaded) == len(sample_df)
    assert "semanas" in loaded.columns


def test_export_json(sample_df, tmp_path):
    out = tmp_path / "semanas.json"
    extract_semanas_df(PDF_PATH, password=PDF_PASSWORD, output_path=out)
    assert out.exists()
    loaded = pd.read_json(out)
    assert len(loaded) == len(sample_df)


def test_export_xlsx(sample_df, tmp_path):
    out = tmp_path / "semanas.xlsx"
    extract_semanas_df(PDF_PATH, password=PDF_PASSWORD, output_path=out)
    assert out.exists()
    loaded = pd.read_excel(out)
    assert len(loaded) == len(sample_df)


def test_no_export_by_default(sample_df, tmp_path):
    """Calling without output_path writes nothing to disk."""
    before = set(tmp_path.iterdir())
    extract_semanas_df(PDF_PATH, password=PDF_PASSWORD)
    assert set(tmp_path.iterdir()) == before

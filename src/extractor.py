"""PDF extractor: Colpensiones 'Semanas Cotizadas' PDF → pandas DataFrame.

All processing is in-memory by default. Pass `output_path` to also save
the extracted data to CSV, Excel, or JSON.
"""

import io
from pathlib import Path
from typing import Literal

import fitz  # pymupdf
import pandas as pd
import pikepdf

_EXPECTED_COLS = frozenset({
    "[1]Identificación Aportante",
    "[2]Nombre o Razón Social",
    "[3]Desde",
    "[4]Hasta",
    "[5]Último Salario",
    "[6]Semanas",
    "[7]Lic",
    "[8]Sim",
    "[9]Total",
})


class ExtractionError(Exception):
    """Raised when PDF extraction fails for any reason."""


def _parse_cop(value: str) -> float:
    """Parse Colombian peso string like '$1.234.567' to float."""
    if not isinstance(value, str):
        return 0.0
    cleaned = value.replace("$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _parse_decimal(value: str) -> float:
    """Parse Colombian decimal string like '34,29' to float."""
    if not isinstance(value, str):
        return 0.0
    cleaned = value.replace(",", ".").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def extract_semanas_df(
    pdf_path: Path,
    password: str,
    output_path: Path | None = None,
    output_format: Literal["csv", "xlsx", "json"] = "csv",
) -> pd.DataFrame:
    """Extract contribution history from a Colpensiones PDF into a DataFrame.

    Args:
        pdf_path: Path to the encrypted Colpensiones PDF.
        password: User password to decrypt the PDF (typically the cedula).
        output_path: Optional path to save extracted data. If None, no file is
            written. Format is inferred from the extension, or set via output_format.
        output_format: Format to use when output_path has no recognizable extension.
            One of "csv" (default), "xlsx", or "json".

    Returns:
        DataFrame with columns:
        fecha_inicio, fecha_fin, empleador, semanas, salario, lic, sim, nit_aportante

    Raises:
        ExtractionError: If the password is wrong, the file is invalid, or no
            contribution table is found.
    """
    # Step 1: Decrypt PDF into memory using pikepdf
    try:
        with pikepdf.open(pdf_path, password=password) as pdf:
            buf = io.BytesIO()
            pdf.save(buf)
            buf.seek(0)
    except pikepdf.PasswordError as exc:
        raise ExtractionError(f"Invalid PDF password: {exc}") from exc
    except Exception as exc:
        raise ExtractionError(f"Failed to open PDF: {exc}") from exc

    # Step 2: Parse tables from decrypted buffer using pymupdf
    try:
        doc = fitz.open(stream=buf, filetype="pdf")
    except Exception as exc:
        raise ExtractionError(f"Failed to parse PDF content: {exc}") from exc

    all_dfs: list[pd.DataFrame] = []
    for page_num in range(doc.page_count):
        tabs = doc[page_num].find_tables()
        for tab in tabs.tables:
            df = tab.to_pandas()
            if set(df.columns) == _EXPECTED_COLS:
                all_dfs.append(df)

    if not all_dfs:
        raise ExtractionError("No contribution table found in PDF. Is this a valid Colpensiones report?")

    combined = pd.concat(all_dfs, ignore_index=True)

    # Step 3: Filter out summary/total rows
    id_col = "[1]Identificación Aportante"
    sem_col = "[6]Semanas"
    mask = (
        combined[id_col].notna()
        & ~combined[id_col].astype(str).str.strip().eq("")
        & ~combined[sem_col].astype(str).str.startswith("[10]")
        & ~combined[sem_col].astype(str).str.startswith("[11]")
    )
    combined = combined[mask].copy()

    # Step 4: Rename columns to clean names
    combined = combined.rename(columns={
        "[1]Identificación Aportante": "nit_aportante",
        "[2]Nombre o Razón Social": "empleador",
        "[3]Desde": "_fecha_inicio_raw",
        "[4]Hasta": "_fecha_fin_raw",
        "[5]Último Salario": "_salario_raw",
        "[6]Semanas": "_semanas_raw",
        "[7]Lic": "_lic_raw",
        "[8]Sim": "_sim_raw",
        "[9]Total": "_total_raw",
    })

    # Step 5: Parse and type-convert columns
    combined["fecha_inicio"] = pd.to_datetime(
        combined["_fecha_inicio_raw"], format="%d/%m/%Y", errors="coerce"
    )
    combined["fecha_fin"] = pd.to_datetime(
        combined["_fecha_fin_raw"], format="%d/%m/%Y", errors="coerce"
    )
    combined["salario"] = combined["_salario_raw"].apply(_parse_cop)
    combined["semanas"] = combined["_semanas_raw"].apply(_parse_decimal)
    combined["lic"] = combined["_lic_raw"].apply(_parse_decimal)
    combined["sim"] = combined["_sim_raw"].apply(_parse_decimal)

    result = combined[
        ["fecha_inicio", "fecha_fin", "empleador", "semanas", "salario", "lic", "sim", "nit_aportante"]
    ].reset_index(drop=True)

    if output_path is not None:
        _save_df(result, Path(output_path), output_format)

    return result


def _save_df(
    df: pd.DataFrame,
    output_path: Path,
    default_format: Literal["csv", "xlsx", "json"],
) -> None:
    """Write DataFrame to disk in the requested format."""
    fmt = output_path.suffix.lstrip(".").lower() or default_format
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "xlsx":
        df.to_excel(output_path, index=False)
    elif fmt == "json":
        df.to_json(output_path, orient="records", date_format="iso", indent=2)
    else:  # csv (default)
        df.to_csv(output_path, index=False)

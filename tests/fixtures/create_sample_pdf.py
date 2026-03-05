#!/usr/bin/env python3
"""Genera un PDF sintético de Colpensiones con datos ficticios para testing.

Produce: tests/fixtures/sample_colpensiones.pdf  (sin contraseña)
Uso:
    uv run python tests/fixtures/create_sample_pdf.py
"""

from pathlib import Path

import fitz  # pymupdf


# ─── Datos ficticios ──────────────────────────────────────────────────────────
ROWS = [
    # nit, nombre, desde, hasta, salario, semanas, lic, sim, total
    ("800111222", "EMPRESA ALFA S.A.S", "02/01/2010", "31/12/2011", "$1.200.000", "104,00", "0,00", "0,00", "104,00"),
    ("900222333", "EMPLEADOS BETA LTDA", "01/03/2012", "28/02/2014", "$1.600.000", "104,00", "0,00", "0,00", "104,00"),
    ("800333444", "SERVICIOS GAMA S.A", "01/05/2014", "30/04/2016", "$2.200.000", "104,00", "0,00", "0,00", "104,00"),
    ("900444555", "CONSULTORA DELTA SAS", "01/07/2016", "31/03/2017", "$2.800.000", "39,29", "0,00", "0,00", "39,29"),
    ("800555666", "CORPORACIÓN ÉPSILON", "01/06/2017", "31/12/2018", "$3.200.000", "78,00", "0,00", "0,00", "78,00"),
    ("900666777", "GRUPO ZETA S.A.S", "01/02/2019", "28/02/2021", "$4.000.000", "104,00", "2,00", "0,00", "106,00"),
    ("800777888", "INNOVACIÓN ETA LTDA", "01/04/2021", "31/12/2022", "$5.500.000", "91,00", "0,00", "0,00", "91,00"),
    ("900888999", "TECH THETA S.A.S", "01/03/2023", "31/12/2024", "$7.200.000", "91,00", "0,00", "0,00", "91,00"),
]

HEADERS = [
    "[1]Identificación Aportante",
    "[2]Nombre o Razón Social",
    "[3]Desde",
    "[4]Hasta",
    "[5]Último Salario",
    "[6]Semanas",
    "[7]Lic",
    "[8]Sim",
    "[9]Total",
]

# Column widths in points — page is 1200pt wide, margins 20 each side → 1160 usable
COL_WIDTHS = [95, 210, 70, 70, 95, 65, 45, 45, 55]  # total = 750
HEADER_H = 18
ROW_H = 18
MARGIN_X = 20
MARGIN_Y = 60
FONT_SIZE_HEADER = 7
FONT_SIZE_DATA = 7


def _col_x(col_idx: int) -> float:
    """Left x of column col_idx."""
    return MARGIN_X + sum(COL_WIDTHS[:col_idx])


def _draw_table(page: fitz.Page) -> None:
    n_rows = len(ROWS) + 1  # +1 for header
    total_w = sum(COL_WIDTHS)
    total_h = HEADER_H + ROW_H * len(ROWS)

    x0 = MARGIN_X
    y0 = MARGIN_Y
    x1 = x0 + total_w
    y1 = y0 + total_h

    shape = page.new_shape()

    # Horizontal lines
    y = y0
    for r in range(n_rows + 1):
        shape.draw_line((x0, y), (x1, y))
        y += HEADER_H if r == 0 else ROW_H

    # Vertical lines
    for c in range(len(COL_WIDTHS) + 1):
        x = _col_x(c)
        shape.draw_line((x, y0), (x, y1))

    shape.finish(width=0.5, color=(0, 0, 0))
    shape.commit()

    # Header text (single line per cell to match _EXPECTED_COLS exactly)
    for c, hdr in enumerate(HEADERS):
        cx = _col_x(c) + 2
        cy = y0 + 12
        page.insert_text(
            (cx, cy),
            hdr,
            fontsize=FONT_SIZE_HEADER,
            fontname="helv",
            color=(0, 0, 0),
        )

    # Data rows
    for r, row in enumerate(ROWS):
        row_y = MARGIN_Y + HEADER_H + r * ROW_H + 12
        for c, cell in enumerate(row):
            cx = _col_x(c) + 2
            page.insert_text(
                (cx, row_y),
                cell,
                fontsize=FONT_SIZE_DATA,
                fontname="helv",
                color=(0, 0, 0),
            )


def create_sample_pdf(output_path: Path) -> None:
    """Crea el PDF sintético en output_path."""
    doc = fitz.open()
    # Wide page to fit all column headers on one line
    page = doc.new_page(width=1200, height=595)

    # Title
    page.insert_text(
        (MARGIN_X, MARGIN_Y - 30),
        "COLPENSIONES — Semanas Cotizadas (DATOS FICTICIOS / MUESTRA)",
        fontsize=9,
        fontname="helv",
        color=(0.3, 0.3, 0.3),
    )
    page.insert_text(
        (MARGIN_X, MARGIN_Y - 18),
        "Afiliado: Juan Ejemplo Ficticio  |  Cédula: 0000000  |  Generado: 01/01/2025",
        fontsize=8,
        fontname="helv",
        color=(0.4, 0.4, 0.4),
    )

    _draw_table(page)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_path))
    print(f"✓ PDF de muestra generado: {output_path}")
    print(f"  {len(ROWS)} filas, {sum(float(r[5].replace(',', '.')) for r in ROWS):.0f} semanas totales")


if __name__ == "__main__":
    here = Path(__file__).parent
    create_sample_pdf(here / "sample_colpensiones.pdf")

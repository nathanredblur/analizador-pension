"""Tests E2E con Playwright.

Arrancan el servidor Dash en un hilo de fondo, abren Chromium headless,
suben el PDF de prueba y verifican el flujo completo de la aplicación.
"""

import os
import threading
import time
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).parent.parent
_REAL_PDF = _REPO_ROOT / "Semanas Cotizadas.pdf"
_SAMPLE_PDF = _REPO_ROOT / "tests/fixtures/sample_colpensiones.pdf"

# Use real PDF if present (local dev), otherwise fall back to synthetic sample.
PDF_PATH = _REAL_PDF if _REAL_PDF.exists() else _SAMPLE_PDF
PDF_PASSWORD = os.environ.get("SEMANAS_PDF_PASSWORD", "") if _REAL_PDF.exists() else ""
BASE_URL = "http://localhost:18050"


@pytest.fixture(scope="module")
def live_server():
    """Arranca el servidor Dash en un puerto dedicado para los tests E2E."""
    from src.app import app

    thread = threading.Thread(
        target=lambda: app.run(host="localhost", port=18050, debug=False),
        daemon=True,
    )
    thread.start()
    time.sleep(2)
    yield BASE_URL


def _esperar_dashboard(page, timeout: int = 60_000) -> None:
    """Espera a que fase-b sea visible (dashboard cargado tras procesar PDF)."""
    page.wait_for_function(
        "() => document.getElementById('fase-b').style.display === 'block'",
        timeout=timeout,
    )


def _cargar_pdf_y_analizar(page, base_url: str) -> None:
    """Helper: abre la app, sube el PDF y hace clic en Analizar."""
    page.goto(base_url)
    page.wait_for_selector("#upload-pdf", timeout=10_000)

    # dcc.Upload renderiza un <input type="file"> oculto dentro del contenedor.
    # set_input_files dispara el FileReader de Dash (async, puede tardar ~1s).
    page.locator("#upload-pdf input[type='file']").set_input_files(str(PDF_PATH))

    # Esperar confirmación de que el upload fue procesado (el callback pone "✓ <nombre>")
    page.wait_for_function(
        "() => document.getElementById('upload-filename').textContent.trim() !== ''",
        timeout=30_000,
    )
    # Esperar a que Dash propague el store-upload-pdf antes del click
    page.wait_for_load_state("networkidle", timeout=15_000)

    page.fill("#input-nombre", "Test Usuario")
    page.fill("#input-fecha-nac", "1985-06-15")
    page.fill("#input-password", PDF_PASSWORD)

    # page.click() simula un clic real del usuario en el botón Dash.
    page.click("#btn-analizar")


@pytest.mark.skipif(not PDF_PATH.exists(), reason="PDF de prueba no disponible")
def test_fase_a_muestra_formulario(live_server, page):
    """Al abrir la app debe mostrarse el formulario de carga."""
    page.goto(live_server)
    page.wait_for_selector("#btn-analizar", timeout=10_000)
    assert page.locator("#btn-analizar").is_visible()
    # fase-b debe estar oculta al inicio
    display = page.eval_on_selector("#fase-b", "el => el.style.display")
    assert display == "none"


@pytest.mark.skipif(not PDF_PATH.exists(), reason="PDF de prueba no disponible")
def test_flujo_completo_con_pdf(live_server, page):
    """Sube el PDF real, llena el form y verifica que el dashboard aparezca."""
    _cargar_pdf_y_analizar(page, live_server)
    _esperar_dashboard(page)

    assert page.locator("#fase-b").is_visible()
    assert page.locator("#btn-salir").is_visible()
    assert "Pensión Colombiana" in page.locator(".navbar-brand").text_content()


@pytest.mark.skipif(not PDF_PATH.exists(), reason="PDF de prueba no disponible")
def test_boton_salir_regresa_al_formulario(live_server, page):
    """Al hacer clic en Salir desde el dashboard vuelve al formulario."""
    _cargar_pdf_y_analizar(page, live_server)
    _esperar_dashboard(page)

    page.click("#btn-salir")

    page.wait_for_selector("#btn-analizar", timeout=10_000)
    assert page.locator("#btn-analizar").is_visible()
    display = page.eval_on_selector("#fase-b", "el => el.style.display")
    assert display == "none"


@pytest.mark.skipif(not PDF_PATH.exists(), reason="PDF de prueba no disponible")
def test_dashboard_secciones_en_dom(live_server, page):
    """Tras analizar el PDF las secciones principales deben estar en el DOM."""
    _cargar_pdf_y_analizar(page, live_server)
    _esperar_dashboard(page)

    for section_id in ["seccion-resumen", "seccion-timeline", "seccion-proyeccion"]:
        assert page.locator(f"#{section_id}").count() == 1, (
            f"Sección #{section_id} no encontrada en el DOM"
        )

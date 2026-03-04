"""Tests de integración: pipeline completo PDF → normativa → calculadoras."""

import os
from datetime import date
from pathlib import Path

import pytest

from src.extractor import extract_semanas_df
from src.normativa import (
    calcular_ibl,
    calcular_mesada,
    califica_transicion_2381,
    fecha_estimada_pension,
)
from src.calculadoras import (
    calcular_canasta_familiar,
    calcular_smmlv_equivalente,
    proyectar_mesada_real,
)

PDF_PATH = Path("/Users/nathanredblur/my-projects/best-projects/semanas-cotizadas/Semanas Cotizadas.pdf")
PDF_PASSWORD = os.environ.get("SEMANAS_PDF_PASSWORD", "8177615")


@pytest.fixture(scope="module")
def df_real():
    if not PDF_PATH.exists():
        pytest.skip("Sample PDF not available")
    return extract_semanas_df(PDF_PATH, password=PDF_PASSWORD)


class TestFullPipeline:
    def test_pipeline_produce_df_valido(self, df_real):
        assert len(df_real) > 0
        assert df_real["semanas"].sum() > 0

    def test_pipeline_semanas_totales(self, df_real):
        total = df_real["semanas"].sum()
        # PDF real: ~759 semanas
        assert 500 < total < 2000

    def test_pipeline_calcula_ibl(self, df_real):
        ibl = calcular_ibl(df_real)
        assert ibl > 1_000_000  # IBL > 1 SMMLV mínimo

    def test_pipeline_calcula_mesada(self, df_real):
        ibl = calcular_ibl(df_real)
        mesada_min, mesada_max = calcular_mesada(ibl)
        assert mesada_min < mesada_max
        assert mesada_min > 0
        assert mesada_max == pytest.approx(ibl * 0.80)

    def test_pipeline_fecha_pension_hombre(self, df_real):
        resultado = fecha_estimada_pension(
            df_real, sexo="M", fecha_nacimiento=date(1984, 6, 28), n_hijos=0
        )
        assert "fecha_pension" in resultado
        assert resultado["fecha_pension"] >= date.today()
        assert resultado["semanas_cotizadas"] == pytest.approx(df_real["semanas"].sum())

    def test_pipeline_transicion_2381(self, df_real):
        # Usuario del PDF real: hombre con ~759 semanas al 30/jun/2025 → califica (≥900? No)
        result = califica_transicion_2381(df_real, sexo="M")
        assert "califica" in result
        assert "semanas_al_corte" in result
        assert result["semanas_al_corte"] > 0

    def test_pipeline_smmlv_conversion(self, df_real):
        ibl = calcular_ibl(df_real)
        smmlv = calcular_smmlv_equivalente(ibl, anio=2025)
        assert smmlv > 0

    def test_pipeline_proyeccion_inflacion(self, df_real):
        ibl = calcular_ibl(df_real)
        mesada_min, _ = calcular_mesada(ibl)
        mesada_futura = proyectar_mesada_real(mesada_min, anios=15, inflacion=0.05)
        assert mesada_futura > mesada_min

    def test_pipeline_canasta_cubre_parcial(self, df_real):
        ibl = calcular_ibl(df_real)
        mesada_min, _ = calcular_mesada(ibl)
        canasta = calcular_canasta_familiar(estrato=2)
        # Verificar que la estructura es correcta
        assert canasta["total"] > 0
        assert "arriendo" in canasta


class TestDashApp:
    def test_app_importa_sin_error(self):
        import dash._callback as dcb
        dcb.GLOBAL_CALLBACK_MAP.clear()
        from src.app import app
        assert app is not None

    def test_server_responde_200(self):
        import dash._callback as dcb
        dcb.GLOBAL_CALLBACK_MAP.clear()
        from src.app import app
        with app.server.test_client() as c:
            resp = c.get("/")
            assert resp.status_code == 200

    def test_callbacks_registrados(self):
        import dash._callback as dcb
        dcb.GLOBAL_CALLBACK_MAP.clear()
        from src.app import app
        with app.server.test_client() as c:
            deps = c.get("/_dash-dependencies").get_json()
            # Esperamos al menos 15 callbacks (todas las secciones)
            assert len(deps) >= 15

    def test_layout_disponible(self):
        import dash._callback as dcb
        dcb.GLOBAL_CALLBACK_MAP.clear()
        from src.app import app
        with app.server.test_client() as c:
            resp = c.get("/_dash-layout")
            assert resp.status_code == 200

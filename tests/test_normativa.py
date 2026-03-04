from datetime import date
import pandas as pd
import pytest
from src.normativa import (
    calcular_semanas_al_corte,
    semanas_requeridas,
    semanas_faltantes,
    calcular_ibl,
    calcular_mesada,
    fecha_estimada_pension,
    califica_transicion_2381,
    califica_traslado_regimen,
    calcular_gaps,
    descuento_semanas_por_hijos,
)


@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "fecha_inicio": pd.to_datetime(["2010-01-01", "2012-06-01", "2015-01-01"]),
        "fecha_fin":    pd.to_datetime(["2012-05-31", "2014-12-31", "2025-12-31"]),
        "empleador":    ["Empresa A", "Empresa B", "Empresa C"],
        "semanas":      [120.0, 130.0, 560.0],
        "salario":      [1_500_000.0, 2_000_000.0, 4_000_000.0],
        "lic":          [0.0, 0.0, 0.0],
        "sim":          [0.0, 0.0, 0.0],
    })


def test_semanas_al_corte_suma_todas(sample_df):
    corte = date(2026, 1, 1)
    total = calcular_semanas_al_corte(sample_df, corte)
    assert total == pytest.approx(810.0)


def test_semanas_al_corte_filtra_por_fecha(sample_df):
    # Solo la primera fila cae antes de 2011
    corte = date(2011, 1, 1)
    total = calcular_semanas_al_corte(sample_df, corte)
    assert total == pytest.approx(120.0)


def test_semanas_requeridas_hombre():
    assert semanas_requeridas("M", anio=2026) == 1300


def test_semanas_requeridas_mujer_gradual():
    assert semanas_requeridas("F", anio=2026) == 1250
    assert semanas_requeridas("F", anio=2036) == 750
    assert semanas_requeridas("F", anio=2025) == 1300


def test_semanas_requeridas_mujer_post_2036():
    # Años posteriores a 2036 usan el mínimo de 750
    assert semanas_requeridas("F", anio=2040) == 750


def test_descuento_hijos_basico():
    base = semanas_requeridas("F", anio=2026)  # 1250
    ajustado = descuento_semanas_por_hijos(base, n_hijos=3)
    assert ajustado == 1100  # 1250 - 150


def test_descuento_hijos_cap():
    base = semanas_requeridas("F", anio=2026)
    ajustado_3 = descuento_semanas_por_hijos(base, n_hijos=3)
    ajustado_5 = descuento_semanas_por_hijos(base, n_hijos=5)
    assert ajustado_3 == ajustado_5  # cap at 3


def test_descuento_hijos_cero():
    base = 1250.0
    assert descuento_semanas_por_hijos(base, n_hijos=0) == 1250.0


def test_semanas_faltantes(sample_df):
    faltantes = semanas_faltantes(sample_df, sexo="M", n_hijos=0, anio=2026)
    assert faltantes == pytest.approx(1300.0 - 810.0)


def test_semanas_faltantes_mujer_con_hijos(sample_df):
    # F, 2026: 1250 requeridas - 150 por 3 hijos = 1100. Tiene 810, faltan 290
    faltantes = semanas_faltantes(sample_df, sexo="F", n_hijos=3, anio=2026)
    assert faltantes == pytest.approx(1100.0 - 810.0)


def test_semanas_faltantes_no_negativo():
    df = pd.DataFrame({
        "fecha_inicio": pd.to_datetime(["2000-01-01"]),
        "fecha_fin": pd.to_datetime(["2025-12-31"]),
        "empleador": ["X"],
        "semanas": [2000.0],
        "salario": [5_000_000.0],
        "lic": [0.0], "sim": [0.0],
    })
    faltantes = semanas_faltantes(df, sexo="M", n_hijos=0, anio=2026)
    assert faltantes == 0.0  # ya cumplió


def test_calcular_ibl_devuelve_float(sample_df):
    ibl = calcular_ibl(sample_df)
    assert ibl > 0
    assert isinstance(ibl, float)


def test_calcular_ibl_ponderado(sample_df):
    # IBL = promedio ponderado por semanas de los últimos 10 años
    # Empresa C tiene más semanas y mayor salario → IBL debe acercarse a 4M
    ibl = calcular_ibl(sample_df)
    assert ibl > 3_000_000.0


def test_calcular_mesada_rango(sample_df):
    ibl = calcular_ibl(sample_df)
    mesada_min, mesada_max = calcular_mesada(ibl)
    assert mesada_min == pytest.approx(ibl * 0.65)
    assert mesada_max == pytest.approx(ibl * 0.80)


def test_califica_transicion_mujer_si(sample_df):
    # 810 semanas al corte → mujer necesita 750 → califica
    result = califica_transicion_2381(sample_df, sexo="F")
    assert result["califica"] is True
    assert result["semanas_al_corte"] == pytest.approx(810.0)


def test_califica_transicion_hombre_no():
    df = pd.DataFrame({
        "fecha_inicio": pd.to_datetime(["2020-01-01"]),
        "fecha_fin":    pd.to_datetime(["2025-01-01"]),
        "empleador":    ["Empresa A"],
        "semanas":      [200.0],
        "salario":      [2_000_000.0],
        "lic": [0.0], "sim": [0.0],
    })
    result = califica_transicion_2381(df, sexo="M")
    assert result["califica"] is False


def test_califica_transicion_resultado_contiene_claves(sample_df):
    result = califica_transicion_2381(sample_df, sexo="M")
    assert "califica" in result
    assert "semanas_al_corte" in result
    assert "umbral" in result
    assert "semanas_faltantes_umbral" in result


def test_califica_traslado_dentro_de_plazo():
    # Mujer de 50 años con 810 semanas → califica (≥47 años y ≥750 sem)
    result = califica_traslado_regimen(
        semanas=810.0,
        sexo="F",
        fecha_nacimiento=date(1975, 1, 1),
        fecha_calculo=date(2025, 6, 1),
    )
    assert result["califica"] is True


def test_califica_traslado_fuera_de_plazo():
    result = califica_traslado_regimen(
        semanas=810.0,
        sexo="F",
        fecha_nacimiento=date(1975, 1, 1),
        fecha_calculo=date(2027, 1, 1),  # después del plazo
    )
    assert result["califica"] is False


def test_calcular_gaps_detecta_gap(sample_df):
    gaps = calcular_gaps(sample_df)
    # Entre Empresa A (fin 2012-05-31) y Empresa B (inicio 2012-06-01) no hay gap
    # Entre Empresa B (fin 2014-12-31) y Empresa C (inicio 2015-01-01) tampoco
    # Pero en sample_df hay un gap 2012-06-01 vs 2012-05-31+1 → casi sin gap
    assert isinstance(gaps, list)


def test_calcular_gaps_con_gap_real():
    df = pd.DataFrame({
        "fecha_inicio": pd.to_datetime(["2010-01-01", "2015-01-01"]),
        "fecha_fin":    pd.to_datetime(["2012-12-31", "2020-12-31"]),
        "empleador":    ["Empresa A", "Empresa B"],
        "semanas":      [100.0, 200.0],
        "salario":      [2_000_000.0, 3_000_000.0],
        "lic": [0.0, 0.0], "sim": [0.0, 0.0],
    })
    gaps = calcular_gaps(df)
    assert len(gaps) >= 1
    assert "duracion_semanas" in gaps[0]
    assert "fecha_inicio" in gaps[0]
    assert "fecha_fin" in gaps[0]
    # Gap de 2013-01-01 a 2014-12-31 ≈ 104 semanas
    assert gaps[0]["duracion_semanas"] > 50


def test_fecha_estimada_pension(sample_df):
    fecha_nac = date(1985, 3, 15)
    resultado = fecha_estimada_pension(
        sample_df, sexo="M", fecha_nacimiento=fecha_nac, n_hijos=0
    )
    assert "fecha_pension" in resultado
    assert "semanas_cotizadas" in resultado
    assert resultado["semanas_cotizadas"] == pytest.approx(810.0)
    assert "anios_restantes" in resultado

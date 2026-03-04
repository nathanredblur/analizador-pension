from src.constants import (
    SEMANAS_REQUERIDAS_HOMBRE,
    EDAD_PENSION_HOMBRE,
    EDAD_PENSION_MUJER,
    SEMANAS_REQUERIDAS_MUJER_POR_ANIO,
    DESCUENTO_SEMANAS_POR_HIJO,
    MAX_HIJOS_DESCUENTO,
    TASA_COTIZACION,
    TASA_REEMPLAZO_MIN,
    TASA_REEMPLAZO_MAX,
    TRANSICION_2381_SEMANAS_MUJER,
    TRANSICION_2381_SEMANAS_HOMBRE,
    SMMLV_HISTORICO,
)


def test_semanas_hombre():
    assert SEMANAS_REQUERIDAS_HOMBRE == 1300


def test_edades_pension():
    assert EDAD_PENSION_HOMBRE == 62
    assert EDAD_PENSION_MUJER == 57


def test_semanas_mujer_gradual():
    assert SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2025] == 1300
    assert SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2026] == 1250
    assert SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2036] == 750
    # Reducción de 50 sem/año
    assert SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2027] == 1200


def test_descuento_hijos():
    assert DESCUENTO_SEMANAS_POR_HIJO == 50
    assert MAX_HIJOS_DESCUENTO == 3


def test_tasas():
    assert TASA_COTIZACION == 0.16
    assert TASA_REEMPLAZO_MIN == 0.65
    assert TASA_REEMPLAZO_MAX == 0.80


def test_transicion_2381():
    assert TRANSICION_2381_SEMANAS_MUJER == 750
    assert TRANSICION_2381_SEMANAS_HOMBRE == 900


def test_smmlv_historico_completo():
    assert 2000 in SMMLV_HISTORICO
    assert 2025 in SMMLV_HISTORICO
    assert SMMLV_HISTORICO[2025] == 1_423_500
    # Verify all years 2000-2025 are present
    for year in range(2000, 2026):
        assert year in SMMLV_HISTORICO, f"Missing SMMLV for {year}"

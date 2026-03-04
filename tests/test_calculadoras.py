import pytest
from src.calculadoras import (
    proyectar_mesada_real,
    calcular_ahorro_mensual_necesario,
    calcular_crecimiento_capital,
    calcular_canasta_familiar,
    calcular_smmlv_equivalente,
)


def test_proyectar_mesada_real():
    mesada_hoy = 2_000_000.0
    anios = 10
    inflacion = 0.05
    mesada_futura = proyectar_mesada_real(mesada_hoy, anios, inflacion)
    expected = mesada_hoy * (1 + inflacion) ** anios
    assert mesada_futura == pytest.approx(expected)


def test_proyectar_mesada_cero_inflacion():
    mesada = 2_000_000.0
    assert proyectar_mesada_real(mesada, 10, 0.0) == pytest.approx(mesada)


def test_proyectar_mesada_anios_cero():
    mesada = 2_000_000.0
    assert proyectar_mesada_real(mesada, 0, 0.05) == pytest.approx(mesada)


def test_calcular_ahorro_mensual_positivo():
    capital_objetivo = 100_000_000.0
    tasa_anual = 0.10
    anios = 10
    cuota = calcular_ahorro_mensual_necesario(capital_objetivo, tasa_anual, anios)
    assert cuota > 0


def test_calcular_ahorro_mensual_menor_que_total():
    capital_objetivo = 100_000_000.0
    cuota = calcular_ahorro_mensual_necesario(capital_objetivo, 0.10, 10)
    assert cuota < capital_objetivo


def test_calcular_ahorro_mensual_mayor_tasa_menor_cuota():
    capital = 100_000_000.0
    anios = 10
    cuota_baja = calcular_ahorro_mensual_necesario(capital, 0.05, anios)
    cuota_alta = calcular_ahorro_mensual_necesario(capital, 0.15, anios)
    assert cuota_alta < cuota_baja  # más interés → menos ahorro necesario


def test_calcular_crecimiento_capital_longitud():
    result = calcular_crecimiento_capital(500_000.0, 0.10, 5)
    assert len(result) == 6  # año 0 al 5 inclusive


def test_calcular_crecimiento_capital_empieza_en_cero():
    result = calcular_crecimiento_capital(500_000.0, 0.10, 5)
    assert result[0] == pytest.approx(0.0)


def test_calcular_crecimiento_capital_crece():
    result = calcular_crecimiento_capital(500_000.0, 0.10, 5)
    # Cada año el capital debe ser mayor que el anterior
    for i in range(1, len(result)):
        assert result[i] > result[i - 1]


def test_calcular_crecimiento_capital_supera_aportaciones():
    cuota_mensual = 500_000.0
    anios = 5
    result = calcular_crecimiento_capital(cuota_mensual, 0.10, anios)
    aportaciones_totales = cuota_mensual * 12 * anios
    assert result[-1] > aportaciones_totales  # interés compuesto añade valor


def test_calcular_canasta_estrato_2():
    canasta = calcular_canasta_familiar(estrato=2)
    assert "arriendo" in canasta
    assert "mercado" in canasta
    assert "servicios" in canasta
    assert "transporte" in canasta
    assert "salud" in canasta
    assert "total" in canasta
    assert canasta["total"] > 0


def test_calcular_canasta_total_es_suma():
    canasta = calcular_canasta_familiar(estrato=2)
    componentes = canasta["arriendo"] + canasta["mercado"] + canasta["servicios"] + \
                  canasta["transporte"] + canasta["salud"]
    assert canasta["total"] == pytest.approx(componentes)


def test_calcular_canasta_estrato_4_mayor_que_2():
    canasta_2 = calcular_canasta_familiar(estrato=2)
    canasta_4 = calcular_canasta_familiar(estrato=4)
    assert canasta_4["total"] > canasta_2["total"]  # arriendo estrato 4 > estrato 2


def test_calcular_smmlv_equivalente_dos_salarios():
    smmlv_2025 = 1_423_500
    resultado = calcular_smmlv_equivalente(smmlv_2025 * 2, anio=2025)
    assert resultado == pytest.approx(2.0, rel=0.01)


def test_calcular_smmlv_equivalente_un_salario():
    smmlv_2025 = 1_423_500
    resultado = calcular_smmlv_equivalente(smmlv_2025, anio=2025)
    assert resultado == pytest.approx(1.0, rel=0.01)


def test_calcular_smmlv_anio_desconocido():
    # Para años sin dato usa 2025 como fallback
    resultado = calcular_smmlv_equivalente(1_423_500, anio=2050)
    assert resultado > 0

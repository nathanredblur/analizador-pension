"""Calculadoras financieras: proyecciones, CDT, inflación, canasta familiar."""

from src.constants import (
    CANASTA_ARRIENDO_ESTRATO_2,
    CANASTA_ARRIENDO_ESTRATO_3,
    CANASTA_ARRIENDO_ESTRATO_4,
    CANASTA_MERCADO_FAMILIAR,
    CANASTA_SALUD_MEDICAMENTOS,
    CANASTA_SERVICIOS_PUBLICOS,
    CANASTA_TRANSPORTE,
    SMMLV_HISTORICO,
)

_SMMLV_FALLBACK = SMMLV_HISTORICO[2025]


# ─── Proyección pensional ─────────────────────────────────────────────────────

def proyectar_mesada_real(mesada_hoy: float, anios: int, inflacion: float) -> float:
    """Valor nominal de la mesada al momento de jubilarse, ajustado por inflación.

    Args:
        mesada_hoy: Mesada estimada en pesos de hoy.
        anios: Años hasta la jubilación.
        inflacion: Tasa de inflación anual (ej. 0.05 para 5%).
    """
    return mesada_hoy * (1 + inflacion) ** anios


# ─── CDT / Ahorro complementario ─────────────────────────────────────────────

def calcular_ahorro_mensual_necesario(
    capital_objetivo: float,
    tasa_anual: float,
    anios: int,
) -> float:
    """Cuota mensual necesaria para acumular capital_objetivo con un CDT.

    Usa la fórmula de pago de anualidad (PMT):
        C = FV × r / ((1 + r)^n − 1)

    Args:
        capital_objetivo: Capital total que se desea acumular (COP).
        tasa_anual: Tasa efectiva anual del CDT (ej. 0.10 para 10%).
        anios: Horizonte de ahorro en años.
    """
    r = tasa_anual / 12
    n = anios * 12
    if r == 0:
        return capital_objetivo / n
    return capital_objetivo * r / ((1 + r) ** n - 1)


def calcular_crecimiento_capital(
    cuota_mensual: float,
    tasa_anual: float,
    anios: int,
) -> list[float]:
    """Capital acumulado al final de cada año con aportes mensuales a CDT.

    Retorna lista de longitud (anios + 1), donde el índice 0 = año 0 (capital = 0).

    Args:
        cuota_mensual: Aporte mensual constante (COP).
        tasa_anual: Tasa efectiva anual (ej. 0.10 para 10%).
        anios: Número de años de ahorro.
    """
    r_mensual = tasa_anual / 12
    capital = 0.0
    resultado = [0.0]

    for anio in range(1, anios + 1):
        for _ in range(12):
            capital = capital * (1 + r_mensual) + cuota_mensual
        resultado.append(round(capital, 2))

    return resultado


# ─── Canasta familiar ─────────────────────────────────────────────────────────

_ARRIENDOS = {
    2: CANASTA_ARRIENDO_ESTRATO_2,
    3: CANASTA_ARRIENDO_ESTRATO_3,
    4: CANASTA_ARRIENDO_ESTRATO_4,
}


def calcular_canasta_familiar(estrato: int) -> dict[str, float]:
    """Desglose de gastos mensuales de referencia por estrato (COP, valores 2025).

    Args:
        estrato: Estrato socioeconómico (2, 3 o 4). Usa estrato 2 si no reconoce.

    Returns:
        Dict con keys: arriendo, mercado, servicios, transporte, salud, total.
    """
    arriendo = float(_ARRIENDOS.get(estrato, CANASTA_ARRIENDO_ESTRATO_2))
    mercado = float(CANASTA_MERCADO_FAMILIAR)
    servicios = float(CANASTA_SERVICIOS_PUBLICOS)
    transporte = float(CANASTA_TRANSPORTE)
    salud = float(CANASTA_SALUD_MEDICAMENTOS)
    total = arriendo + mercado + servicios + transporte + salud
    return {
        "arriendo": arriendo,
        "mercado": mercado,
        "servicios": servicios,
        "transporte": transporte,
        "salud": salud,
        "total": total,
    }


# ─── Conversión SMMLV ─────────────────────────────────────────────────────────

def calcular_smmlv_equivalente(monto: float, anio: int) -> float:
    """Convierte un monto en COP a número de SMMLV para un año dado.

    Args:
        monto: Valor en pesos colombianos.
        anio: Año de referencia para el SMMLV.
    """
    smmlv = float(SMMLV_HISTORICO.get(anio, _SMMLV_FALLBACK))
    return monto / smmlv

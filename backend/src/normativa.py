"""Lógica pensional colombiana: Ley 100/797/2381.

Todas las funciones son puras — reciben DataFrames y retornan valores.
Sin efectos secundarios ni escritura a disco.
"""

from datetime import date, timedelta
from typing import Any

import pandas as pd

from src.constants import (
    DESCUENTO_SEMANAS_POR_HIJO,
    EDAD_PENSION_HOMBRE,
    EDAD_PENSION_MUJER,
    INCREMENTO_SEMANAS_TASA,
    INCREMENTO_TASA_POR_BLOQUE,
    MAX_HIJOS_DESCUENTO,
    SEMANAS_BASE_TASA,
    SEMANAS_REQUERIDAS_HOMBRE,
    SEMANAS_REQUERIDAS_MUJER_POR_ANIO,
    TASA_REEMPLAZO_MAX,
    TASA_REEMPLAZO_MIN,
    TRASLADO_FECHA_LIMITE,
    TRASLADO_HOMBRE_EDAD_MIN,
    TRASLADO_MUJER_EDAD_MIN,
    TRANSICION_2381_FECHA_CORTE_SEMANAS,
    TRANSICION_2381_SEMANAS_HOMBRE,
    TRANSICION_2381_SEMANAS_MUJER,
)

_CORTE_2381 = date.fromisoformat(TRANSICION_2381_FECHA_CORTE_SEMANAS)
_TRASLADO_LIMITE = date.fromisoformat(TRASLADO_FECHA_LIMITE)


# ─── Semanas ──────────────────────────────────────────────────────────────────

def calcular_semanas_al_corte(df: pd.DataFrame, corte: date) -> float:
    """Suma de semanas cotizadas en períodos que inician antes de la fecha de corte."""
    corte_ts = pd.Timestamp(corte)
    mask = df["fecha_inicio"] < corte_ts
    return float(df.loc[mask, "semanas"].sum())


def semanas_requeridas(sexo: str, anio: int) -> int:
    """Semanas requeridas para pensionarse según sexo y año de jubilación.

    Args:
        sexo: "M" para hombre, "F" para mujer.
        anio: Año en que se proyecta alcanzar la pensión.
    """
    if sexo == "M":
        return SEMANAS_REQUERIDAS_HOMBRE
    # Mujer: tabla gradual 2025-2036, mínimo 750 después
    clamped = max(2025, min(anio, 2036))
    return SEMANAS_REQUERIDAS_MUJER_POR_ANIO[clamped]


def descuento_semanas_por_hijos(base_semanas: float, n_hijos: int) -> float:
    """Semanas requeridas ajustadas por descuento de hijos (solo mujeres, Ley 2381).

    Descuento: 50 semanas por hijo, máximo 3 hijos (150 semanas).
    """
    descuento = min(n_hijos, MAX_HIJOS_DESCUENTO) * DESCUENTO_SEMANAS_POR_HIJO
    return base_semanas - descuento


def semanas_faltantes(
    df: pd.DataFrame,
    sexo: str,
    n_hijos: int,
    anio: int,
) -> float:
    """Semanas que le faltan al usuario para cumplir el requisito pensional.

    Retorna 0.0 si ya cumplió.
    """
    cotizadas = float(df["semanas"].sum())
    requeridas = float(semanas_requeridas(sexo, anio))
    if sexo == "F":
        requeridas = descuento_semanas_por_hijos(requeridas, n_hijos)
    return max(0.0, requeridas - cotizadas)


# ─── IBL y Mesada ─────────────────────────────────────────────────────────────

def calcular_ibl(df: pd.DataFrame, anios: int = 10) -> float:
    """Ingreso Base de Liquidación: promedio ponderado de salarios (últimos N años).

    Usa los registros cuya fecha_fin cae en los últimos `anios` años desde el
    máximo de fecha_fin en el DataFrame.
    """
    if df.empty:
        return 0.0

    fecha_max = df["fecha_fin"].max()
    fecha_corte = fecha_max - pd.DateOffset(years=anios)
    recientes = df[df["fecha_fin"] >= fecha_corte].copy()

    if recientes.empty or recientes["semanas"].sum() == 0:
        return float(df["salario"].mean())

    total_sem = recientes["semanas"].sum()
    ibl = (recientes["salario"] * recientes["semanas"]).sum() / total_sem
    return float(ibl)


def calcular_mesada(ibl: float) -> tuple[float, float]:
    """Retorna (mesada_min, mesada_max) = (65% IBL, 80% IBL)."""
    return ibl * TASA_REEMPLAZO_MIN, ibl * TASA_REEMPLAZO_MAX


def calcular_tasa_reemplazo(semanas_cotizadas: float) -> float:
    """65% + 1.5% por cada 50 sem sobre 1.300, máximo 80%."""
    bloques = max(0.0, (semanas_cotizadas - SEMANAS_BASE_TASA) / INCREMENTO_SEMANAS_TASA)
    return min(TASA_REEMPLAZO_MIN + bloques * INCREMENTO_TASA_POR_BLOQUE, TASA_REEMPLAZO_MAX)


# ─── Transición y Traslado ────────────────────────────────────────────────────

def califica_transicion_2381(
    df: pd.DataFrame,
    sexo: str,
) -> dict[str, Any]:
    """Determina si el usuario calificó al Régimen de Transición Ley 2381.

    El umbral de semanas se evalúa AL 30 DE JUNIO DE 2025.
    """
    umbral = TRANSICION_2381_SEMANAS_MUJER if sexo == "F" else TRANSICION_2381_SEMANAS_HOMBRE
    semanas_corte = calcular_semanas_al_corte(df, _CORTE_2381)
    califica = semanas_corte >= umbral
    return {
        "califica": califica,
        "semanas_al_corte": semanas_corte,
        "umbral": umbral,
        "semanas_faltantes_umbral": max(0.0, umbral - semanas_corte),
    }


def califica_traslado_regimen(
    semanas: float,
    sexo: str,
    fecha_nacimiento: date,
    fecha_calculo: date | None = None,
) -> dict[str, Any]:
    """Determina si el usuario puede trasladarse de régimen (Art. 76, Ley 2381).

    Requisitos:
    - Antes del 16/jul/2026
    - Mujer ≥47 años y ≥750 semanas  |  Hombre ≥52 años y ≥900 semanas
    """
    if fecha_calculo is None:
        fecha_calculo = date.today()

    dentro_plazo = fecha_calculo <= _TRASLADO_LIMITE
    edad = (fecha_calculo - fecha_nacimiento).days // 365

    if sexo == "F":
        edad_min = TRASLADO_MUJER_EDAD_MIN
        sem_min = float(TRANSICION_2381_SEMANAS_MUJER)
    else:
        edad_min = TRASLADO_HOMBRE_EDAD_MIN
        sem_min = float(TRANSICION_2381_SEMANAS_HOMBRE)

    califica = dentro_plazo and edad >= edad_min and semanas >= sem_min
    return {
        "califica": califica,
        "dentro_plazo": dentro_plazo,
        "edad": edad,
        "edad_min": edad_min,
        "semanas_min": sem_min,
        "dias_restantes": max(0, (_TRASLADO_LIMITE - fecha_calculo).days),
    }


# ─── Gaps ─────────────────────────────────────────────────────────────────────

def calcular_gaps(df: pd.DataFrame, min_semanas: float = 1.0) -> list[dict[str, Any]]:
    """Detecta períodos sin cotización entre empleos.

    Args:
        df: DataFrame de semanas cotizadas.
        min_semanas: Brecha mínima en semanas para reportar como gap.

    Returns:
        Lista de dicts con keys: fecha_inicio, fecha_fin, duracion_dias, duracion_semanas.
        Ordenada por duracion_semanas descendente.
    """
    if len(df) < 2:
        return []

    sorted_df = df.sort_values("fecha_inicio").reset_index(drop=True)
    gaps: list[dict[str, Any]] = []

    for i in range(len(sorted_df) - 1):
        fin_actual = sorted_df.loc[i, "fecha_fin"]
        inicio_siguiente = sorted_df.loc[i + 1, "fecha_inicio"]

        # Un día de diferencia es transición normal entre meses
        gap_dias = (inicio_siguiente - fin_actual).days - 1
        if gap_dias <= 0:
            continue

        gap_semanas = gap_dias / 7.0
        if gap_semanas < min_semanas:
            continue

        gaps.append({
            "fecha_inicio": (fin_actual + timedelta(days=1)).date(),
            "fecha_fin": (inicio_siguiente - timedelta(days=1)).date(),
            "duracion_dias": gap_dias,
            "duracion_semanas": round(gap_semanas, 2),
            "empleador_anterior": sorted_df.loc[i, "empleador"],
            "empleador_siguiente": sorted_df.loc[i + 1, "empleador"],
        })

    gaps.sort(key=lambda g: g["duracion_semanas"], reverse=True)
    return gaps


# ─── Proyección de pensión ────────────────────────────────────────────────────

def fecha_estimada_pension(
    df: pd.DataFrame,
    sexo: str,
    fecha_nacimiento: date,
    n_hijos: int,
    semanas_por_anio: float = 52.0,
    fecha_hoy: date | None = None,
) -> dict[str, Any]:
    """Estima cuándo el usuario se pensionará.

    Considera tanto el requisito de semanas como el de edad.

    Args:
        df: DataFrame de semanas cotizadas.
        sexo: "M" o "F".
        fecha_nacimiento: Fecha de nacimiento del usuario.
        n_hijos: Número de hijos (solo aplica para mujeres).
        semanas_por_anio: Ritmo de cotización asumido hacia adelante.
        fecha_hoy: Fecha de cálculo (por defecto hoy).

    Returns:
        Dict con fecha_pension, semanas_cotizadas, semanas_faltantes,
        anios_restantes, limitante ("semanas" | "edad" | "ambas").
    """
    if fecha_hoy is None:
        fecha_hoy = date.today()

    semanas_actuales = float(df["semanas"].sum())
    anio_proyectado = fecha_hoy.year

    # Fecha en que cumple la edad de pensión
    edad_pension = EDAD_PENSION_HOMBRE if sexo == "M" else EDAD_PENSION_MUJER
    fecha_por_edad = fecha_nacimiento.replace(
        year=fecha_nacimiento.year + edad_pension
    )

    # Año en que alcanzará las semanas requeridas (iteración anual)
    semanas_acumuladas = semanas_actuales
    fecha_por_semanas = fecha_hoy

    while True:
        requeridas = float(semanas_requeridas(sexo, anio_proyectado))
        if sexo == "F":
            requeridas = descuento_semanas_por_hijos(requeridas, n_hijos)

        if semanas_acumuladas >= requeridas:
            break

        # Avanzar un año
        semanas_acumuladas += semanas_por_anio
        anio_proyectado += 1
        fecha_por_semanas = fecha_por_semanas.replace(year=anio_proyectado)

        if anio_proyectado > fecha_hoy.year + 80:
            break  # safety limit

    # La pensión ocurre cuando se cumplen AMBOS requisitos
    fecha_pension = max(fecha_por_semanas, fecha_por_edad)

    if fecha_por_semanas >= fecha_por_edad:
        limitante = "semanas"
    elif fecha_por_edad > fecha_por_semanas:
        limitante = "edad"
    else:
        limitante = "ambas"

    dias_restantes = max(0, (fecha_pension - fecha_hoy).days)
    anios_restantes = round(dias_restantes / 365.25, 1)

    requeridas_final = float(semanas_requeridas(sexo, fecha_pension.year))
    if sexo == "F":
        requeridas_final = descuento_semanas_por_hijos(requeridas_final, n_hijos)

    return {
        "fecha_pension": fecha_pension,
        "semanas_cotizadas": semanas_actuales,
        "semanas_requeridas": requeridas_final,
        "semanas_faltantes": max(0.0, requeridas_final - semanas_actuales),
        "anios_restantes": anios_restantes,
        "limitante": limitante,
        "fecha_por_semanas": fecha_por_semanas,
        "fecha_por_edad": fecha_por_edad,
    }

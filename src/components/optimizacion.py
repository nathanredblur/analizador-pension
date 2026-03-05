"""Sección — ¿Cómo optimizar tu pensión? Tasa de reemplazo y palancas de mejora."""

import math
from datetime import date

import io
import dash_bootstrap_components as dbc
import pandas as pd
from dash import Input, Output, callback, dcc, html

from src.constants import (
    INCREMENTO_SEMANAS_TASA,
    INCREMENTO_TASA_POR_BLOQUE,
    SEMANAS_BASE_TASA,
    TASA_REEMPLAZO_MAX,
    TASA_REEMPLAZO_MIN,
)
from src.normativa import calcular_ibl, calcular_tasa_reemplazo


def _fmt_cop(v: float) -> str:
    return f"${v:,.0f}".replace(",", ".")


def _semanas_para_80(semanas_actuales: float) -> int:
    """Cuántas semanas más se necesitan para alcanzar 80% de tasa."""
    if semanas_actuales >= SEMANAS_BASE_TASA:
        bloques_actuales = (semanas_actuales - SEMANAS_BASE_TASA) / INCREMENTO_SEMANAS_TASA
        tasa_actual = TASA_REEMPLAZO_MIN + bloques_actuales * INCREMENTO_TASA_POR_BLOQUE
        if tasa_actual >= TASA_REEMPLAZO_MAX:
            return 0
        bloques_necesarios = math.ceil(
            (TASA_REEMPLAZO_MAX - tasa_actual) / INCREMENTO_TASA_POR_BLOQUE
        )
        sem_totales_necesarias = SEMANAS_BASE_TASA + bloques_necesarios * INCREMENTO_SEMANAS_TASA
        return max(0, int(sem_totales_necesarias - semanas_actuales))
    else:
        # Semanas para llegar a 1300 más las que faltan para 80%
        sem_para_1300 = int(SEMANAS_BASE_TASA - semanas_actuales)
        bloques_para_80 = math.ceil(
            (TASA_REEMPLAZO_MAX - TASA_REEMPLAZO_MIN) / INCREMENTO_TASA_POR_BLOQUE
        )
        return sem_para_1300 + bloques_para_80 * INCREMENTO_SEMANAS_TASA


def _tabla_referencia(semanas_actuales: float, ibl: float) -> dbc.Table:
    header = html.Thead(html.Tr([
        html.Th("Semanas"), html.Th("Tasa reemplazo"), html.Th("Mesada estimada"),
    ]))
    rows = []
    for sem in range(1300, 1701, 50):
        tasa = calcular_tasa_reemplazo(sem)
        mesada = ibl * tasa
        es_usuario = abs(semanas_actuales - sem) < 50
        row_class = "table-primary fw-bold" if es_usuario else ""
        rows.append(html.Tr([
            html.Td(f"{sem:,}"),
            html.Td(f"{tasa * 100:.1f}%"),
            html.Td(_fmt_cop(mesada)),
        ], className=row_class))
    return dbc.Table(
        [header, html.Tbody(rows)],
        bordered=True, hover=True, responsive=True, size="sm", className="mb-3",
    )


@callback(
    Output("seccion-optimizacion", "children"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_optimizacion(df_json: str | None, datos: dict | None) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    df = pd.read_json(io.StringIO(df_json), orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    semanas_cotizadas = float(df["semanas"].sum())
    ibl = calcular_ibl(df)
    tasa_actual = calcular_tasa_reemplazo(semanas_cotizadas)
    mesada_actual = ibl * tasa_actual
    pct_actual = int(tasa_actual * 100)
    sem_para_80 = _semanas_para_80(semanas_cotizadas)
    anios_para_80 = round(sem_para_80 / 52, 1)

    # Años de ventana IBL
    fecha_nac_str = datos.get("fecha_nac", "")
    fecha_hoy = date.today()
    try:
        try:
            fecha_nac = date.fromisoformat(fecha_nac_str)
        except (ValueError, TypeError):
            dia, mes, anio = fecha_nac_str.split("/")
            fecha_nac = date(int(anio), int(mes), int(dia))
        sexo = datos.get("sexo", "M")
        edad_pension = 62 if sexo == "M" else 57
        edad_actual = (
            fecha_hoy.year - fecha_nac.year
            - ((fecha_hoy.month, fecha_hoy.day) < (fecha_nac.month, fecha_nac.day))
        )
        anios_restantes = max(0, edad_pension - edad_actual)
    except Exception:
        anios_restantes = 10

    ventana_ibl = min(10, anios_restantes)
    salario_actual = ibl  # Usar IBL como proxy del salario actual

    return html.Div([
        html.H5("💡 ¿Cómo optimizar tu pensión?", className="mb-3"),

        # Callout IBL
        dbc.Alert([
            html.Strong("¿Qué es el IBL? "),
            "El IBL (Ingreso Base de Liquidación) es el promedio ponderado de tus salarios "
            "en los últimos 10 años antes de pensionarte, ajustado por inflación. "
            "Colpensiones multiplica este valor por tu tasa de reemplazo para calcular tu mesada mensual.",
        ], color="info", className="mb-3"),

        # Tasa de reemplazo actual
        dbc.Card(dbc.CardBody([
            html.P("Tu tasa de reemplazo actual", className="text-muted small mb-1"),
            html.H4(f"{pct_actual}%", className="text-primary mb-2"),
            dbc.Progress(
                value=pct_actual,
                min=0,
                max=100,
                color="success" if pct_actual >= 80 else ("warning" if pct_actual >= 70 else "primary"),
                className="mb-2",
                style={"height": "22px"},
                label=f"{pct_actual}%",
            ),
            html.Small(
                f"65% mínimo (1.300 sem) · 80% máximo",
                className="text-muted d-block mb-2",
            ),
            html.P(
                f"Mesada estimada: IBL × {pct_actual}% = {_fmt_cop(mesada_actual)}",
                className="mb-1",
            ),
            *([] if sem_para_80 == 0 else [
                html.P(
                    f"Para alcanzar el 80%: necesitas {sem_para_80:,} semanas más (≈ {anios_para_80} años)",
                    className="text-warning mb-0",
                ),
            ]),
        ]), className="shadow-sm mb-3"),

        # Tabla de referencia
        html.H6("Tabla de tasa de reemplazo por semanas cotizadas", className="mt-3 mb-2"),
        html.Small(
            "La fila resaltada corresponde a tu rango de semanas actual.",
            className="text-muted d-block mb-2",
        ),
        _tabla_referencia(semanas_cotizadas, ibl),

        # Palanca 1 — Más semanas
        dbc.Card(dbc.CardBody([
            html.H6("🔧 Palanca 1 — Cotizar más semanas por año", className="mb-2"),
            dbc.Label("Semanas extra que planeas cotizar por año (además de tu ritmo actual)"),
            dcc.Slider(
                id="slider-opt-semanas",
                min=0, max=52, step=4,
                value=0,
                marks={0: "0", 13: "13", 26: "26", 39: "39", 52: "52"},
                tooltip={"placement": "bottom", "always_visible": True},
                className="mb-2",
            ),
            html.Div(id="opt-output-semanas"),
        ]), className="shadow-sm mb-3"),

        # Palanca 2 — Mayor IBL
        dbc.Card(dbc.CardBody([
            html.H6("💼 Palanca 2 — Mejorar tu IBL (últimos 10 años)", className="mb-2"),
            html.P(
                f"Tienes aproximadamente {ventana_ibl} año(s) de ventana IBL "
                f"(= mín(10, {anios_restantes} años restantes para pensionarte).",
                className="text-muted small mb-2",
            ),
            dbc.Label("Aumento salarial en los próximos años (%)"),
            dcc.Slider(
                id="slider-opt-ibl",
                min=0, max=100, step=10,
                value=0,
                marks={0: "0%", 25: "25%", 50: "50%", 75: "75%", 100: "100%"},
                tooltip={"placement": "bottom", "always_visible": True},
                className="mb-2",
            ),
            html.Div(id="opt-output-ibl"),
        ]), className="shadow-sm mb-3"),
    ])


@callback(
    Output("opt-output-semanas", "children"),
    Input("slider-opt-semanas", "value"),
    Input("store-df-semanas", "data"),
)
def calcular_opt_semanas(semanas_extra: int | None, df_json: str | None) -> html.Div:
    if not df_json:
        return html.Div()

    semanas_extra = semanas_extra or 0
    df = pd.read_json(io.StringIO(df_json), orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    semanas_actuales = float(df["semanas"].sum())
    ibl = calcular_ibl(df)
    tasa_actual = calcular_tasa_reemplazo(semanas_actuales)
    mesada_actual = ibl * tasa_actual

    if semanas_extra == 0:
        return html.Small("Mueve el slider para ver el impacto.", className="text-muted")

    nueva_tasa = calcular_tasa_reemplazo(semanas_actuales + semanas_extra)
    nueva_mesada = ibl * nueva_tasa
    diff_mesada = nueva_mesada - mesada_actual
    diff_tasa = (nueva_tasa - tasa_actual) * 100

    color = "success" if diff_mesada > 0 else "secondary"
    return dbc.Alert([
        html.Strong(f"+{semanas_extra} sem/año: "),
        f"nueva tasa {nueva_tasa * 100:.1f}% (+{diff_tasa:.1f}pp), "
        f"mesada {_fmt_cop(nueva_mesada)} (+{_fmt_cop(diff_mesada)}/mes)",
    ], color=color, className="py-2 mb-0")


@callback(
    Output("opt-output-ibl", "children"),
    Input("slider-opt-ibl", "value"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def calcular_opt_ibl(
    aumento_pct: int | None,
    df_json: str | None,
    datos: dict | None,
) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    aumento_pct = aumento_pct or 0
    df = pd.read_json(io.StringIO(df_json), orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    ibl_actual = calcular_ibl(df)
    semanas_cotizadas = float(df["semanas"].sum())
    tasa = calcular_tasa_reemplazo(semanas_cotizadas)
    mesada_actual = ibl_actual * tasa

    if aumento_pct == 0:
        return html.Small("Mueve el slider para ver el impacto.", className="text-muted")

    # Calcular nuevo IBL ponderando años futuros con salario aumentado
    # Simplificación: el IBL mejorado es el promedio ponderado entre IBL actual
    # y el nuevo salario, ponderado por la ventana IBL
    fecha_nac_str = datos.get("fecha_nac", "")
    fecha_hoy = date.today()
    try:
        try:
            fecha_nac = date.fromisoformat(fecha_nac_str)
        except (ValueError, TypeError):
            dia, mes, anio = fecha_nac_str.split("/")
            fecha_nac = date(int(anio), int(mes), int(dia))
        sexo = datos.get("sexo", "M")
        edad_pension = 62 if sexo == "M" else 57
        edad_actual = (
            fecha_hoy.year - fecha_nac.year
            - ((fecha_hoy.month, fecha_hoy.day) < (fecha_nac.month, fecha_nac.day))
        )
        anios_restantes = max(0, edad_pension - edad_actual)
    except Exception:
        anios_restantes = 10

    ventana_ibl = min(10, anios_restantes)
    anios_historicos = max(0, 10 - ventana_ibl)
    salario_nuevo = ibl_actual * (1 + aumento_pct / 100)

    if anios_historicos + ventana_ibl > 0:
        nuevo_ibl = (
            (ibl_actual * anios_historicos + salario_nuevo * ventana_ibl)
            / (anios_historicos + ventana_ibl)
        )
    else:
        nuevo_ibl = salario_nuevo

    nueva_mesada = nuevo_ibl * tasa
    diff_mesada = nueva_mesada - mesada_actual
    diff_ibl = nuevo_ibl - ibl_actual

    color = "success" if diff_mesada > 0 else "secondary"
    return dbc.Alert([
        html.Strong(f"+{aumento_pct}% salario: "),
        f"nuevo IBL {_fmt_cop(nuevo_ibl)} (+{_fmt_cop(diff_ibl)}), "
        f"mesada {_fmt_cop(nueva_mesada)} (+{_fmt_cop(diff_mesada)}/mes)",
    ], color=color, className="py-2 mb-0")

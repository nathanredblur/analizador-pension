"""Panel lateral fijo — referencia de normativa colombiana."""

import dash_bootstrap_components as dbc
from dash import Input, Output, callback, html

from src.constants import (
    DESCUENTO_SEMANAS_POR_HIJO,
    EDAD_PENSION_HOMBRE,
    EDAD_PENSION_MUJER,
    MAX_HIJOS_DESCUENTO,
    SEMANAS_REQUERIDAS_HOMBRE,
    SEMANAS_REQUERIDAS_MUJER_POR_ANIO,
    TASA_COTIZACION,
    TASA_REEMPLAZO_MAX,
    TASA_REEMPLAZO_MIN,
    TRANSICION_2381_SEMANAS_HOMBRE,
    TRANSICION_2381_SEMANAS_MUJER,
)

_FILAS = [
    ("Semanas hombre", f"{SEMANAS_REQUERIDAS_HOMBRE:,}", "Ley 797/2003"),
    ("Semanas mujer 2026", f"{SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2026]:,}", "Ley 2381/2024"),
    ("Semanas mujer 2036+", f"{SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2036]:,}", "Ley 2381/2024"),
    ("Desc. por hijo (mujer)", f"{DESCUENTO_SEMANAS_POR_HIJO} sem (máx {MAX_HIJOS_DESCUENTO})", "Ley 2381/2024"),
    ("Edad pensión hombre", f"{EDAD_PENSION_HOMBRE} años", "Ley 797/2003"),
    ("Edad pensión mujer", f"{EDAD_PENSION_MUJER} años", "Ley 797/2003"),
    ("Tasa de reemplazo", f"{int(TASA_REEMPLAZO_MIN*100)}%–{int(TASA_REEMPLAZO_MAX*100)}% IBL", "Ley 100/797"),
    ("Tasa de cotización", f"{int(TASA_COTIZACION*100)}% del salario", "Ley 100/797"),
    ("Trans. 2381 — mujer", f"≥{TRANSICION_2381_SEMANAS_MUJER} sem al 30/jun/2025", "Ley 2381/2024"),
    ("Trans. 2381 — hombre", f"≥{TRANSICION_2381_SEMANAS_HOMBRE} sem al 30/jun/2025", "Ley 2381/2024"),
    ("Traslado de régimen", "Hasta 16/jul/2026", "Art. 76 Ley 2381"),
]


@callback(
    Output("sidebar", "children"),
    Input("store-df-semanas", "data"),
)
def render_sidebar(df_json: str | None) -> list:
    if not df_json:
        return [html.Small("Carga tu PDF para ver el análisis.", className="text-muted")]

    filas = [
        html.Tr([
            html.Td(param, className="small text-light"),
            html.Td(html.Strong(valor, className="text-warning"), className="small"),
            html.Td(html.Small(fuente, className="text-secondary")),
        ])
        for param, valor, fuente in _FILAS
    ]

    return [
        html.H6("📋 Normativa", className="text-uppercase text-muted small mb-2"),
        dbc.Table(
            html.Tbody(filas),
            size="sm",
            borderless=True,
            color="dark",
            className="mb-0",
            style={"fontSize": "0.72rem"},
        ),
        html.Hr(className="border-secondary"),
        html.Small(
            "Fuentes: Ley 100/1993, Ley 797/2003, Ley 2381/2024, "
            "Comunicado Colpensiones 26/dic/2025.",
            className="text-secondary",
            style={"fontSize": "0.65rem"},
        ),
    ]

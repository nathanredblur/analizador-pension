"""Sección 7 — Régimen de Transición Ley 2381/2024."""

from datetime import date

import dash_bootstrap_components as dbc
import pandas as pd
import plotly.graph_objects as go
from dash import Input, Output, callback, dcc, html

from src.normativa import (
    calcular_gaps,
    califica_traslado_regimen,
    califica_transicion_2381,
)
from src.constants import TASA_COTIZACION, TRASLADO_FECHA_LIMITE


def _fmt_cop(v: float) -> str:
    return f"${v:,.0f}".replace(",", ".")


def _costo_semana(salario: float) -> float:
    """Costo de regularizar una semana: salario × 16% / 4.33."""
    return salario * TASA_COTIZACION / 4.33


def _fig_gaps_regularizables(df: pd.DataFrame, corte: date) -> go.Figure:
    gaps = calcular_gaps(df)
    if not gaps:
        return go.Figure()

    ultimo_salario = float(df["salario"].iloc[-1]) if len(df) else 0.0
    costo_sem = _costo_semana(ultimo_salario)

    fig = go.Figure()
    colores = []
    for g in gaps:
        # Es regularizable si el gap termina antes del corte
        regularizable = g["fecha_fin"] <= corte
        colores.append("#198754" if regularizable else "#6c757d")
        fig.add_trace(go.Bar(
            name=f"{g['fecha_inicio']}",
            x=[g["duracion_semanas"]],
            y=[f"{g['fecha_inicio']} → {g['fecha_fin']}"],
            orientation="h",
            marker_color="#198754" if regularizable else "#6c757d",
            hovertemplate=(
                f"<b>Gap: {g['fecha_inicio']} → {g['fecha_fin']}</b><br>"
                f"Semanas: {g['duracion_semanas']:.1f}<br>"
                f"Costo estimado: {_fmt_cop(g['duracion_semanas'] * costo_sem)}<br>"
                f"{'✅ Regularizable' if regularizable else '⛔ Fuera del período de corte'}"
                "<extra></extra>"
            ),
            showlegend=False,
        ))

    fig.update_layout(
        title="Gaps detectados (verde = regularizable antes del 30/jun/2025)",
        xaxis_title="Semanas del gap",
        yaxis_title="",
        height=max(180, len(gaps) * 40 + 80),
        margin={"l": 10, "r": 10, "t": 40, "b": 30},
    )
    return fig


@callback(
    Output("seccion-transicion", "children"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_transicion(df_json: str | None, datos: dict | None) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    df = pd.read_json(df_json, orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    sexo = datos.get("sexo", "M")
    fecha_nac_str = datos.get("fecha_nac", "")
    try:
        fecha_nac = date.fromisoformat(fecha_nac_str)
    except (ValueError, TypeError):
        fecha_nac = date(1980, 1, 1)

    fecha_hoy = date.today()
    corte_2381 = date(2025, 6, 30)
    semanas_totales = float(df["semanas"].sum())
    ultimo_salario = float(df["salario"].iloc[-1]) if len(df) else 0.0

    trans = califica_transicion_2381(df, sexo)
    traslado = califica_traslado_regimen(semanas_totales, sexo, fecha_nac, fecha_hoy)

    # ── Diagnóstico ──
    icono_trans = "✅" if trans["califica"] else "❌"
    icono_traslado = "✅" if traslado["califica"] else ("⏳" if traslado["dentro_plazo"] else "❌")

    tabla_diag = dbc.Table([
        html.Thead(html.Tr([html.Th("Verificación"), html.Th("Resultado")])),
        html.Tbody([
            html.Tr([html.Td("Semanas al 30/jun/2025"), html.Td(f"{trans['semanas_al_corte']:.0f}")]),
            html.Tr([html.Td("Umbral requerido"), html.Td(f"{trans['umbral']} sem")]),
            html.Tr([html.Td("¿Cumple umbral?"), html.Td(f"{icono_trans} {'Sí' if trans['califica'] else 'No'}")]),
            html.Tr([html.Td("Semanas faltantes para umbral"), html.Td(f"{trans['semanas_faltantes_umbral']:.0f}")]),
            html.Tr([html.Td("Lic (licencias detectadas)"), html.Td(f"{df['lic'].sum():.2f}")]),
            html.Tr([html.Td("Sim (semanas simuladas)"), html.Td(f"{df['sim'].sum():.2f}")]),
            html.Tr([html.Td("¿Califica Doble Asesoría?"), html.Td(f"{icono_traslado} {'Sí' if traslado['califica'] else 'Revisar condiciones'}")]),
            html.Tr([html.Td("¿Dentro del plazo de traslado?"), html.Td(f"{'Sí' if traslado['dentro_plazo'] else 'No'} (límite: 16/jul/2026)")]),
        ]),
    ], bordered=True, hover=True, size="sm", className="mb-3")

    # ── Calculadora de regularización ──
    sem_falt = trans["semanas_faltantes_umbral"]
    costo_por_sem = _costo_semana(ultimo_salario)
    costo_total = sem_falt * costo_por_sem

    calc_regularizacion = []
    if not trans["califica"] and sem_falt > 0:
        calc_regularizacion = [
            html.H6("Calculadora de regularización", className="mt-3 mb-2"),
            dbc.Row([
                dbc.Col(dbc.Card(dbc.CardBody([
                    html.P("Semanas a regularizar", className="text-muted small mb-1"),
                    html.H5(f"{sem_falt:.0f}", className="text-warning mb-0"),
                ]), className="shadow-sm"), md=3),
                dbc.Col(dbc.Card(dbc.CardBody([
                    html.P("Costo por semana", className="text-muted small mb-1"),
                    html.H5(_fmt_cop(costo_por_sem), className="text-warning mb-0"),
                    html.Small(f"Salario ref: {_fmt_cop(ultimo_salario)}", className="text-muted"),
                ]), className="shadow-sm"), md=3),
                dbc.Col(dbc.Card(dbc.CardBody([
                    html.P("Costo total estimado", className="text-muted small mb-1"),
                    html.H5(_fmt_cop(costo_total), className="text-danger mb-0"),
                ]), className="shadow-sm"), md=3),
                dbc.Col(dbc.Card(dbc.CardBody([
                    html.P("Cuota mensual (12 meses)", className="text-muted small mb-1"),
                    html.H5(_fmt_cop(costo_total / 12), className="text-info mb-0"),
                ]), className="shadow-sm"), md=3),
            ], className="mb-3"),
        ]

    # ── Alerta traslado ──
    alerta_traslado = []
    if traslado["dentro_plazo"]:
        dias = traslado["dias_restantes"]
        alerta_traslado = [dbc.Alert(
            [
                html.Strong(f"🔴 {dias} días para el plazo de traslado (16/jul/2026). "),
                "Si cumples los requisitos, puedes trasladarte a Colpensiones. ",
                html.A("Solicitar Doble Asesoría →",
                       href="https://www.colpensiones.gov.co/dobleasesoria",
                       target="_blank"),
                html.Br(),
                html.Small(
                    "En 2025 se realizaron 150.000 traslados. "
                    "Más de 17 millones de afiliados a fondos privados podrían acceder a este beneficio.",
                    className="text-muted",
                ),
            ],
            color="danger" if dias < 90 else "warning",
            className="py-2",
        )]

    return html.Div([
        html.H5("🔄 Régimen de Transición (Ley 2381/2024)", className="mb-3"),
        html.H6("Diagnóstico automático", className="mb-2"),
        tabla_diag,
        *calc_regularizacion,
        *alerta_traslado,
        dcc.Graph(
            figure=_fig_gaps_regularizables(df, corte_2381),
            config={"displayModeBar": False},
        ),
    ])

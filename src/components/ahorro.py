"""Sección 5 — Calculadora de Ahorro Complementario (CDT)."""

import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from dash import Input, Output, callback, dcc, html

from src.calculadoras import (
    calcular_ahorro_mensual_necesario,
    calcular_crecimiento_capital,
    calcular_smmlv_equivalente,
)
from src.constants import CDT_TASA_DEFAULT
from datetime import date


def _fmt_cop(v: float) -> str:
    return f"${v:,.0f}".replace(",", ".")


def _fig_crecimiento(cuota: float, tasa_anual: float, anios: int, capital_objetivo: float) -> go.Figure:
    capital = calcular_crecimiento_capital(cuota, tasa_anual, anios)
    years = list(range(len(capital)))

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=years, y=capital,
        fill="tozeroy",
        name="Capital acumulado",
        line={"color": "#198754", "width": 2},
        fillcolor="rgba(25,135,84,0.15)",
        hovertemplate="<b>Año %{x}</b><br>Capital: $%{y:,.0f}<extra></extra>",
    ))
    fig.add_hline(
        y=capital_objetivo,
        line_dash="dash",
        line_color="#dc3545",
        annotation_text=f"Meta: {_fmt_cop(capital_objetivo)}",
        annotation_position="right",
        annotation_font_color="#dc3545",
    )

    # Punto de cruce
    for i, cap in enumerate(capital):
        if cap >= capital_objetivo:
            fig.add_trace(go.Scatter(
                x=[i], y=[cap],
                mode="markers",
                marker={"size": 12, "color": "#198754", "symbol": "star"},
                name=f"Meta alcanzada año {i}",
                hovertemplate=f"<b>Meta alcanzada</b><br>Año {i}<br>Capital: {_fmt_cop(cap)}<extra></extra>",
            ))
            break

    fig.update_layout(
        title="Crecimiento del capital (CDT)",
        xaxis_title="Años",
        yaxis_title="Capital (COP)",
        height=300,
        margin={"l": 10, "r": 80, "t": 40, "b": 30},
        legend={"orientation": "h", "y": -0.25},
    )
    return fig


@callback(
    Output("seccion-ahorro", "children"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_ahorro(df_json: str | None, datos: dict | None) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    anio_actual = date.today().year
    tasa_default = int(CDT_TASA_DEFAULT * 100)

    return html.Div([
        html.H5("🏦 Calculadora de Ahorro Complementario (CDT)", className="mb-3"),
        dbc.Row([
            dbc.Col([
                dbc.Label("Ingreso mensual adicional deseado al jubilarte (COP)"),
                dbc.Input(
                    id="input-ingreso-extra",
                    type="number",
                    min=100_000,
                    step=100_000,
                    value=1_000_000,
                ),
            ], md=4),
            dbc.Col([
                dbc.Label(f"Tasa CDT anual ({tasa_default}%)"),
                dcc.Slider(
                    id="slider-cdt",
                    min=5, max=20, step=1,
                    value=tasa_default,
                    marks={5: "5%", 10: "10%", 15: "15%", 20: "20%"},
                    tooltip={"placement": "bottom", "always_visible": True, "template": "{value}%"},
                ),
            ], md=4),
            dbc.Col([
                dbc.Label("Inflación proyectada"),
                dcc.Slider(
                    id="slider-inflacion-ahorro",
                    min=2, max=15, step=1,
                    value=5,
                    marks={2: "2%", 5: "5%", 10: "10%", 15: "15%"},
                    tooltip={"placement": "bottom", "always_visible": True, "template": "{value}%"},
                ),
            ], md=4),
        ], className="mb-3"),
        html.Div(id="output-ahorro-resultados", className="mb-3"),
        dcc.Graph(id="grafica-cdt", config={"displayModeBar": False}),
    ])


@callback(
    Output("output-ahorro-resultados", "children"),
    Output("grafica-cdt", "figure"),
    Input("input-ingreso-extra", "value"),
    Input("slider-cdt", "value"),
    Input("slider-inflacion-ahorro", "value"),
    Input("store-datos-usuario", "data"),
    Input("store-anios-restantes", "data"),
)
def calcular_ahorro(
    ingreso_extra: float | None,
    tasa_pct: int,
    inflacion_pct: int,
    datos: dict | None,
    anios_rest: float | None,
) -> tuple:
    if not ingreso_extra or not anios_rest:
        return html.Div(), go.Figure()

    anios = max(1, int(anios_rest))
    tasa = (tasa_pct or 10) / 100
    inflacion = (inflacion_pct or 5) / 100

    # Capital necesario para generar ingreso_extra/mes de forma perpetua (regla 4%)
    capital_objetivo = ingreso_extra * 12 / tasa
    cuota_mensual = calcular_ahorro_mensual_necesario(capital_objetivo, tasa, anios)

    anio_actual = date.today().year
    cuota_smmlv = calcular_smmlv_equivalente(cuota_mensual, anio=anio_actual)
    capital_smmlv = calcular_smmlv_equivalente(capital_objetivo, anio=anio_actual)

    tarjetas = dbc.Row([
        dbc.Col(dbc.Card(dbc.CardBody([
            html.P("Cuota mensual a ahorrar hoy", className="text-muted small mb-1"),
            html.H4(f"${cuota_mensual:,.0f}".replace(",", "."), className="text-primary mb-0"),
            html.Small(f"{cuota_smmlv:.2f} SMMLV", className="text-muted"),
        ]), className="shadow-sm"), md=4),
        dbc.Col(dbc.Card(dbc.CardBody([
            html.P("Capital necesario al jubilarte", className="text-muted small mb-1"),
            html.H4(f"${capital_objetivo:,.0f}".replace(",", "."), className="text-warning mb-0"),
            html.Small(f"{capital_smmlv:.1f} SMMLV", className="text-muted"),
        ]), className="shadow-sm"), md=4),
        dbc.Col(dbc.Card(dbc.CardBody([
            html.P("Ingreso extra mensual deseado", className="text-muted small mb-1"),
            html.H4(f"${ingreso_extra:,.0f}".replace(",", "."), className="text-success mb-0"),
            html.Small(f"a la tasa CDT del {tasa_pct}%", className="text-muted"),
        ]), className="shadow-sm"), md=4),
    ])

    fig = _fig_crecimiento(cuota_mensual, tasa, anios, capital_objetivo)
    return tarjetas, fig

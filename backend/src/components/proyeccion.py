"""Sección 4 — Proyección Pensional: mesada futura, inflación, canasta."""

import io
import dash_bootstrap_components as dbc
import pandas as pd
import plotly.graph_objects as go
from dash import Input, Output, callback, dcc, html

from src.calculadoras import calcular_canasta_familiar, calcular_smmlv_equivalente, proyectar_mesada_real
from src.normativa import calcular_ibl, calcular_mesada, fecha_estimada_pension
from src.constants import INFLACION_DEFAULT
from datetime import date


def _fmt_cop(v: float) -> str:
    return f"${v:,.0f}".replace(",", ".")


def _fig_canasta(mesada: float, estrato: int) -> go.Figure:
    canasta = calcular_canasta_familiar(estrato)
    componentes = ["Arriendo", "Mercado", "Servicios", "Transporte", "Salud"]
    valores = [
        canasta["arriendo"], canasta["mercado"], canasta["servicios"],
        canasta["transporte"], canasta["salud"],
    ]
    total_canasta = canasta["total"]
    sobrante = mesada - total_canasta

    colores = ["#0d6efd", "#20c997", "#6f42c1", "#fd7e14", "#dc3545"]

    fig = go.Figure()
    for i, (comp, val) in enumerate(zip(componentes, valores)):
        fig.add_trace(go.Bar(
            name=comp, x=["Mesada vs Canasta"], y=[val],
            marker_color=colores[i],
            hovertemplate=f"<b>{comp}</b>: {_fmt_cop(val)}<extra></extra>",
        ))

    color_sobrante = "#198754" if sobrante >= 0 else "#dc3545"
    label_sobrante = "✅ Sobrante" if sobrante >= 0 else "❌ Déficit"
    fig.add_trace(go.Bar(
        name=label_sobrante, x=["Mesada vs Canasta"], y=[abs(sobrante)],
        marker_color=color_sobrante,
        hovertemplate=f"<b>{label_sobrante}</b>: {_fmt_cop(abs(sobrante))}<extra></extra>",
    ))

    fig.add_hline(
        y=mesada,
        line_dash="dash",
        line_color="#212529",
        annotation_text=f"Mesada: {_fmt_cop(mesada)}",
        annotation_position="right",
    )

    fig.update_layout(
        barmode="stack",
        title=f"Canasta familiar — Estrato {estrato}",
        xaxis_title="",
        yaxis_title="COP",
        height=320,
        margin={"l": 10, "r": 80, "t": 40, "b": 30},
        legend={"orientation": "h", "y": -0.25},
        showlegend=True,
    )
    return fig


@callback(
    Output("seccion-proyeccion", "children"),
    Output("store-mesada-media", "data"),
    Output("store-anios-restantes", "data"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_proyeccion(df_json: str | None, datos: dict | None) -> tuple:
    if not df_json or not datos:
        return html.Div(), None, None

    df = pd.read_json(io.StringIO(df_json), orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    sexo = datos.get("sexo", "M")
    n_hijos = int(datos.get("n_hijos", 0))
    fecha_nac_str = datos.get("fecha_nac", "")
    try:
        fecha_nac = date.fromisoformat(fecha_nac_str)
    except (ValueError, TypeError):
        fecha_nac = date(1980, 1, 1)

    ibl = calcular_ibl(df)
    mesada_min, mesada_max = calcular_mesada(ibl)
    mesada_media = (mesada_min + mesada_max) / 2
    pension_info = fecha_estimada_pension(df, sexo=sexo, fecha_nacimiento=fecha_nac, n_hijos=n_hijos)
    anios_rest = pension_info["anios_restantes"]
    anio_actual = date.today().year

    smmlv_min = calcular_smmlv_equivalente(mesada_min, anio=anio_actual)
    smmlv_max = calcular_smmlv_equivalente(mesada_max, anio=anio_actual)

    layout = html.Div([
        html.H5("📈 Proyección Pensional", className="mb-3"),
        dbc.Row([
            dbc.Col(dbc.Card(dbc.CardBody([
                html.P("Mesada estimada hoy (pesos de hoy)", className="text-muted small mb-1"),
                html.H4(f"{_fmt_cop(mesada_min)} — {_fmt_cop(mesada_max)}", className="text-success mb-0"),
                html.Small(f"{smmlv_min:.1f}–{smmlv_max:.1f} SMMLV · 65–80% del IBL", className="text-muted"),
            ]), className="shadow-sm"), md=6, className="mb-3"),
            dbc.Col([
                html.P("🎛️ Inflación proyectada", className="mb-1 fw-bold"),
                dcc.Slider(
                    id="slider-inflacion",
                    min=2, max=15, step=1,
                    value=int(INFLACION_DEFAULT * 100),
                    marks={2: "2%", 5: "5%", 10: "10%", 15: "15%"},
                    tooltip={"placement": "bottom", "always_visible": True, "template": "{value}%"},
                ),
            ], md=6, className="mb-3"),
        ]),
        html.Div(id="output-mesada-inflacion", className="mb-3"),
        # Toggle estrato
        dbc.Row([
            dbc.Col([
                html.P("🏠 Estrato de referencia para la canasta:", className="mb-1"),
                dbc.RadioItems(
                    id="radio-estrato",
                    options=[
                        {"label": "Estrato 2", "value": 2},
                        {"label": "Estrato 3", "value": 3},
                        {"label": "Estrato 4", "value": 4},
                    ],
                    value=2,
                    inline=True,
                ),
            ], md=12),
        ]),
        dcc.Graph(id="grafica-canasta", config={"displayModeBar": False}),
    ])
    return layout, mesada_media, anios_rest


@callback(
    Output("output-mesada-inflacion", "children"),
    Input("slider-inflacion", "value"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def actualizar_mesada_inflacion(inflacion_pct: int, df_json: str | None, datos: dict | None) -> dbc.Alert:
    if not df_json:
        return html.Div()

    df = pd.read_json(io.StringIO(df_json), orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    ibl = calcular_ibl(df)
    mesada_min, mesada_max = calcular_mesada(ibl)

    sexo = (datos or {}).get("sexo", "M")
    n_hijos = int((datos or {}).get("n_hijos", 0))
    fecha_nac_str = (datos or {}).get("fecha_nac", "")
    try:
        fecha_nac = date.fromisoformat(fecha_nac_str)
    except (ValueError, TypeError):
        fecha_nac = date(1980, 1, 1)

    pension_info = fecha_estimada_pension(df, sexo=sexo, fecha_nacimiento=fecha_nac, n_hijos=n_hijos)
    anios = pension_info["anios_restantes"]
    inflacion = inflacion_pct / 100

    fut_min = proyectar_mesada_real(mesada_min, int(anios), inflacion)
    fut_max = proyectar_mesada_real(mesada_max, int(anios), inflacion)

    return dbc.Alert(
        [
            html.Strong(f"Valor nominal al jubilarte ({anios:.0f} años, inflación {inflacion_pct}%): "),
            f"{_fmt_cop(fut_min)} — {_fmt_cop(fut_max)}",
            html.Br(),
            html.Small(f"Poder adquisitivo equivalente hoy: {_fmt_cop(mesada_min)} — {_fmt_cop(mesada_max)}", className="text-muted"),
        ],
        color="primary", className="py-2",
    )


@callback(
    Output("grafica-canasta", "figure"),
    Input("radio-estrato", "value"),
    Input("slider-inflacion", "value"),
    Input("store-df-semanas", "data"),
)
def actualizar_canasta(estrato: int, inflacion_pct: int, df_json: str | None) -> go.Figure:
    if not df_json:
        return go.Figure()
    df = pd.read_json(io.StringIO(df_json), orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])
    ibl = calcular_ibl(df)
    mesada_min, mesada_max = calcular_mesada(ibl)
    mesada = (mesada_min + mesada_max) / 2
    return _fig_canasta(mesada, estrato or 2)

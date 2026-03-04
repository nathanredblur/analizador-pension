"""Sección 3 — Análisis Salarial: evolución, vs SMMLV, IBL, slider."""

import io
import dash_bootstrap_components as dbc
import pandas as pd
import plotly.graph_objects as go
from dash import Input, Output, State, callback, dcc, html

from src.calculadoras import calcular_smmlv_equivalente
from src.constants import SMMLV_HISTORICO
from src.normativa import calcular_ibl, calcular_mesada


def _fmt_cop(v: float) -> str:
    return f"${v:,.0f}".replace(",", ".")


def _fig_evolucion(df: pd.DataFrame) -> go.Figure:
    sorted_df = df.sort_values("fecha_inicio")
    fig = go.Figure()
    for emp, grp in sorted_df.groupby("empleador", sort=False):
        fig.add_trace(go.Scatter(
            x=grp["fecha_fin"],
            y=grp["salario"],
            mode="lines+markers",
            name=emp,
            hovertemplate=f"<b>{emp}</b><br>%{{x|%b %Y}}<br>Salario: $%{{y:,.0f}}<extra></extra>",
        ))
    fig.update_layout(
        title="Evolución salarial por empleador",
        xaxis_title="",
        yaxis_title="Salario (COP)",
        height=300,
        margin={"l": 10, "r": 10, "t": 40, "b": 30},
        legend={"orientation": "h", "y": -0.25},
    )
    return fig


def _fig_vs_smmlv(df: pd.DataFrame) -> go.Figure:
    sorted_df = df.sort_values("fecha_inicio").copy()
    sorted_df["anio"] = sorted_df["fecha_fin"].dt.year
    sorted_df["smmlv_anio"] = sorted_df["anio"].map(
        lambda y: SMMLV_HISTORICO.get(y, SMMLV_HISTORICO[2025])
    )
    sorted_df["veces_smmlv"] = sorted_df["salario"] / sorted_df["smmlv_anio"]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=sorted_df["fecha_fin"],
        y=sorted_df["salario"],
        name="Salario",
        marker_color="#0d6efd",
        opacity=0.7,
        hovertemplate="<b>%{x|%b %Y}</b><br>Salario: $%{y:,.0f}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        x=sorted_df["fecha_fin"],
        y=sorted_df["smmlv_anio"],
        name="SMMLV del año",
        marker_color="#6c757d",
        opacity=0.5,
        hovertemplate="<b>%{x|%b %Y}</b><br>SMMLV: $%{y:,.0f}<extra></extra>",
    ))
    # Eje secundario: veces SMMLV
    fig.add_trace(go.Scatter(
        x=sorted_df["fecha_fin"],
        y=sorted_df["veces_smmlv"],
        mode="lines+markers",
        name="Veces SMMLV",
        yaxis="y2",
        line={"color": "#fd7e14", "width": 2},
        hovertemplate="<b>%{x|%b %Y}</b><br>%{y:.1f}× SMMLV<extra></extra>",
    ))
    fig.update_layout(
        title="Salario vs SMMLV histórico",
        barmode="overlay",
        xaxis_title="",
        yaxis_title="COP",
        yaxis2={"title": "Veces SMMLV", "overlaying": "y", "side": "right", "showgrid": False},
        height=300,
        margin={"l": 10, "r": 60, "t": 40, "b": 30},
        legend={"orientation": "h", "y": -0.25},
    )
    return fig


@callback(
    Output("seccion-salarios", "children"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_salarios(df_json: str | None, datos: dict | None) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    df = pd.read_json(io.StringIO(df_json), orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    ibl = calcular_ibl(df)
    mesada_min, mesada_max = calcular_mesada(ibl)
    anio_actual = df["fecha_fin"].max().year
    ibl_smmlv = calcular_smmlv_equivalente(ibl, anio=anio_actual)

    return html.Div([
        html.H5("💰 Análisis Salarial", className="mb-3"),
        dbc.Row([
            dbc.Col(dcc.Graph(figure=_fig_evolucion(df), config={"displayModeBar": False}), md=12, className="mb-3"),
            dbc.Col(dcc.Graph(figure=_fig_vs_smmlv(df), config={"displayModeBar": False}), md=8, className="mb-3"),
            dbc.Col([
                dbc.Card(dbc.CardBody([
                    html.P("IBL estimado (10 años)", className="text-muted small mb-1"),
                    html.H4(_fmt_cop(ibl), className="text-primary mb-0"),
                    html.Small(f"{ibl_smmlv:.2f} SMMLV", className="text-muted"),
                ]), className="shadow-sm mb-3"),
                dbc.Card(dbc.CardBody([
                    html.P("Mesada con este IBL", className="text-muted small mb-1"),
                    html.H5(f"{_fmt_cop(mesada_min)} — {_fmt_cop(mesada_max)}", className="text-success mb-0"),
                    html.Small("65%–80% del IBL", className="text-muted"),
                ]), className="shadow-sm"),
            ], md=4),
        ]),
        # Slider IBL interactivo
        dbc.Row([
            dbc.Col([
                html.P("🎛️ ¿Y si mi IBL fuera...?", className="mb-1 fw-bold"),
                dcc.Slider(
                    id="slider-ibl",
                    min=int(ibl * 0.5),
                    max=int(ibl * 2.0),
                    step=100_000,
                    value=int(ibl),
                    marks={
                        int(ibl * 0.5): _fmt_cop(ibl * 0.5),
                        int(ibl): "IBL actual",
                        int(ibl * 2.0): _fmt_cop(ibl * 2.0),
                    },
                    tooltip={"placement": "bottom", "always_visible": True},
                ),
                html.Div(id="output-slider-ibl", className="mt-2 text-center"),
            ], md=12),
        ]),
    ])


@callback(
    Output("output-slider-ibl", "children"),
    Input("slider-ibl", "value"),
)
def actualizar_ibl_slider(ibl_val: float | None) -> html.Div:
    if ibl_val is None:
        return html.Div()
    mesada_min = ibl_val * 0.65
    mesada_max = ibl_val * 0.80
    return dbc.Alert(
        f"Con IBL de {_fmt_cop(ibl_val)}: mesada entre {_fmt_cop(mesada_min)} y {_fmt_cop(mesada_max)}",
        color="info", className="py-2 mb-0",
    )

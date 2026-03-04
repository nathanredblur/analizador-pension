"""Sección 2 — Timeline de Aportes: Gantt, heatmap mensual, acumulado."""

from datetime import date, timedelta

import dash_bootstrap_components as dbc
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from dash import Input, Output, callback, dcc, html

from src.normativa import calcular_gaps, semanas_requeridas, descuento_semanas_por_hijos


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_df(df_json: str, datos: dict) -> tuple[pd.DataFrame, str, int]:
    df = pd.read_json(df_json, orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])
    sexo = datos.get("sexo", "M")
    n_hijos = int(datos.get("n_hijos", 0))
    return df, sexo, n_hijos


# ─── Gráfica 1: Gantt ─────────────────────────────────────────────────────────

def _fig_gantt(df: pd.DataFrame) -> go.Figure:
    gaps = calcular_gaps(df, min_semanas=1.0)

    # Empleos
    gantt_rows = df[["fecha_inicio", "fecha_fin", "empleador", "semanas", "salario"]].copy()
    gantt_rows["tipo"] = "Cotización"
    gantt_rows["tooltip"] = gantt_rows.apply(
        lambda r: f"<b>{r['empleador']}</b><br>"
                  f"{r['fecha_inicio'].strftime('%b %Y')} → {r['fecha_fin'].strftime('%b %Y')}<br>"
                  f"Semanas: {r['semanas']:.2f}<br>Salario: ${r['salario']:,.0f}",
        axis=1,
    )

    fig = px.timeline(
        gantt_rows,
        x_start="fecha_inicio",
        x_end="fecha_fin",
        y="empleador",
        color="empleador",
        custom_data=["tooltip"],
    )
    fig.update_traces(hovertemplate="%{customdata[0]}<extra></extra>")

    # Gaps en rojo
    for g in gaps:
        fig.add_vrect(
            x0=str(g["fecha_inicio"]),
            x1=str(g["fecha_fin"]),
            fillcolor="rgba(220,53,69,0.15)",
            line_width=0,
            annotation_text=f"Gap {g['duracion_semanas']:.0f}sem",
            annotation_position="top left",
            annotation_font_size=9,
            annotation_font_color="#dc3545",
        )

    fig.update_layout(
        title="Historial de empleadores",
        xaxis_title="",
        yaxis_title="",
        showlegend=False,
        height=max(200, len(df["empleador"].unique()) * 40 + 80),
        margin={"l": 10, "r": 10, "t": 40, "b": 30},
    )
    return fig


# ─── Gráfica 2: Heatmap mensual ───────────────────────────────────────────────

def _fig_heatmap(df: pd.DataFrame) -> go.Figure:
    # Construir matriz año × mes
    inicio = df["fecha_inicio"].min()
    fin = df["fecha_fin"].max()

    # Crear registro mes a mes
    registros: dict[tuple[int, int], float] = {}
    for _, row in df.iterrows():
        cur = row["fecha_inicio"].replace(day=1)
        end = row["fecha_fin"].replace(day=1)
        while cur <= end:
            key = (cur.year, cur.month)
            registros[key] = registros.get(key, 0) + row["semanas"] / max(1, _meses_periodo(row))
            cur = (cur + timedelta(days=32)).replace(day=1)

    if not registros:
        return go.Figure()

    years = sorted({k[0] for k in registros})
    months = list(range(1, 13))
    month_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                   "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

    z = []
    for yr in years:
        row_vals = [registros.get((yr, mo), -1) for mo in months]
        z.append(row_vals)

    # -1 = sin dato (gris), 0 = no cotizó (rojo), >0 = cotizó (verde)
    colorscale = [
        [0.0, "#f8d7da"],   # rojo claro (no cotizó)
        [0.4, "#d4edda"],   # verde claro
        [1.0, "#155724"],   # verde oscuro
    ]

    fig = go.Figure(go.Heatmap(
        z=z,
        x=month_names,
        y=years,
        colorscale=colorscale,
        showscale=False,
        hovertemplate="<b>%{y} — %{x}</b><br>Semanas: %{z:.2f}<extra></extra>",
        zmin=0,
        zmax=4.5,
    ))
    fig.update_layout(
        title="Mapa de calor mensual de cotizaciones",
        xaxis_title="",
        yaxis_title="",
        height=max(200, len(years) * 26 + 80),
        margin={"l": 10, "r": 10, "t": 40, "b": 30},
        yaxis={"dtick": 1},
    )
    return fig


def _meses_periodo(row: pd.Series) -> int:
    delta = row["fecha_fin"] - row["fecha_inicio"]
    return max(1, delta.days // 30)


# ─── Gráfica 3: Acumulado de semanas ──────────────────────────────────────────

def _fig_acumulado(df: pd.DataFrame, sexo: str, n_hijos: int) -> go.Figure:
    sorted_df = df.sort_values("fecha_inicio").reset_index(drop=True)
    hoy = date.today()

    # Historial acumulado
    fechas_hist = []
    acum_hist = []
    acum = 0.0
    for _, row in sorted_df.iterrows():
        acum += row["semanas"]
        fechas_hist.append(row["fecha_fin"])
        acum_hist.append(acum)

    # Proyección futura (52 semanas/año)
    anio_actual = hoy.year
    req_actual = float(semanas_requeridas(sexo, anio_actual))
    if sexo == "F":
        req_actual = descuento_semanas_por_hijos(req_actual, n_hijos)

    fechas_proj = [fechas_hist[-1] if fechas_hist else pd.Timestamp(hoy)]
    acum_proj = [acum]
    cur_date = fechas_proj[0]
    cur_acum = acum
    max_req = req_actual

    while cur_acum < max_req:
        cur_date = cur_date + pd.DateOffset(months=3)
        cur_acum += 13.0  # ~52/4 semanas por trimestre
        req_year = float(semanas_requeridas(sexo, cur_date.year))
        if sexo == "F":
            req_year = descuento_semanas_por_hijos(req_year, n_hijos)
        max_req = req_year
        fechas_proj.append(cur_date)
        acum_proj.append(cur_acum)
        if cur_date.year > hoy.year + 50:
            break

    fig = go.Figure()

    # Área histórica
    fig.add_trace(go.Scatter(
        x=fechas_hist,
        y=acum_hist,
        mode="lines",
        fill="tozeroy",
        name="Semanas cotizadas",
        line={"color": "#0d6efd", "width": 2},
        fillcolor="rgba(13,110,253,0.15)",
        hovertemplate="<b>%{x|%b %Y}</b><br>Acumulado: %{y:.0f} sem<extra></extra>",
    ))

    # Proyección punteada
    if len(fechas_proj) > 1:
        fig.add_trace(go.Scatter(
            x=fechas_proj,
            y=acum_proj,
            mode="lines",
            name="Proyección",
            line={"color": "#6c757d", "dash": "dot", "width": 2},
            hovertemplate="<b>%{x|%b %Y}</b><br>Proyectado: %{y:.0f} sem<extra></extra>",
        ))

    # Línea de meta
    all_dates = fechas_hist + fechas_proj
    fig.add_hline(
        y=req_actual,
        line_dash="dash",
        line_color="#dc3545",
        annotation_text=f"Meta: {req_actual:,.0f} sem",
        annotation_position="right",
        annotation_font_color="#dc3545",
    )

    fig.update_layout(
        title="Semanas cotizadas acumuladas",
        xaxis_title="",
        yaxis_title="Semanas",
        height=320,
        margin={"l": 10, "r": 80, "t": 40, "b": 30},
        legend={"orientation": "h", "y": -0.15},
    )
    return fig


# ─── Callback principal ───────────────────────────────────────────────────────

@callback(
    Output("seccion-timeline", "children"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_timeline(df_json: str | None, datos: dict | None) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    df, sexo, n_hijos = _parse_df(df_json, datos)

    return html.Div([
        html.H5("📅 Timeline de Aportes", className="mb-3"),
        dbc.Row([
            dbc.Col(dcc.Graph(figure=_fig_gantt(df), config={"displayModeBar": False}), md=12, className="mb-3"),
            dbc.Col(dcc.Graph(figure=_fig_heatmap(df), config={"displayModeBar": False}), md=12, className="mb-3"),
            dbc.Col(dcc.Graph(figure=_fig_acumulado(df, sexo, n_hijos), config={"displayModeBar": False}), md=12),
        ]),
    ])

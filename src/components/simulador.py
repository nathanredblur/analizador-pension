"""Sección 6 — Simulador ¿Y si...? Escenarios alternativos."""

from datetime import date

import dash_bootstrap_components as dbc
import pandas as pd
from dash import Input, Output, callback, dcc, html

from src.normativa import (
    calcular_gaps,
    calcular_ibl,
    calcular_mesada,
    descuento_semanas_por_hijos,
    fecha_estimada_pension,
    semanas_requeridas,
)


def _fmt_cop(v: float) -> str:
    return f"${v:,.0f}".replace(",", ".")


@callback(
    Output("seccion-simulador", "children"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_simulador(df_json: str | None, datos: dict | None) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    df = pd.read_json(df_json, orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    sexo = datos.get("sexo", "M")
    n_hijos = int(datos.get("n_hijos", 0))

    gaps = calcular_gaps(df)
    hay_gap_activo = bool(gaps) and gaps[0]["fecha_fin"] >= date.today()

    return html.Div([
        html.H5("🔮 Simulador ¿Y si...?", className="mb-3"),
        dbc.Row([
            dbc.Col([
                dbc.Label("Semanas adicionales por año que planeas cotizar"),
                dcc.Slider(
                    id="slider-semanas-extra",
                    min=0, max=52, step=4,
                    value=0,
                    marks={0: "0", 13: "13", 26: "26", 39: "39", 52: "52"},
                    tooltip={"placement": "bottom", "always_visible": True},
                ),
            ], md=6),
            dbc.Col([
                dbc.Label("¿Empezar a cotizar desde hoy?"),
                dbc.Switch(
                    id="switch-cotizar-hoy",
                    label="Sí, tengo gap activo y quiero cerrar",
                    value=False,
                    disabled=not hay_gap_activo,
                ),
                *([] if hay_gap_activo else [
                    html.Small("Sin gap activo detectado.", className="text-muted")
                ]),
            ], md=3) if sexo == "M" else dbc.Col([], md=3),
            dbc.Col([
                dbc.Label("Hijos adicionales" if sexo == "F" else ""),
                dbc.Input(
                    id="input-hijos-sim",
                    type="number",
                    min=0, max=10,
                    value=n_hijos,
                    disabled=(sexo != "F"),
                ) if sexo == "F" else html.Div(id="input-hijos-sim"),
            ], md=3),
        ], className="mb-4"),
        html.Div(id="output-simulacion"),
    ])


@callback(
    Output("output-simulacion", "children"),
    Input("slider-semanas-extra", "value"),
    Input("switch-cotizar-hoy", "value"),
    Input("input-hijos-sim", "value"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def calcular_simulacion(
    semanas_extra_anio: int,
    cotizar_hoy: bool,
    n_hijos_sim: int | None,
    df_json: str | None,
    datos: dict | None,
) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    df = pd.read_json(df_json, orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    sexo = datos.get("sexo", "M")
    n_hijos_orig = int(datos.get("n_hijos", 0))
    n_hijos_sim = int(n_hijos_sim or 0)
    fecha_nac_str = datos.get("fecha_nac", "")
    try:
        fecha_nac = date.fromisoformat(fecha_nac_str)
    except (ValueError, TypeError):
        fecha_nac = date(1980, 1, 1)

    fecha_hoy = date.today()
    semanas_extra_anio = semanas_extra_anio or 0
    ritmo_base = 52.0
    ritmo_sim = ritmo_base + semanas_extra_anio + (52.0 if cotizar_hoy else 0.0)

    # ── Escenario actual ──
    info_actual = fecha_estimada_pension(
        df, sexo=sexo, fecha_nacimiento=fecha_nac, n_hijos=n_hijos_orig,
        semanas_por_anio=ritmo_base, fecha_hoy=fecha_hoy,
    )
    ibl = calcular_ibl(df)
    mesada_min, mesada_max = calcular_mesada(ibl)

    # ── Escenario simulado ──
    # Crear df simulado sumando semanas extra
    df_sim = df.copy()
    if semanas_extra_anio > 0 or cotizar_hoy:
        # Añadir fila representando el aporte adicional acumulado
        anios_hasta_pension = max(1, int(info_actual["anios_restantes"]))
        semanas_agregadas = semanas_extra_anio * anios_hasta_pension
        if cotizar_hoy:
            semanas_agregadas += 52.0
        nueva_fila = pd.DataFrame([{
            "fecha_inicio": pd.Timestamp(fecha_hoy),
            "fecha_fin": pd.Timestamp(fecha_hoy.replace(year=fecha_hoy.year + anios_hasta_pension)),
            "empleador": "Cotización simulada",
            "semanas": semanas_agregadas,
            "salario": float(df["salario"].iloc[-1]) if len(df) else 0.0,
            "lic": 0.0,
            "sim": semanas_agregadas,
        }])
        df_sim = pd.concat([df_sim, nueva_fila], ignore_index=True)

    info_sim = fecha_estimada_pension(
        df_sim, sexo=sexo, fecha_nacimiento=fecha_nac, n_hijos=n_hijos_sim,
        semanas_por_anio=ritmo_sim, fecha_hoy=fecha_hoy,
    )
    ibl_sim = calcular_ibl(df_sim)
    mesada_min_sim, mesada_max_sim = calcular_mesada(ibl_sim)

    ganancia_anios = info_actual["anios_restantes"] - info_sim["anios_restantes"]

    tabla = dbc.Table([
        html.Thead(html.Tr([
            html.Th(""), html.Th("Escenario actual"), html.Th("Escenario simulado"),
        ])),
        html.Tbody([
            html.Tr([
                html.Td("Semanas cotizadas"),
                html.Td(f"{info_actual['semanas_cotizadas']:.0f}"),
                html.Td(f"{info_sim['semanas_cotizadas']:.0f}", className="table-success"),
            ]),
            html.Tr([
                html.Td("Semanas faltantes"),
                html.Td(f"{info_actual['semanas_faltantes']:.0f}"),
                html.Td(f"{info_sim['semanas_faltantes']:.0f}", className="table-success"),
            ]),
            html.Tr([
                html.Td("Fecha estimada pensión"),
                html.Td(info_actual["fecha_pension"].strftime("%b %Y")),
                html.Td(info_sim["fecha_pension"].strftime("%b %Y"),
                        className="table-success" if ganancia_anios > 0 else ""),
            ]),
            html.Tr([
                html.Td("Años restantes"),
                html.Td(f"{info_actual['anios_restantes']:.1f}"),
                html.Td(f"{info_sim['anios_restantes']:.1f}",
                        className="table-success" if ganancia_anios > 0 else ""),
            ]),
            html.Tr([
                html.Td("Mesada estimada"),
                html.Td(f"{_fmt_cop(mesada_min)} — {_fmt_cop(mesada_max)}"),
                html.Td(f"{_fmt_cop(mesada_min_sim)} — {_fmt_cop(mesada_max_sim)}",
                        className="table-success"),
            ]),
        ]),
    ], bordered=True, hover=True, size="sm", className="mb-3")

    resumen = []
    if ganancia_anios > 0.1:
        resumen.append(dbc.Alert(
            f"🎉 Con este escenario te pensionarías {ganancia_anios:.1f} años antes.",
            color="success", className="py-2",
        ))
    elif ganancia_anios < -0.1:
        resumen.append(dbc.Alert(
            f"⚠️ Este escenario retrasa la pensión {abs(ganancia_anios):.1f} años.",
            color="warning", className="py-2",
        ))

    # ── Gap más largo ──
    gaps = calcular_gaps(df)
    if gaps:
        g = gaps[0]
        meses = g["duracion_dias"] // 30
        resumen.append(dbc.Alert(
            [
                html.Strong(f"📌 Gap más largo: {g['fecha_inicio']} → {g['fecha_fin']} "),
                f"({g['duracion_semanas']:.0f} semanas / {meses} meses). ",
                f"Empleador anterior: {g['empleador_anterior']}.",
            ],
            color="info", className="py-2",
        ))

    return html.Div([tabla, *resumen])

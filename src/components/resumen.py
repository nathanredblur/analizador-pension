"""Sección 1 — Resumen del Perfil: KPI cards + alertas automáticas."""

from datetime import date

import dash_bootstrap_components as dbc
import pandas as pd
from dash import Input, Output, callback, html

from src.calculadoras import calcular_smmlv_equivalente
from src.normativa import (
    calcular_gaps,
    calcular_ibl,
    calcular_mesada,
    califica_traslado_regimen,
    califica_transicion_2381,
    descuento_semanas_por_hijos,
    fecha_estimada_pension,
    semanas_requeridas,
)


def _fmt_cop(valor: float) -> str:
    return f"${valor:,.0f}".replace(",", ".")


def _progreso_bar(cotizadas: float, requeridas: float) -> dbc.Progress:
    pct = min(100, int(cotizadas / requeridas * 100)) if requeridas else 0
    color = "success" if pct >= 100 else ("warning" if pct >= 70 else "danger")
    return dbc.Progress(
        value=pct,
        label=f"{pct}%",
        color=color,
        className="mb-1",
        style={"height": "22px"},
    )


def _kpi_card(titulo: str, valor: str, sub: str = "", color: str = "primary") -> dbc.Card:
    return dbc.Card(
        dbc.CardBody([
            html.P(titulo, className="text-muted small mb-1"),
            html.H4(valor, className=f"text-{color} mb-0"),
            html.Small(sub, className="text-muted") if sub else None,
        ]),
        className="shadow-sm h-100",
    )


@callback(
    Output("seccion-resumen", "children"),
    Input("store-df-semanas", "data"),
    Input("store-datos-usuario", "data"),
)
def render_resumen(df_json: str | None, datos: dict | None) -> html.Div:
    if not df_json or not datos:
        return html.Div()

    df = pd.read_json(df_json, orient="records")
    df["fecha_inicio"] = pd.to_datetime(df["fecha_inicio"])
    df["fecha_fin"] = pd.to_datetime(df["fecha_fin"])

    sexo = datos.get("sexo", "M")
    n_hijos = int(datos.get("n_hijos", 0))
    nombre = datos.get("nombre", "")
    fecha_nac_str = datos.get("fecha_nac", "")

    fecha_hoy = date.today()
    anio_actual = fecha_hoy.year

    try:
        fecha_nac = date.fromisoformat(fecha_nac_str)
        edad = (fecha_hoy - fecha_nac).days // 365
    except (ValueError, TypeError):
        fecha_nac = date(1980, 1, 1)
        edad = anio_actual - 1980

    edad_pension = 62 if sexo == "M" else 57
    cotizadas = float(df["semanas"].sum())
    requeridas = float(semanas_requeridas(sexo, anio_actual))
    if sexo == "F":
        requeridas = descuento_semanas_por_hijos(requeridas, n_hijos)

    faltantes = max(0.0, requeridas - cotizadas)
    ibl = calcular_ibl(df)
    mesada_min, mesada_max = calcular_mesada(ibl)
    smmlv_min = calcular_smmlv_equivalente(mesada_min, anio_actual)
    smmlv_max = calcular_smmlv_equivalente(mesada_max, anio_actual)

    pension_info = fecha_estimada_pension(
        df, sexo=sexo, fecha_nacimiento=fecha_nac, n_hijos=n_hijos, fecha_hoy=fecha_hoy
    )
    fecha_pension = pension_info["fecha_pension"]
    anios_rest = pension_info["anios_restantes"]

    # ── KPI cards ──
    cards = dbc.Row([
        dbc.Col(_kpi_card("Semanas cotizadas", f"{cotizadas:,.2f}",
                          f"de {requeridas:,.0f} requeridas"), md=3, className="mb-3"),
        dbc.Col(_kpi_card("Semanas faltantes", f"{faltantes:,.0f}",
                          color="danger" if faltantes > 0 else "success"), md=3, className="mb-3"),
        dbc.Col(_kpi_card("Edad actual / pensión", f"{edad} / {edad_pension} años"), md=3, className="mb-3"),
        dbc.Col(_kpi_card("Fecha estimada pensión",
                          fecha_pension.strftime("%b %Y"),
                          f"en {anios_rest:.1f} años"), md=3, className="mb-3"),
    ])

    progreso = dbc.Row(dbc.Col([
        html.Small(f"Progreso hacia la meta ({requeridas:,.0f} semanas)", className="text-muted"),
        _progreso_bar(cotizadas, requeridas),
    ], md=12), className="mb-3")

    mesada_card = dbc.Row(dbc.Col(
        dbc.Card(dbc.CardBody([
            html.P("Mesada pensional estimada", className="text-muted small mb-1"),
            html.H4(f"{_fmt_cop(mesada_min)} — {_fmt_cop(mesada_max)}", className="text-success mb-0"),
            html.Small(f"{smmlv_min:.1f}–{smmlv_max:.1f} SMMLV · IBL: {_fmt_cop(ibl)}", className="text-muted"),
        ]), className="shadow-sm"),
        md=12,
    ), className="mb-3")

    # ── Alertas automáticas ──
    alertas = _calcular_alertas(df, sexo, n_hijos, fecha_nac, fecha_hoy)

    return html.Div([
        html.H5(f"📋 Perfil Pensional{' — ' + nombre if nombre else ''}", className="mb-3"),
        cards,
        progreso,
        mesada_card,
        *alertas,
    ])


def _calcular_alertas(
    df: pd.DataFrame,
    sexo: str,
    n_hijos: int,
    fecha_nac: date,
    fecha_hoy: date,
) -> list:
    alertas = []
    semanas_totales = float(df["semanas"].sum())

    # 🟢 Régimen Transición Ley 2381
    trans = califica_transicion_2381(df, sexo)
    if trans["califica"]:
        alertas.append(dbc.Alert(
            [
                html.Strong("🟢 Régimen de Transición Ley 2381 activo. "),
                f"Tenías {trans['semanas_al_corte']:.0f} semanas al 30/jun/2025 "
                f"(umbral: {trans['umbral']} sem). "
                "Tus semanas futuras se calcularán bajo las reglas actualizadas.",
            ],
            color="success", className="py-2",
        ))
    else:
        sem_faltan = trans["semanas_faltantes_umbral"]
        if sem_faltan <= 100:
            alertas.append(dbc.Alert(
                [
                    html.Strong("🟡 Casi calificas al Régimen de Transición. "),
                    f"Te faltan {sem_faltan:.0f} semanas para el umbral del 30/jun/2025. "
                    "Revisa la Sección 7 para ver cómo regularizar períodos.",
                ],
                color="warning", className="py-2",
            ))

    # 🟡 Oportunidad traslado de régimen
    traslado = califica_traslado_regimen(
        semanas=semanas_totales, sexo=sexo, fecha_nacimiento=fecha_nac, fecha_calculo=fecha_hoy
    )
    if traslado["califica"]:
        dias = traslado["dias_restantes"]
        alertas.append(dbc.Alert(
            [
                html.Strong("🟡 Oportunidad de traslado de régimen (Art. 76 Ley 2381). "),
                f"Tienes {dias} días restantes para trasladarte (límite: 16/jul/2026). ",
                html.A("Solicitar Doble Asesoría →",
                       href="https://www.colpensiones.gov.co/dobleasesoria",
                       target="_blank", className="ms-1"),
            ],
            color="warning", className="py-2",
        ))
    elif traslado["dentro_plazo"]:
        edad = traslado["edad"]
        edad_min = traslado["edad_min"]
        if edad < edad_min:
            alertas.append(dbc.Alert(
                [
                    html.Strong("ℹ️ Traslado de régimen disponible en el futuro. "),
                    f"Podrás trasladarte cuando cumplas {edad_min} años (actualmente tienes {edad}).",
                ],
                color="info", className="py-2",
            ))

    # 🟠 Descuento por hijos (mujeres)
    if sexo == "F" and n_hijos > 0:
        descuento = min(n_hijos, 3) * 50
        alertas.append(dbc.Alert(
            [
                html.Strong(f"🟠 Descuento por hijos aplicado: {descuento} semanas. "),
                f"Tienes {n_hijos} hijo(s). Tu meta se reduce en {descuento} semanas "
                "(máx. 150 sem / 3 hijos, Ley 2381/2024).",
            ],
            color="warning", className="py-2",
        ))

    # 🔵 Gap más largo detectado
    gaps = calcular_gaps(df)
    if gaps:
        g = gaps[0]
        alertas.append(dbc.Alert(
            [
                html.Strong("🔵 Gap detectado en tu historial. "),
                f"El período sin cotizar más largo: {g['fecha_inicio']} → {g['fecha_fin']} "
                f"({g['duracion_semanas']:.1f} semanas / {g['duracion_dias'] // 30} meses). "
                "Ver Sección 7 para opciones de regularización.",
            ],
            color="info", className="py-2",
        ))

    return alertas

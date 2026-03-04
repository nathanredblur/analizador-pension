"""Fase B — Dashboard principal: ensamblado de las 7 secciones."""

import dash_bootstrap_components as dbc
from dash import html


def layout() -> dbc.Container:
    """Layout del dashboard completo con sidebar + contenido principal."""
    return dbc.Container(
        fluid=True,
        className="p-0",
        children=[
            dbc.Row(
                className="g-0",
                children=[
                    # Sidebar
                    dbc.Col(
                        id="sidebar",
                        width=2,
                        className="bg-dark text-white p-3 min-vh-100",
                        children=_sidebar_placeholder(),
                    ),
                    # Contenido principal
                    dbc.Col(
                        width=10,
                        className="p-4",
                        children=[
                            html.Div(id="seccion-resumen"),
                            html.Hr(),
                            html.Div(id="seccion-timeline"),
                            html.Hr(),
                            html.Div(id="seccion-salarios"),
                            html.Hr(),
                            html.Div(id="seccion-proyeccion"),
                            html.Hr(),
                            html.Div(id="seccion-ahorro"),
                            html.Hr(),
                            html.Div(id="seccion-simulador"),
                            html.Hr(),
                            html.Div(id="seccion-transicion"),
                        ],
                    ),
                ],
            ),
        ],
    )


def _sidebar_placeholder() -> list:
    return [
        html.H6("📋 Normativa", className="text-uppercase text-muted small"),
        html.Hr(className="border-secondary"),
        html.Small("Las secciones se cargarán al analizar tu PDF.", className="text-muted"),
    ]

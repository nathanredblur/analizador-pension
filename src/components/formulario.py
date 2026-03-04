"""Fase A — Formulario de carga del PDF y datos del usuario."""

import base64
import io
from datetime import date

import dash_bootstrap_components as dbc
from dash import Input, Output, State, dcc, html, callback

from src.app import app  # noqa: F401 — importado para registrar callbacks


def layout() -> dbc.Container:
    """Pantalla inicial: upload + datos personales."""
    return dbc.Container(
        fluid=True,
        className="min-vh-100 d-flex align-items-center justify-content-center bg-light",
        children=[
            dbc.Card(
                style={"maxWidth": "560px", "width": "100%"},
                className="shadow-sm",
                children=[
                    dbc.CardHeader(
                        html.H4("🏦 Analizador de Pensión Colombiana", className="mb-0 text-center")
                    ),
                    dbc.CardBody([
                        # Upload
                        dcc.Upload(
                            id="upload-pdf",
                            children=html.Div([
                                html.I(className="bi bi-file-earmark-pdf fs-3 text-danger"),
                                html.Div("Arrastra tu PDF de Colpensiones aquí", className="mt-1"),
                                html.Small("o haz clic para seleccionar", className="text-muted"),
                            ], className="text-center py-3"),
                            style={
                                "border": "2px dashed #dee2e6",
                                "borderRadius": "8px",
                                "cursor": "pointer",
                            },
                            accept=".pdf",
                        ),
                        html.Div(id="upload-filename", className="text-success small mt-1"),
                        dbc.Row([
                            dbc.Col([
                                dbc.Label("Contraseña del PDF", html_for="input-password"),
                                dbc.Input(
                                    id="input-password",
                                    type="password",
                                    placeholder="Tu cédula (ej: 12345678)",
                                ),
                            ], width=12, className="mt-3"),
                        ]),
                        dbc.Row([
                            dbc.Col([
                                dbc.Label("Nombre completo"),
                                dbc.Input(id="input-nombre", placeholder="Como aparece en el PDF"),
                            ], width=12, className="mt-3"),
                        ]),
                        dbc.Row([
                            dbc.Col([
                                dbc.Label("Fecha de nacimiento"),
                                dbc.Input(
                                    id="input-fecha-nac",
                                    type="date",
                                    max=str(date.today()),
                                ),
                            ], width=6, className="mt-3"),
                            dbc.Col([
                                dbc.Label("Sexo"),
                                dbc.RadioItems(
                                    id="radio-sexo",
                                    options=[
                                        {"label": "Hombre", "value": "M"},
                                        {"label": "Mujer", "value": "F"},
                                    ],
                                    value="M",
                                    inline=True,
                                    className="mt-2",
                                ),
                            ], width=6, className="mt-3"),
                        ]),
                        dbc.Row([
                            dbc.Col(
                                id="col-hijos",
                                style={"display": "none"},
                                children=[
                                    dbc.Label("Número de hijos"),
                                    dbc.Input(
                                        id="input-hijos",
                                        type="number",
                                        min=0,
                                        max=10,
                                        value=0,
                                    ),
                                ],
                                width=6,
                                className="mt-3",
                            ),
                        ]),
                        html.Div(id="alerta-error", className="mt-3"),
                        dbc.Button(
                            "Analizar mi pensión",
                            id="btn-analizar",
                            color="primary",
                            size="lg",
                            className="w-100 mt-4",
                            n_clicks=0,
                        ),
                        html.Small(
                            "🔒 Todo se procesa localmente — ningún dato sale de tu navegador.",
                            className="text-muted d-block text-center mt-2",
                        ),
                    ]),
                ],
            ),
        ],
    )


# ─── Callbacks ────────────────────────────────────────────────────────────────

@callback(
    Output("upload-filename", "children"),
    Input("upload-pdf", "filename"),
)
def mostrar_nombre_archivo(filename: str | None) -> str:
    if filename:
        return f"✓ {filename}"
    return ""


@callback(
    Output("col-hijos", "style"),
    Input("radio-sexo", "value"),
)
def toggle_hijos(sexo: str) -> dict:
    return {"display": "block"} if sexo == "F" else {"display": "none"}


@callback(
    Output("store-df-semanas", "data"),
    Output("store-datos-usuario", "data"),
    Output("alerta-error", "children"),
    Input("btn-analizar", "n_clicks"),
    State("upload-pdf", "contents"),
    State("upload-pdf", "filename"),
    State("input-password", "value"),
    State("input-nombre", "value"),
    State("input-fecha-nac", "value"),
    State("radio-sexo", "value"),
    State("input-hijos", "value"),
    prevent_initial_call=True,
)
def procesar_pdf(
    n_clicks: int,
    pdf_contents: str | None,
    filename: str | None,
    password: str | None,
    nombre: str | None,
    fecha_nac: str | None,
    sexo: str,
    n_hijos: int | None,
) -> tuple:
    if not pdf_contents:
        return None, None, dbc.Alert("Selecciona un archivo PDF.", color="warning")

    try:
        from pathlib import Path
        from src.extractor import extract_semanas_df, ExtractionError

        # Decodificar base64 del upload
        _header, b64_data = pdf_contents.split(",", 1)
        pdf_bytes = base64.b64decode(b64_data)

        # Guardar temporalmente en memoria para extractor
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = Path(tmp.name)

        try:
            df = extract_semanas_df(tmp_path, password=password or "")
        finally:
            os.unlink(tmp_path)

        datos_usuario = {
            "nombre": nombre or "",
            "fecha_nac": fecha_nac or "",
            "sexo": sexo,
            "n_hijos": int(n_hijos or 0),
        }

        return df.to_json(date_format="iso", orient="records"), datos_usuario, ""

    except Exception as exc:  # noqa: BLE001
        return None, None, dbc.Alert(
            [html.Strong("Error al procesar el PDF: "), str(exc)],
            color="danger",
        )

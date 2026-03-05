"""Fase A — Formulario de carga del PDF y datos del usuario."""

import base64
import io
from datetime import date

import dash_bootstrap_components as dbc
from dash import Input, Output, State, dcc, html, callback, no_update


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
    Output("store-upload-pdf", "data"),
    Input("upload-pdf", "contents"),
    State("upload-pdf", "filename"),
)
def mostrar_nombre_archivo(contents: str | None, filename: str | None) -> tuple:
    """Muestra el nombre del archivo y guarda los contenidos en el store."""
    if contents and filename:
        return f"✓ {filename}", {"contents": contents, "filename": filename}
    return "", None


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
    State("store-upload-pdf", "data"),
    State("input-password", "value"),
    State("input-nombre", "value"),
    State("input-fecha-nac", "value"),
    State("radio-sexo", "value"),
    State("input-hijos", "value"),
    prevent_initial_call=True,
)
def procesar_pdf(
    n_clicks: int,
    upload_data: dict | None,
    password: str | None,
    nombre: str | None,
    fecha_nac: str | None,
    sexo: str,
    n_hijos: int | None,
) -> tuple:
    pdf_contents = (upload_data or {}).get("contents")
    filename = (upload_data or {}).get("filename")
    import os
    import tempfile
    from pathlib import Path

    from src.extractor import ExtractionError, extract_semanas_df

    def _alerta(titulo: str, detalle: str, color: str = "danger") -> dbc.Alert:
        return dbc.Alert([
            html.Strong(titulo),
            html.Br(),
            html.Small(detalle, className="text-muted"),
        ], color=color, dismissable=True)

    if not pdf_contents:
        return no_update, no_update, _alerta(
            "Selecciona un archivo PDF.",
            "Arrastra o haz clic en el área de carga para subir tu PDF de Colpensiones.",
            color="warning",
        )

    # Validar que sea un PDF por extensión y cabecera
    fname = filename or ""
    if not fname.lower().endswith(".pdf"):
        return no_update, no_update, _alerta(
            "Formato incorrecto.",
            f"El archivo «{fname}» no es un PDF. Solo se aceptan archivos .pdf de Colpensiones.",
        )

    try:
        _header, b64_data = pdf_contents.split(",", 1)
        pdf_bytes = base64.b64decode(b64_data)
    except Exception:
        return no_update, no_update, _alerta(
            "Error al leer el archivo.",
            "No se pudo decodificar el archivo. Intenta de nuevo.",
        )

    # Validar cabecera PDF (%PDF-)
    if not pdf_bytes.startswith(b"%PDF-"):
        return no_update, no_update, _alerta(
            "El archivo no es un PDF válido.",
            f"El archivo «{fname}» no tiene el formato PDF esperado. "
            "Descarga el PDF directamente desde la app de Colpensiones.",
        )

    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = Path(tmp.name)

        try:
            df = extract_semanas_df(tmp_path, password=password or "")
        finally:
            os.unlink(tmp_path)

    except ExtractionError as exc:
        msg = str(exc).lower()
        if "password" in msg or "contrase" in msg or "incorrect" in msg or "encrypt" in msg:
            return no_update, no_update, _alerta(
                "Contraseña incorrecta.",
                "El PDF está protegido con contraseña. Ingresa tu número de cédula "
                "(sin puntos ni espacios) en el campo 'Contraseña del PDF'.",
            )
        if "no table" in msg or "no se encontr" in msg or "tabla" in msg:
            return no_update, no_update, _alerta(
                "No se encontró la tabla de semanas cotizadas.",
                "El PDF no parece ser el reporte de semanas cotizadas de Colpensiones. "
                "Descárgalo desde Mi Colpensiones → Historial de cotizaciones.",
            )
        return no_update, no_update, _alerta(
            "Error al extraer los datos del PDF.",
            f"Detalle técnico: {exc}",
        )
    except Exception as exc:  # noqa: BLE001
        return no_update, no_update, _alerta(
            "Error inesperado al procesar el PDF.",
            f"Detalle: {exc}",
        )

    if df.empty or df["semanas"].sum() == 0:
        return no_update, no_update, _alerta(
            "El PDF no contiene semanas cotizadas.",
            "Se procesó el archivo pero no se encontraron registros de cotización. "
            "Verifica que sea el reporte correcto.",
            color="warning",
        )

    datos_usuario = {
        "nombre": nombre or "",
        "fecha_nac": fecha_nac or "",
        "sexo": sexo,
        "n_hijos": int(n_hijos or 0),
    }

    return df.to_json(date_format="iso", orient="records"), datos_usuario, ""

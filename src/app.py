"""Entry point — Analizador de Pensión Colombiana.

Inicia el servidor Dash en http://localhost:8050.
Uso: uv run python src/app.py
"""

import dash
import dash_bootstrap_components as dbc
from dash import Input, Output, dcc, html

app = dash.Dash(
    __name__,
    external_stylesheets=[dbc.themes.BOOTSTRAP, dbc.icons.BOOTSTRAP],
    title="Analizador de Pensión Colombiana",
    suppress_callback_exceptions=True,
)

# Stores para datos de sesión (solo en memoria del navegador)
_stores = html.Div([
    dcc.Store(id="store-df-semanas"),     # DataFrame serializado como JSON
    dcc.Store(id="store-datos-usuario"),  # {nombre, fecha_nac, sexo, n_hijos}
])

app.layout = dbc.Container(
    fluid=True,
    children=[
        _stores,
        html.Div(id="content"),
    ],
)

# Importar callbacks después de crear app (evita importaciones circulares)
from src.components import formulario  # noqa: E402, F401
from src.components import dashboard   # noqa: E402, F401


@app.callback(
    Output("content", "children"),
    Input("store-df-semanas", "data"),
)
def renderizar_fase(df_json: str | None) -> html.Div:
    """Alterna entre Fase A (formulario) y Fase B (dashboard) según el store."""
    if df_json is None:
        return formulario.layout()
    return dashboard.layout()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8050)

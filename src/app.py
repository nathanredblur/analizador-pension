"""Entry point — Analizador de Pensión Colombiana.

Inicia el servidor Dash en http://localhost:8050.
Uso: uv run python main.py
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
    dcc.Store(id="store-df-semanas"),       # DataFrame serializado como JSON
    dcc.Store(id="store-datos-usuario"),    # {nombre, fecha_nac, sexo, n_hijos}
    dcc.Store(id="store-mesada-media"),     # mesada media calculada (para ahorro.py)
    dcc.Store(id="store-anios-restantes"),  # años hasta pensión (para ahorro.py)
])

# Importar dashboard antes del layout para incluir sus IDs estáticamente.
# dashboard.py solo usa dash y dbc — sin importaciones circulares.
from src.components.dashboard import layout as _dashboard_layout  # noqa: E402

app.layout = dbc.Container(
    fluid=True,
    children=[
        _stores,
        # Fase A: formulario de carga (mostrado cuando no hay datos)
        html.Div(id="fase-a"),
        # Fase B: dashboard completo (siempre en DOM para que Dash valide los IDs,
        # pero oculto hasta que se cargue el PDF)
        html.Div(
            id="fase-b",
            style={"display": "none"},
            children=_dashboard_layout(),
        ),
    ],
)

# Importar callbacks después de crear app (evita importaciones circulares)
from src.components import formulario   # noqa: E402, F401
from src.components import resumen       # noqa: E402, F401
from src.components import timeline     # noqa: E402, F401
from src.components import salarios     # noqa: E402, F401
from src.components import proyeccion   # noqa: E402, F401
from src.components import ahorro       # noqa: E402, F401
from src.components import simulador    # noqa: E402, F401
from src.components import transicion   # noqa: E402, F401
from src.components import panel_lateral  # noqa: E402, F401


@app.callback(
    Output("fase-a", "children"),
    Output("fase-b", "style"),
    Input("store-df-semanas", "data"),
)
def renderizar_fase(df_json: str | None) -> tuple:
    """Alterna entre Fase A (formulario) y Fase B (dashboard) según el store."""
    if df_json is None:
        return formulario.layout(), {"display": "none"}
    return html.Div(), {"display": "block"}


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8050)

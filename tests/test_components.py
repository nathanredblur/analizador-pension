"""Tests para los componentes del dashboard: layout, navbar y callback salir."""

import pytest
from dash import html
import dash_bootstrap_components as dbc

from src.components.dashboard import layout, _sidebar_placeholder
from src.app import renderizar_fase, salir


# ─── dashboard.layout() ───────────────────────────────────────────────────────

def test_layout_returns_container():
    result = layout()
    assert isinstance(result, dbc.Container)


def test_layout_has_navbar():
    """El dashboard debe incluir una dbc.Navbar como primer hijo."""
    result = layout()
    children = result.children
    navbar = next((c for c in children if isinstance(c, dbc.Navbar)), None)
    assert navbar is not None, "No se encontró dbc.Navbar en el layout"


def test_navbar_has_btn_salir():
    """La navbar debe contener el botón con id='btn-salir'."""
    result = layout()
    navbar = next(c for c in result.children if isinstance(c, dbc.Navbar))

    def find_btn(node):
        if isinstance(node, dbc.Button) and getattr(node, "id", None) == "btn-salir":
            return node
        children = getattr(node, "children", None) or []
        if not isinstance(children, list):
            children = [children]
        for child in children:
            found = find_btn(child)
            if found:
                return found
        return None

    btn = find_btn(navbar)
    assert btn is not None, "No se encontró btn-salir en la navbar"


def test_navbar_has_brand_title():
    """La navbar debe mostrar el nombre de la aplicación."""
    result = layout()
    navbar = next(c for c in result.children if isinstance(c, dbc.Navbar))

    def find_brand(node):
        if isinstance(node, dbc.NavbarBrand):
            return node
        children = getattr(node, "children", None) or []
        if not isinstance(children, list):
            children = [children]
        for child in children:
            found = find_brand(child)
            if found:
                return found
        return None

    brand = find_brand(navbar)
    assert brand is not None
    assert "Pensión Colombiana" in brand.children


def test_layout_has_all_section_divs():
    """El layout debe contener todos los div de secciones necesarios."""
    result = layout()
    import json

    def collect_ids(node):
        ids = set()
        nid = getattr(node, "id", None)
        if nid:
            ids.add(nid)
        children = getattr(node, "children", None) or []
        if not isinstance(children, list):
            children = [children]
        for child in children:
            if hasattr(child, "children") or hasattr(child, "id"):
                ids |= collect_ids(child)
        return ids

    ids = collect_ids(result)
    expected = {
        "sidebar", "btn-salir",
        "seccion-resumen", "seccion-timeline", "seccion-salarios",
        "seccion-proyeccion", "seccion-ahorro", "seccion-simulador",
        "seccion-transicion",
    }
    missing = expected - ids
    assert not missing, f"IDs faltantes en el layout: {missing}"


def test_sidebar_placeholder_not_empty():
    result = _sidebar_placeholder()
    assert isinstance(result, list)
    assert len(result) > 0


# ─── renderizar_fase callback ─────────────────────────────────────────────────

def test_renderizar_fase_sin_datos_muestra_formulario():
    """Sin datos en el store debe mostrar el formulario (fase-a) y ocultar fase-b."""
    fase_a, estilo_b = renderizar_fase(None)
    assert estilo_b == {"display": "none"}
    # fase-a debe ser el formulario (Container de dbc)
    assert isinstance(fase_a, dbc.Container)


def test_renderizar_fase_con_datos_muestra_dashboard():
    """Con datos en el store debe ocultar fase-a y mostrar fase-b."""
    fase_a, estilo_b = renderizar_fase('{"data": "exists"}')
    assert estilo_b == {"display": "block"}
    assert isinstance(fase_a, html.Div)


# ─── salir callback ───────────────────────────────────────────────────────────

def test_salir_limpia_store_semanas():
    """El callback salir debe retornar None para store-df-semanas."""
    df_result, usuario_result = salir(1)
    assert df_result is None


def test_salir_limpia_store_usuario():
    """El callback salir debe retornar None para store-datos-usuario."""
    df_result, usuario_result = salir(1)
    assert usuario_result is None


def test_salir_retorna_tupla():
    """El callback salir debe retornar una tupla de dos elementos."""
    result = salir(1)
    assert isinstance(result, tuple)
    assert len(result) == 2

# Analizador de Pensión Colombiana — CLAUDE.md

## Stack Técnico
- **Runtime:** Python 3.13
- **Gestor de proyecto:** UV (pyproject.toml / uv.lock)
- **Framework web:** Plotly Dash 2.18+ con Dash Bootstrap Components
- **PDF:** pymupdf (PyMuPDF/fitz) + pikepdf (procesamiento en memoria, sin escritura a disco)
- **Datos:** pandas DataFrames — todo efímero, destruido al cerrar sesión
- **Gráficas:** Plotly Express + Graph Objects
- **Tests:** pytest + pytest-cov
- **Linting:** ruff

## Comandos
```bash
uv sync                    # instalar dependencias
uv run python src/app.py   # iniciar servidor (localhost:8050)
uv run pytest              # correr todos los tests
uv run pytest tests/test_X.py -v  # test específico
uv run ruff check src/     # lint
uv run ruff format src/    # format
```

## Estructura del Proyecto
```
semanas-cotizadas/
├── pyproject.toml
├── uv.lock
├── CLAUDE.md
├── readme.md
├── src/
│   ├── app.py               # Entry point Dash
│   ├── constants.py         # Constantes normativa colombiana
│   ├── extractor.py         # PDF → DataFrame en memoria
│   ├── normativa.py         # Ley 100/797/2381, IBL, mesada
│   ├── calculadoras.py      # Proyecciones, CDT, inflación, canasta
│   └── components/
│       ├── formulario.py    # Upload + datos usuario
│       ├── resumen.py       # KPI Cards + alertas
│       ├── timeline.py      # Gantt + heatmap + acumulado
│       ├── salarios.py      # Análisis salarial
│       ├── proyeccion.py    # Proyección pensional + canasta
│       ├── ahorro.py        # Calculadora CDT
│       ├── simulador.py     # Simulador ¿Y si...?
│       └── transicion.py    # Régimen Transición Ley 2381
└── tests/
    ├── test_extractor.py
    ├── test_normativa.py
    ├── test_calculadoras.py
    └── test_components/     # (cuando sea necesario)
```

## Normativa Colombiana — Puntos Clave
- **Ley 797/2003:** Hombres 62 años, 1300 semanas. Mujeres 57 años.
- **Ley 2381/2024:** Reducción gradual semanas mujeres 2026→2036 (1250 a 750).
- **Régimen Transición 2381:** Umbral al 30/jun/2025: mujeres ≥750, hombres ≥900.
- **Traslado régimen:** Hasta 16/jul/2026, mujer ≥47 años, hombre ≥52 años.
- **IBL:** Promedio ponderado últimos 10 años de cotización.
- **Tasa reemplazo:** 65–80% del IBL.
- **Cotización:** 16% del salario base.

## Privacidad
Todo en memoria — ningún dato se guarda en disco ni se envía a servidores.

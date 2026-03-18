# Analizador de Pensión Colombiana — CLAUDE.md

## Stack Técnico

### Backend (`backend/`)
- **Runtime:** Python 3.13
- **Gestor de proyecto:** UV (pyproject.toml / uv.lock)
- **API:** FastAPI (migración desde Dash en progreso)
- **PDF:** pymupdf (PyMuPDF/fitz) + pikepdf (procesamiento en memoria, sin escritura a disco)
- **Datos:** pandas DataFrames — todo efímero, destruido al cerrar sesión
- **Tests:** pytest + pytest-cov
- **Linting:** ruff

### Frontend (`front/`)
- **Runtime:** Node 22 LTS, ESM only
- **Framework:** React + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS v4
- **Tests:** vitest

## Comandos

### Backend
```bash
cd backend
uv sync                          # instalar dependencias
uv run python main.py            # iniciar servidor (localhost:8050, Dash legacy)
uv run pytest                    # correr todos los tests
uv run pytest tests/test_X.py -v # test específico
uv run ruff check src/           # lint
uv run ruff format src/          # format
```

### Frontend
```bash
cd front
pnpm install        # instalar dependencias
pnpm dev            # dev server (localhost:5173)
pnpm build          # build producción
pnpm test           # vitest
```

## Estructura del Proyecto
```
analizador-pension/
├── CLAUDE.md
├── .gitignore
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── main.py
│   ├── readme.md
│   ├── src/
│   │   ├── app.py               # Entry point Dash (legacy)
│   │   ├── constants.py         # Constantes normativa colombiana
│   │   ├── extractor.py         # PDF → DataFrame en memoria
│   │   ├── normativa.py         # Ley 100/797/2381, IBL, mesada
│   │   ├── calculadoras.py      # Proyecciones, CDT, inflación, canasta
│   │   └── components/          # Dash components (legacy)
│   └── tests/
│       ├── test_extractor.py
│       ├── test_normativa.py
│       ├── test_calculadoras.py
│       └── test_components.py
└── front/
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx
    │   ├── lib/                 # Business logic (TS port)
    │   └── components/ui/       # shadcn components
    └── public/
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

## Commits
Never add `Co-Authored-By` lines to commit messages.

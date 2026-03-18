# Analizador de Pensión Colombiana

Analiza tu PDF de semanas cotizadas de Colpensiones y obtén proyecciones pensionales basadas en la normativa colombiana vigente (Ley 100/797/2381).

Todo se procesa localmente — ningún dato personal sale de tu computador.

## Requisitos

- Python 3.13+ con [uv](https://docs.astral.sh/uv/)
- Node 22+ con [pnpm](https://pnpm.io/)

## Inicio rápido

```bash
# Instalar dependencias (una sola vez)
cd backend && uv sync && cd ..
cd front && pnpm install && cd ..

# Ejecutar ambos servicios
./dev
```

Esto levanta:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Backend | http://localhost:8000 | API FastAPI (extracción PDF) |
| Frontend | http://localhost:5173 | App React + Vite |

`Ctrl+C` detiene ambos.

## Ejecutar por separado

### Backend

```bash
cd backend
uv sync
uv run python main.py    # http://localhost:8000
```

### Frontend

```bash
cd front
pnpm install
pnpm dev                  # http://localhost:5173
```

## Tests

```bash
# Backend (pytest)
cd backend && uv run pytest

# Frontend (vitest)
cd front && pnpm test
```

## API

### `POST /api/extract-pdf`

Extrae las semanas cotizadas de un PDF de Colpensiones.

```bash
curl -X POST http://localhost:8000/api/extract-pdf \
  -F "file=@mi-reporte.pdf" \
  -F "password=12345678"
```

Respuesta: `{ "data": "[{fecha_inicio, fecha_fin, empleador, semanas, salario, ...}]" }`

## Estructura

```
analizador-pension/
├── dev               # Script: levanta backend + frontend
├── backend/          # Python — FastAPI + extracción PDF
│   ├── src/
│   │   ├── api.py          # Endpoint POST /api/extract-pdf
│   │   ├── extractor.py    # PDF → datos estructurados
│   │   ├── normativa.py    # Lógica pensional (referencia)
│   │   ├── calculadoras.py # Proyecciones financieras (referencia)
│   │   └── constants.py    # Constantes normativa colombiana
│   └── tests/
└── front/            # TypeScript — React + Vite + shadcn/ui
    ├── src/
    │   ├── lib/
    │   │   ├── constants.ts    # Constantes (port de Python)
    │   │   ├── normativa.ts    # Lógica pensional (port de Python)
    │   │   └── calculadoras.ts # Proyecciones (port de Python)
    │   └── components/
    └── vitest.config.ts
```

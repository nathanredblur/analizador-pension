"""FastAPI application — Analizador de Pensión Colombiana."""

import io
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.extractor import ExtractionError, extract_semanas_df

app = FastAPI(title="Analizador de Pensión Colombiana")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.post("/api/extract-pdf")
async def extract_pdf(
    file: UploadFile = File(...),
    password: str = Form(""),
) -> JSONResponse:
    """Extract contribution data from a Colpensiones PDF.

    Accepts a multipart form with:
    - file: the encrypted PDF
    - password: PDF password (cedula)

    Returns JSON array of contribution records.
    """
    content = await file.read()

    if not content.startswith(b"%PDF-"):
        return JSONResponse(
            status_code=422,
            content={"error": "El archivo no es un PDF válido."},
        )

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        df = extract_semanas_df(tmp_path, password=password)
    except ExtractionError as exc:
        msg = str(exc).lower()
        if "password" in msg or "incorrect" in msg or "encrypt" in msg:
            return JSONResponse(
                status_code=401,
                content={"error": "Contraseña incorrecta."},
            )
        if "no table" in msg or "tabla" in msg:
            return JSONResponse(
                status_code=422,
                content={"error": "No se encontró la tabla de semanas cotizadas."},
            )
        return JSONResponse(
            status_code=422,
            content={"error": f"Error al extraer datos: {exc}"},
        )
    finally:
        tmp_path.unlink(missing_ok=True)

    if df.empty or df["semanas"].sum() == 0:
        return JSONResponse(
            status_code=422,
            content={"error": "El PDF no contiene semanas cotizadas."},
        )

    records = df.to_json(date_format="iso", orient="records")
    return JSONResponse(content={"data": records})

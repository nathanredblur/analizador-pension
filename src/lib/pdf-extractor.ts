/**
 * Client-side PDF extraction using pdf.js.
 * Decrypts and parses Colpensiones "Semanas Cotizadas" PDFs entirely
 * in the browser — no data ever leaves the user's device.
 */

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

import type { CotizacionRecord } from "@/lib/normativa";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).href;

export class ExtractionError extends Error {}

export interface PersonalData {
  nombre: string | null;
  fecha_nac: string | null;
}

export interface ExtractionResult {
  records: CotizacionRecord[];
  personalData: PersonalData;
}

// ─── Text extraction ────────────────────────────────────────────────────────

interface PositionedText {
  str: string;
  x: number;
  y: number;
}

async function extractPageLines(
  pdf: Awaited<ReturnType<typeof getDocument>["promise"]>,
  pageNum: number,
): Promise<string[]> {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();

  const items: PositionedText[] = [];
  for (const item of content.items) {
    const t = item as TextItem;
    if (!t.str || !t.str.trim()) continue;
    items.push({
      str: t.str,
      x: t.transform[4] as number,
      y: t.transform[5] as number,
    });
  }

  if (items.length === 0) return [];

  // Group by Y position (same row = within 3px tolerance)
  items.sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: PositionedText[][] = [];
  let currentRow: PositionedText[] = [];
  let currentY = items[0]!.y;

  for (const item of items) {
    if (Math.abs(item.y - currentY) > 3) {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [];
      currentY = item.y;
    }
    currentRow.push(item);
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    return row.map((t) => t.str).join(" ").trim();
  });
}

// ─── Table parsing ──────────────────────────────────────────────────────────

// pdf.js groups each table row into a single line like:
// "800210309 DIPROCON INGENIERIA 01/11/2006 30/11/2006 $0 0,00 0,00 0,00 0,00"
const ROW_RE =
  /(\d+)\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\$[\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/;

function parseCop(value: string): number {
  const cleaned = value.replace("$", "").replaceAll(".", "").replace(",", ".");
  return Number(cleaned) || 0;
}

function parseDecimal(value: string): number {
  return Number(value.replace(",", ".")) || 0;
}

function parseRecordsFromLines(allLines: string[]): CotizacionRecord[] {
  // Find table region: after [9]Total header, before [10]
  let inTable = false;
  const records: CotizacionRecord[] = [];

  for (const line of allLines) {
    if (line.includes("[9]") && /total/i.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && /\[10\]/.test(line)) {
      break;
    }
    if (!inTable) continue;

    const match = ROW_RE.exec(line);
    if (!match) continue;

    const [, nit, empleador, fechaInicioRaw, fechaFinRaw, salarioRaw, semanasRaw, licRaw, simRaw] = match;

    const [di, mi, yi] = fechaInicioRaw!.split("/");
    const [df, mf, yf] = fechaFinRaw!.split("/");

    records.push({
      fecha_inicio: `${yi}-${mi}-${di}T00:00:00.000`,
      fecha_fin: `${yf}-${mf}-${df}T00:00:00.000`,
      empleador: empleador!.trim(),
      semanas: parseDecimal(semanasRaw!),
      salario: parseCop(salarioRaw!),
      lic: parseDecimal(licRaw!),
      sim: parseDecimal(simRaw!),
      nit_aportante: nit,
    });
  }

  if (records.length === 0) {
    throw new ExtractionError(
      "No se encontró la tabla de semanas cotizadas.",
    );
  }

  return records;
}

// ─── Personal data extraction ───────────────────────────────────────────────

const BIRTH_DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})/;

function extractPersonalData(firstPageLines: string[]): PersonalData {
  const result: PersonalData = { nombre: null, fecha_nac: null };

  // pdf.js merges labels and values on the same line (same Y position):
  // "Nombre: JONATHAN ESTEBAN RICO LOZADA Correo Electrónico: ..."
  // "Tipo de Documento: Cédula ... Fecha de Nacimiento: 28/06/1984"
  for (const line of firstPageLines) {
    if (result.nombre === null && /nombre\s*:/i.test(line)) {
      // Extract text between "Nombre:" and the next label or end of line
      const afterNombre = line.replace(/.*nombre\s*:\s*/i, "");
      const beforeNextLabel = afterNombre.split(/\s+(?:correo|dirección|direccion|estado|fecha|ubicación|ubicacion)\s*/i)[0];
      const candidate = beforeNextLabel?.trim();
      if (candidate && candidate.length > 2) {
        result.nombre = candidate;
      }
    }

    if (result.fecha_nac === null && /fecha.*nacimiento/i.test(line)) {
      const afterLabel = line.replace(/.*fecha\s*(de\s*)?nacimiento\s*:\s*/i, "");
      const match = BIRTH_DATE_RE.exec(afterLabel);
      if (match) {
        result.fecha_nac = `${match[3]}-${match[2]}-${match[1]}`;
      }
    }

    if (result.nombre && result.fecha_nac) break;
  }

  return result;
}

// ─── Main API ───────────────────────────────────────────────────────────────

export async function extractFromPdf(
  file: File,
  password: string,
): Promise<ExtractionResult> {
  const buffer = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await getDocument({ data: buffer, password }).promise;
  } catch (err: unknown) {
    const msg = String(err);
    if (/password/i.test(msg) || /incorrect/i.test(msg)) {
      throw new ExtractionError("Contraseña incorrecta.");
    }
    throw new ExtractionError(`Error al abrir el PDF: ${msg}`);
  }

  const allLines: string[] = [];
  const firstPageLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const lines = await extractPageLines(pdf, p);
    allLines.push(...lines);
    if (p === 1) firstPageLines.push(...lines);
  }

  if (allLines.length === 0) {
    throw new ExtractionError("El archivo no contiene texto extraíble.");
  }

  const records = parseRecordsFromLines(allLines);
  const personalData = extractPersonalData(firstPageLines);

  const totalSemanas = records.reduce((s, r) => s + r.semanas, 0);
  if (totalSemanas === 0) {
    throw new ExtractionError("El PDF no contiene semanas cotizadas.");
  }

  return { records, personalData };
}

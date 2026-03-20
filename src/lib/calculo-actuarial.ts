/**
 * Cálculo actuarial por omisión — Decreto 1296/2022.
 *
 * Fórmula de reserva actuarial:
 *   VRA = [FAC1 × PR + FAC2 × AR] × FAC3
 *   VR  = VRA / (1 - CA)
 *   VR se actualiza de FC a fecha de pago con DTF Pensional
 */

import {
  COMISION_ADMINISTRACION,
  IPC_HISTORICO,
  SEMANAS_MIN_DECRETO,
  SMMLV_HISTORICO,
  TABLA_FAC,
  TABLA_SMN,
  TASA_TECNICA_DECRETO,
} from "@/lib/constants";
import type { Ley } from "@/lib/constants";
import { calcularTasaReemplazo } from "@/lib/normativa";

// ─── Types ──────────────────────────────────────────────────

export interface PeriodoOmision {
  fechaInicio: string; // DD/MM/YYYY
  fechaFin: string; // DD/MM/YYYY
}

export interface CalculoActuarialInput {
  periodos: PeriodoOmision[];
  salarioBase: number;
  fechaNacimiento: Date;
  sexo: "M" | "F";
  semanasCotizadasAntes: number;
  fechaPago: Date;
  ley: Ley;
}

export interface CalculoActuarialDesglose {
  fc: Date;
  fr: Date;
  er: number;
  t: number;
  n: number;
  esCaso2: boolean;
  sb: number;
  sr: number;
  tr: number;
  pr: number;
  ar: number;
  fac1: number;
  fac2: number;
  fac3: number;
  vra: number;
  vr: number;
  factorDtf: number;
  vrActualizado: number;
}

export interface FechaLimite {
  fecha: string; // DD/MM/YYYY
  total: number;
}

export interface CalculoActuarialResult {
  totalPagar: number;
  totalMeses: number;
  totalSemanas: number;
  fechaLimite1: FechaLimite;
  fechaLimite2: FechaLimite;
  desglose: CalculoActuarialDesglose;
}

// ─── Date helpers ───────────────────────────────────────────

export function parseDDMMYYYY(dateStr: string): Date {
  const parts = dateStr.split("/").map(Number);
  return new Date(parts[2]!, parts[1]! - 1, parts[0]!);
}

export function formatDDMMYYYY(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

export function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

/** Convert ISO "YYYY-MM-DD" to "DD/MM/YYYY". */
export function isoToDDMMYYYY(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// ─── SMMLV lookup ───────────────────────────────────────────

export function getSmmlv(year: number): number {
  const val = SMMLV_HISTORICO[year];
  if (val !== undefined) return val;

  const years = Object.keys(SMMLV_HISTORICO)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) return 0;
  if (year < years[0]!) return SMMLV_HISTORICO[years[0]!]!;
  return SMMLV_HISTORICO[years.at(-1)!]!;
}

// ─── Helper functions ───────────────────────────────────────

/** Last day of the most recent omission period. */
export function calcularFechaCorte(periodos: PeriodoOmision[]): Date {
  let latest = parseDDMMYYYY(periodos[0]!.fechaFin);
  for (let i = 1; i < periodos.length; i++) {
    const d = parseDDMMYYYY(periodos[i]!.fechaFin);
    if (d.getTime() > latest.getTime()) latest = d;
  }
  return latest;
}

/** Sum of days of all periods / 365.25 → years with 6 decimals. */
export function calcularTiempoOmision(
  periodos: PeriodoOmision[],
): number {
  let totalDias = 0;
  for (const p of periodos) {
    const inicio = parseDDMMYYYY(p.fechaInicio);
    const fin = parseDDMMYYYY(p.fechaFin);
    const dias =
      (fin.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000);
    totalDias += Math.max(0, dias);
  }
  return Number((totalDias / 365.25).toFixed(6));
}

/** Total months across all periods. */
export function calcularTotalMeses(
  periodos: PeriodoOmision[],
): number {
  let total = 0;
  for (const p of periodos) {
    const inicio = parseDDMMYYYY(p.fechaInicio);
    const fin = parseDDMMYYYY(p.fechaFin);
    const months =
      (fin.getFullYear() - inicio.getFullYear()) * 12 +
      (fin.getMonth() - inicio.getMonth()) +
      1;
    total += Math.max(0, months);
  }
  return total;
}

/** Age as decimal (years + fraction). */
export function calcularEdadEnFecha(
  fechaNac: Date,
  fecha: Date,
): number {
  const diffMs = fecha.getTime() - fechaNac.getTime();
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
}

/** Lookup TABLA_SMN with linear interpolation. Clamped 12–71. */
export function interpolarSMN(edad: number): number {
  const edadClamped = Math.max(12, Math.min(71, edad));
  const low = Math.floor(edadClamped);
  const high = Math.ceil(edadClamped);

  const valLow = TABLA_SMN[Math.min(71, low)] ?? TABLA_SMN[71]!;
  if (low === high) return valLow;

  const valHigh = TABLA_SMN[Math.min(71, high)] ?? TABLA_SMN[71]!;
  const frac = edadClamped - low;
  return valLow + (valHigh - valLow) * frac;
}

/** Lookup TABLA_FAC with linear interpolation. Clamped 55–90. */
export function interpolarFac(
  sexo: "M" | "F",
  edad: number,
): { fac1: number; fac2: number } {
  const tabla = TABLA_FAC[sexo];
  const edadClamped = Math.max(55, Math.min(90, edad));
  const low = Math.floor(edadClamped);
  const high = Math.ceil(edadClamped);

  const valLow = tabla[Math.min(90, low)] ?? tabla[90]!;
  if (low === high) return { ...valLow };

  const valHigh = tabla[Math.min(90, high)] ?? tabla[90]!;
  const frac = edadClamped - low;
  return {
    fac1: valLow.fac1 + (valHigh.fac1 - valLow.fac1) * frac,
    fac2: valLow.fac2 + (valHigh.fac2 - valLow.fac2) * frac,
  };
}

/** Get semanas mínimas from SEMANAS_MIN_DECRETO for a year. */
function getSemanasMinDecreto(year: number): number {
  if (year <= 2004) return SEMANAS_MIN_DECRETO[2004]!;
  if (year >= 2015) return SEMANAS_MIN_DECRETO[2015]!;
  return SEMANAS_MIN_DECRETO[year] ?? SEMANAS_MIN_DECRETO[2015]!;
}

/** Pension age by sex. */
function edadPension(sexo: "M" | "F"): number {
  return sexo === "M" ? 62 : 57;
}

/**
 * FR = max(fecha en que cumple ER, fecha en que cumple semanas).
 * Returns FR date and whether caso ii applies.
 */
export function calcularFechaReferencia(
  fechaNac: Date,
  sexo: "M" | "F",
  fc: Date,
  t: number,
  semanasCotizadasAntes: number,
): { fr: Date; esCaso2: boolean } {
  const er = edadPension(sexo);
  const fechaEdadER = new Date(fechaNac);
  fechaEdadER.setFullYear(fechaEdadER.getFullYear() + er);

  const semanasOmision = Math.round((t * 365.25) / 7);
  const semanasTotal = semanasCotizadasAntes + semanasOmision;
  const semMin = getSemanasMinDecreto(fc.getFullYear());
  const semanasFaltantes = Math.max(0, semMin - semanasTotal);
  const diasParaCumplir = semanasFaltantes * 7;
  const fechaCumplimiento = new Date(
    fc.getTime() + diasParaCumplir * 24 * 60 * 60 * 1000,
  );

  const fr =
    fechaEdadER.getTime() > fechaCumplimiento.getTime()
      ? fechaEdadER
      : fechaCumplimiento;

  const esCaso2 = semanasCotizadasAntes > 0;
  return { fr, esCaso2 };
}

/**
 * FAC3 factor.
 * Normal: (1.03^t − 1) / (1.03^(t+n) − 1)
 * Caso ii: (1.03^t1 − 1) / (1.03^(t1+n) − 1) × (t/t1)
 */
export function calcularFAC3(
  t: number,
  n: number,
  esCaso2: boolean,
  semanasCotizadasAntes: number,
): number {
  const r = TASA_TECNICA_DECRETO;

  if (esCaso2) {
    const t1 = t + (semanasCotizadasAntes * 7) / 365.25;
    const num = (1 + r) ** t1 - 1;
    const den = (1 + r) ** (t1 + n) - 1;
    if (den === 0) return 0;
    return (num / den) * (t / t1);
  }

  const num = (1 + r) ** t - 1;
  const den = (1 + r) ** (t + n) - 1;
  if (den === 0) return 0;
  return num / den;
}

/** Get IPC for a year; defaults to 0.05 if not in table. */
function getIpc(year: number): number {
  return IPC_HISTORICO[year] ?? 0.05;
}

/**
 * DTF Pensional factor from FC to fechaPago.
 * Product of (1.03 × (1 + IPC_año_anterior)) per year,
 * prorating partial years.
 */
export function calcularFactorDTF(
  fc: Date,
  fechaPago: Date,
): number {
  const fcTime = fc.getTime();
  const pagoTime = fechaPago.getTime();
  if (pagoTime <= fcTime) return 1;

  const diffYears =
    (pagoTime - fcTime) / (365.25 * 24 * 60 * 60 * 1000);
  const fcYear = fc.getFullYear();
  const pagoYear = fechaPago.getFullYear();

  if (diffYears <= 1) {
    const ipc = getIpc(fcYear);
    const tasaAnual = (1 + TASA_TECNICA_DECRETO) * (1 + ipc) - 1;
    return 1 + tasaAnual * diffYears;
  }

  let factor = 1;
  for (let y = fcYear; y <= pagoYear; y++) {
    const yearStart = new Date(y, 0, 1).getTime();
    const yearEnd = new Date(y + 1, 0, 1).getTime();
    const overlapStart = Math.max(fcTime, yearStart);
    const overlapEnd = Math.min(pagoTime, yearEnd);
    if (overlapEnd <= overlapStart) continue;

    const yearSpan = yearEnd - yearStart;
    const fraction = (overlapEnd - overlapStart) / yearSpan;
    const ipc = getIpc(y);
    const tasaAnual = (1 + TASA_TECNICA_DECRETO) * (1 + ipc) - 1;
    factor *= 1 + tasaAnual * fraction;
  }
  return factor;
}

// ─── Core calculation for a specific payment date ───────────

function calcularParaFechaPago(
  input: Omit<CalculoActuarialInput, "fechaPago">,
  fechaPago: Date,
): { total: number; desglose: CalculoActuarialDesglose } {
  const { periodos, salarioBase, fechaNacimiento, sexo, ley } = input;
  const semCotAntes = input.semanasCotizadasAntes;

  const fc = calcularFechaCorte(periodos);
  const t = calcularTiempoOmision(periodos);
  const er = edadPension(sexo);

  const { fr, esCaso2 } = calcularFechaReferencia(
    fechaNacimiento, sexo, fc, t, semCotAntes,
  );

  const n =
    (fr.getTime() - fc.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  const smmlvFc = getSmmlv(fc.getFullYear());
  const sb = Math.max(salarioBase, smmlvFc);
  const sbClamped = Math.min(sb, 25 * smmlvFc);

  const edadFc = calcularEdadEnFecha(fechaNacimiento, fc);
  const edadFr = calcularEdadEnFecha(fechaNacimiento, fr);
  const smnFc = interpolarSMN(edadFc);
  const smnFr = interpolarSMN(edadFr);
  const sr = smnFc > 0 ? sbClamped * (smnFr / smnFc) : sbClamped;

  const semanasOmision = Math.round((t * 365.25) / 7);
  const semanasTotal = semCotAntes + semanasOmision;
  const tr = calcularTasaReemplazo(semanasTotal, ley);

  const pr = Math.max(smmlvFc, Math.min(sr * tr, 25 * smmlvFc));
  const ar = Math.max(
    Math.min(pr, 10 * smmlvFc),
    Math.min(5 * smmlvFc, pr),
  );

  const { fac1, fac2 } = interpolarFac(sexo, edadFr);
  const fac3 = calcularFAC3(t, Math.max(0, n), esCaso2, semCotAntes);

  const vra = (fac1 * pr + fac2 * ar) * fac3;
  const vr = vra / (1 - COMISION_ADMINISTRACION);

  const factorDtf = calcularFactorDTF(fc, fechaPago);
  const vrActualizado = vr * factorDtf;

  const desglose: CalculoActuarialDesglose = {
    fc, fr, er, t, n, esCaso2,
    sb: sbClamped, sr, tr, pr, ar,
    fac1, fac2, fac3,
    vra, vr, factorDtf,
    vrActualizado,
  };

  return { total: Math.round(vrActualizado), desglose };
}

// ─── Public API ─────────────────────────────────────────────

export function calcularCalculoActuarial(
  input: CalculoActuarialInput,
): CalculoActuarialResult {
  const { fechaPago, ...rest } = input;

  const pagoYear = fechaPago.getFullYear();
  const pagoMonth = fechaPago.getMonth();
  const limite1Date = endOfMonth(pagoYear, pagoMonth);

  const nextMonth = pagoMonth + 1;
  const l2Year = nextMonth > 11 ? pagoYear + 1 : pagoYear;
  const l2Month = nextMonth > 11 ? 0 : nextMonth;
  const limite2Date = endOfMonth(l2Year, l2Month);

  const result1 = calcularParaFechaPago(rest, limite1Date);
  const result2 = calcularParaFechaPago(rest, limite2Date);

  const totalMeses = calcularTotalMeses(input.periodos);
  const totalSemanas = Math.round(
    (calcularTiempoOmision(input.periodos) * 365.25) / 7,
  );

  return {
    totalPagar: result1.total,
    totalMeses,
    totalSemanas,
    fechaLimite1: {
      fecha: formatDDMMYYYY(limite1Date),
      total: result1.total,
    },
    fechaLimite2: {
      fecha: formatDDMMYYYY(limite2Date),
      total: result2.total,
    },
    desglose: result1.desglose,
  };
}

/**
 * Calculadoras financieras: proyecciones, CDT, inflación, canasta familiar.
 */

import {
  CANASTA_ARRIENDO_ESTRATO_2,
  CANASTA_ARRIENDO_ESTRATO_3,
  CANASTA_ARRIENDO_ESTRATO_4,
  CANASTA_MERCADO_FAMILIAR,
  CANASTA_SALUD_MEDICAMENTOS,
  CANASTA_SERVICIOS_PUBLICOS,
  CANASTA_TRANSPORTE,
  SMMLV_HISTORICO,
} from "@/lib/constants";

const SMMLV_FALLBACK = SMMLV_HISTORICO[2025]!;

// ─── Proyección pensional ─────────────────────────────────────────────────────

export function proyectarMesadaReal(
  mesadaHoy: number,
  anios: number,
  inflacion: number,
): number {
  return mesadaHoy * (1 + inflacion) ** anios;
}

// ─── CDT / Ahorro complementario ─────────────────────────────────────────────

export function calcularAhorroMensualNecesario(
  capitalObjetivo: number,
  tasaAnual: number,
  anios: number,
): number {
  const r = tasaAnual / 12;
  const n = anios * 12;
  if (r === 0) return capitalObjetivo / n;
  return (capitalObjetivo * r) / ((1 + r) ** n - 1);
}

export function calcularCrecimientoCapital(
  cuotaMensual: number,
  tasaAnual: number,
  anios: number,
): number[] {
  const rMensual = tasaAnual / 12;
  let capital = 0;
  const resultado = [0];

  for (let anio = 1; anio <= anios; anio++) {
    for (let mes = 0; mes < 12; mes++) {
      capital = capital * (1 + rMensual) + cuotaMensual;
    }
    resultado.push(Math.round(capital * 100) / 100);
  }

  return resultado;
}

// ─── Canasta familiar ─────────────────────────────────────────────────────────

const ARRIENDOS: Record<number, number> = {
  2: CANASTA_ARRIENDO_ESTRATO_2,
  3: CANASTA_ARRIENDO_ESTRATO_3,
  4: CANASTA_ARRIENDO_ESTRATO_4,
};

export interface CanastaFamiliar {
  arriendo: number;
  mercado: number;
  servicios: number;
  transporte: number;
  salud: number;
  total: number;
}

export function calcularCanastaFamiliar(estrato: number): CanastaFamiliar {
  const arriendo = ARRIENDOS[estrato] ?? CANASTA_ARRIENDO_ESTRATO_2;
  const mercado = CANASTA_MERCADO_FAMILIAR;
  const servicios = CANASTA_SERVICIOS_PUBLICOS;
  const transporte = CANASTA_TRANSPORTE;
  const salud = CANASTA_SALUD_MEDICAMENTOS;
  const total = arriendo + mercado + servicios + transporte + salud;
  return { arriendo, mercado, servicios, transporte, salud, total };
}

// ─── Conversión SMMLV ─────────────────────────────────────────────────────────

export function calcularSmmlvEquivalente(
  monto: number,
  anio: number,
): number {
  const smmlv = SMMLV_HISTORICO[anio] ?? SMMLV_FALLBACK;
  return monto / smmlv;
}

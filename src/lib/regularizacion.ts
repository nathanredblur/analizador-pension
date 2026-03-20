import { TASA_COTIZACION } from "@/lib/constants";
import type { Ley } from "@/lib/constants";
import type {
  CotizacionRecord,
  GapRecord,
} from "@/lib/normativa";
import { calcularTasaReemplazo } from "@/lib/normativa";

export interface Factibilidad {
  badge: string;
  posible: boolean;
}

export interface ImpactoRegularizacion {
  costoTotal: number;
  semanasNuevas: number;
  semanasFaltantesNuevas: number;
  iblNuevo: number | null;
  mesadaNueva: number | null;
  gaps: Array<{
    gap: GapRecord;
    costo: number;
    factibilidad: Factibilidad;
  }>;
}

export function calcularCostoRegularizacion(
  gap: GapRecord,
  salarioReferencia: number,
): number {
  return salarioReferencia * TASA_COTIZACION * gap.duracion_semanas;
}

export function findNearestSalary(
  gap: GapRecord,
  records: CotizacionRecord[],
): number {
  const sorted = [...records].sort(
    (a, b) =>
      new Date(a.fecha_inicio).getTime() -
      new Date(b.fecha_inicio).getTime(),
  );
  const gapStart = new Date(gap.fecha_inicio).getTime();
  let closest: CotizacionRecord | null = null;
  let minDist = Infinity;
  for (const r of sorted) {
    const endTs = new Date(r.fecha_fin).getTime();
    const startTs = new Date(r.fecha_inicio).getTime();
    const dist = Math.min(
      Math.abs(endTs - gapStart),
      Math.abs(startTs - gapStart),
    );
    if (dist < minDist) {
      minDist = dist;
      closest = r;
    }
  }
  return closest?.salario ?? 0;
}

export function determinarFactibilidad(gap: GapRecord): Factibilidad {
  if (gap.empleador_anterior === gap.empleador_siguiente) {
    return {
      badge:
        "Reclamable ante UGPP — responsabilidad del empleador",
      posible: true,
    };
  }
  return {
    badge:
      "Posiblemente regularizable — consulta si tuviste ingresos durante este período",
    posible: true,
  };
}

export function calcularImpactoRegularizacion(
  gaps: GapRecord[],
  salarioReferencia: number,
  semanasActuales: number,
  semanasRequeridas: number,
  iblActual: number,
  ley: Ley,
): ImpactoRegularizacion {
  let costoTotal = 0;
  let semanasAgregadas = 0;
  const detalles = [];

  for (const gap of gaps) {
    const costo = calcularCostoRegularizacion(
      gap,
      salarioReferencia,
    );
    const factibilidad = determinarFactibilidad(gap);
    costoTotal += costo;
    semanasAgregadas += gap.duracion_semanas;
    detalles.push({ gap, costo, factibilidad });
  }

  const semanasNuevas = semanasActuales + semanasAgregadas;
  const semanasFaltantesNuevas = Math.max(
    0,
    semanasRequeridas - semanasNuevas,
  );

  const tasaNueva = calcularTasaReemplazo(semanasNuevas, ley);
  const mesadaNueva = iblActual * tasaNueva;

  return {
    costoTotal: Math.round(costoTotal),
    semanasNuevas,
    semanasFaltantesNuevas,
    iblNuevo: null,
    mesadaNueva: Math.round(mesadaNueva),
    gaps: detalles,
  };
}

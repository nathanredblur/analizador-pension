/**
 * Lógica pensional colombiana: Ley 100/797/2381.
 * Todas las funciones son puras — sin efectos secundarios.
 */

import {
  DESCUENTO_SEMANAS_POR_HIJO,
  EDAD_PENSION_HOMBRE,
  EDAD_PENSION_MUJER,
  INCREMENTO_SEMANAS_TASA,
  INCREMENTO_TASA_POR_BLOQUE,
  MAX_HIJOS_DESCUENTO,
  SEMANAS_BASE_TASA,
  SEMANAS_REQUERIDAS_HOMBRE,
  SEMANAS_REQUERIDAS_MUJER_POR_ANIO,
  TASA_REEMPLAZO_MAX,
  TASA_REEMPLAZO_MIN,
  TRASLADO_FECHA_LIMITE,
  TRASLADO_HOMBRE_EDAD_MIN,
  TRASLADO_MUJER_EDAD_MIN,
  TRANSICION_2381_FECHA_CORTE_SEMANAS,
  TRANSICION_2381_SEMANAS_HOMBRE,
  TRANSICION_2381_SEMANAS_MUJER,
} from "@/lib/constants";

export interface CotizacionRecord {
  fecha_inicio: string;
  fecha_fin: string;
  empleador: string;
  semanas: number;
  salario: number;
  lic: number;
  sim: number;
  nit_aportante?: string;
}

export interface TransicionResult {
  califica: boolean;
  semanas_al_corte: number;
  umbral: number;
  semanas_faltantes_umbral: number;
}

export interface TrasladoResult {
  califica: boolean;
  dentro_plazo: boolean;
  edad: number;
  edad_min: number;
  semanas_min: number;
  dias_restantes: number;
}

export interface GapRecord {
  fecha_inicio: string;
  fecha_fin: string;
  duracion_dias: number;
  duracion_semanas: number;
  empleador_anterior: string;
  empleador_siguiente: string;
}

export interface PensionEstimate {
  fecha_pension: Date;
  semanas_cotizadas: number;
  semanas_requeridas: number;
  semanas_faltantes: number;
  anios_restantes: number;
  limitante: "semanas" | "edad" | "ambas";
  fecha_por_semanas: Date;
  fecha_por_edad: Date;
}

// ─── Semanas ──────────────────────────────────────────────────────────────────

export function calcularSemanasAlCorte(
  records: CotizacionRecord[],
  corte: Date,
): number {
  return records
    .filter((r) => new Date(r.fecha_inicio) < corte)
    .reduce((sum, r) => sum + r.semanas, 0);
}

export function semanasRequeridas(sexo: string, anio: number): number {
  if (sexo === "M") return SEMANAS_REQUERIDAS_HOMBRE;
  const clamped = Math.max(2025, Math.min(anio, 2036));
  return SEMANAS_REQUERIDAS_MUJER_POR_ANIO[clamped]!;
}

export function descuentoSemanasPorHijos(
  baseSemanas: number,
  nHijos: number,
): number {
  const descuento =
    Math.min(nHijos, MAX_HIJOS_DESCUENTO) * DESCUENTO_SEMANAS_POR_HIJO;
  return baseSemanas - descuento;
}

export function semanasFaltantes(
  records: CotizacionRecord[],
  sexo: string,
  nHijos: number,
  anio: number,
): number {
  const cotizadas = records.reduce((sum, r) => sum + r.semanas, 0);
  let requeridas = semanasRequeridas(sexo, anio);
  if (sexo === "F") {
    requeridas = descuentoSemanasPorHijos(requeridas, nHijos);
  }
  return Math.max(0, requeridas - cotizadas);
}

// ─── IBL y Mesada ─────────────────────────────────────────────────────────────

export function calcularIBL(
  records: CotizacionRecord[],
  anios: number = 10,
): number {
  if (records.length === 0) return 0;

  const fechas = records.map((r) => new Date(r.fecha_fin).getTime());
  const fechaMax = new Date(Math.max(...fechas));
  const fechaCorte = new Date(fechaMax);
  fechaCorte.setFullYear(fechaCorte.getFullYear() - anios);

  const recientes = records.filter(
    (r) => new Date(r.fecha_fin) >= fechaCorte,
  );

  const totalSem = recientes.reduce((sum, r) => sum + r.semanas, 0);
  if (recientes.length === 0 || totalSem === 0) {
    return records.reduce((sum, r) => sum + r.salario, 0) / records.length;
  }

  const weightedSum = recientes.reduce(
    (sum, r) => sum + r.salario * r.semanas,
    0,
  );
  return weightedSum / totalSem;
}

export function calcularMesada(ibl: number): [number, number] {
  return [ibl * TASA_REEMPLAZO_MIN, ibl * TASA_REEMPLAZO_MAX];
}

export function calcularTasaReemplazo(semanasCotizadas: number): number {
  const bloques = Math.max(
    0,
    (semanasCotizadas - SEMANAS_BASE_TASA) / INCREMENTO_SEMANAS_TASA,
  );
  return Math.min(
    TASA_REEMPLAZO_MIN + bloques * INCREMENTO_TASA_POR_BLOQUE,
    TASA_REEMPLAZO_MAX,
  );
}

// ─── Transición y Traslado ────────────────────────────────────────────────────

export function calificaTransicion2381(
  records: CotizacionRecord[],
  sexo: string,
): TransicionResult {
  const umbral =
    sexo === "F"
      ? TRANSICION_2381_SEMANAS_MUJER
      : TRANSICION_2381_SEMANAS_HOMBRE;
  const corte = new Date(TRANSICION_2381_FECHA_CORTE_SEMANAS);
  const semanasCorte = calcularSemanasAlCorte(records, corte);
  return {
    califica: semanasCorte >= umbral,
    semanas_al_corte: semanasCorte,
    umbral,
    semanas_faltantes_umbral: Math.max(0, umbral - semanasCorte),
  };
}

export function calificaTrasladoRegimen(
  semanas: number,
  sexo: string,
  fechaNacimiento: Date,
  fechaCalculo: Date = new Date(),
): TrasladoResult {
  const limiteTraslado = new Date(TRASLADO_FECHA_LIMITE);
  const dentroPlazo = fechaCalculo <= limiteTraslado;
  const edad = Math.floor(
    (fechaCalculo.getTime() - fechaNacimiento.getTime()) /
      (365 * 24 * 60 * 60 * 1000),
  );

  const edadMin =
    sexo === "F" ? TRASLADO_MUJER_EDAD_MIN : TRASLADO_HOMBRE_EDAD_MIN;
  const semMin =
    sexo === "F"
      ? TRANSICION_2381_SEMANAS_MUJER
      : TRANSICION_2381_SEMANAS_HOMBRE;

  const califica = dentroPlazo && edad >= edadMin && semanas >= semMin;
  const diasRestantes = Math.max(
    0,
    Math.floor(
      (limiteTraslado.getTime() - fechaCalculo.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  return {
    califica,
    dentro_plazo: dentroPlazo,
    edad,
    edad_min: edadMin,
    semanas_min: semMin,
    dias_restantes: diasRestantes,
  };
}

// ─── Gaps ─────────────────────────────────────────────────────────────────────

export function calcularGaps(
  records: CotizacionRecord[],
  minSemanas: number = 1.0,
): GapRecord[] {
  if (records.length < 2) return [];

  const sorted = [...records].sort(
    (a, b) =>
      new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime(),
  );

  const gaps: GapRecord[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const finActual = new Date(sorted[i]!.fecha_fin);
    const inicioSiguiente = new Date(sorted[i + 1]!.fecha_inicio);

    const gapDias =
      Math.floor(
        (inicioSiguiente.getTime() - finActual.getTime()) /
          (24 * 60 * 60 * 1000),
      ) - 1;

    if (gapDias <= 0) continue;

    const gapSemanas = gapDias / 7.0;
    if (gapSemanas < minSemanas) continue;

    const gapStart = new Date(finActual);
    gapStart.setDate(gapStart.getDate() + 1);
    const gapEnd = new Date(inicioSiguiente);
    gapEnd.setDate(gapEnd.getDate() - 1);

    gaps.push({
      fecha_inicio: gapStart.toISOString().split("T")[0]!,
      fecha_fin: gapEnd.toISOString().split("T")[0]!,
      duracion_dias: gapDias,
      duracion_semanas: Math.round(gapSemanas * 100) / 100,
      empleador_anterior: sorted[i]!.empleador,
      empleador_siguiente: sorted[i + 1]!.empleador,
    });
  }

  gaps.sort((a, b) => b.duracion_semanas - a.duracion_semanas);
  return gaps;
}

// ─── Proyección de pensión ────────────────────────────────────────────────────

export function fechaEstimadaPension(
  records: CotizacionRecord[],
  sexo: string,
  fechaNacimiento: Date,
  nHijos: number,
  semanasPorAnio: number = 52.0,
  fechaHoy: Date = new Date(),
): PensionEstimate {
  const semanasActuales = records.reduce((sum, r) => sum + r.semanas, 0);
  let anioProyectado = fechaHoy.getFullYear();

  const edadPension = sexo === "M" ? EDAD_PENSION_HOMBRE : EDAD_PENSION_MUJER;
  const fechaPorEdad = new Date(fechaNacimiento);
  fechaPorEdad.setFullYear(fechaNacimiento.getFullYear() + edadPension);

  let semanasAcumuladas = semanasActuales;
  let fechaPorSemanas = new Date(fechaHoy);

  while (anioProyectado <= fechaHoy.getFullYear() + 80) {
    let requeridas = semanasRequeridas(sexo, anioProyectado);
    if (sexo === "F") {
      requeridas = descuentoSemanasPorHijos(requeridas, nHijos);
    }
    if (semanasAcumuladas >= requeridas) break;

    semanasAcumuladas += semanasPorAnio;
    anioProyectado += 1;
    fechaPorSemanas = new Date(fechaPorSemanas);
    fechaPorSemanas.setFullYear(anioProyectado);
  }

  const fechaPension =
    fechaPorSemanas > fechaPorEdad ? fechaPorSemanas : fechaPorEdad;

  let limitante: "semanas" | "edad" | "ambas";
  if (fechaPorSemanas >= fechaPorEdad) {
    limitante = "semanas";
  } else if (fechaPorEdad > fechaPorSemanas) {
    limitante = "edad";
  } else {
    limitante = "ambas";
  }

  const diasRestantes = Math.max(
    0,
    Math.floor(
      (fechaPension.getTime() - fechaHoy.getTime()) / (24 * 60 * 60 * 1000),
    ),
  );
  const aniosRestantes = Math.round((diasRestantes / 365.25) * 10) / 10;

  let requeridasFinal = semanasRequeridas(sexo, fechaPension.getFullYear());
  if (sexo === "F") {
    requeridasFinal = descuentoSemanasPorHijos(requeridasFinal, nHijos);
  }

  return {
    fecha_pension: fechaPension,
    semanas_cotizadas: semanasActuales,
    semanas_requeridas: requeridasFinal,
    semanas_faltantes: Math.max(0, requeridasFinal - semanasActuales),
    anios_restantes: aniosRestantes,
    limitante,
    fecha_por_semanas: fechaPorSemanas,
    fecha_por_edad: fechaPorEdad,
  };
}

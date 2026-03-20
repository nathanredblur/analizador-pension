import { TASA_COTIZACION } from "@/lib/constants";
import type { CotizacionRecord } from "@/lib/normativa";

export type PerfilRiesgo = "conservador" | "moderado" | "agresivo";

const TASAS_ANUALES: Record<PerfilRiesgo, number> = {
  conservador: 0.035,
  moderado: 0.06,
  agresivo: 0.12,
};

const MESES_EXPECTATIVA_VIDA = 240;

export interface RAISEstimacion {
  capitalAcumulado: number;
  mesadaEstimada: number;
  mesesPension: number;
  perfilRiesgo: PerfilRiesgo;
}

export function estimarPensionRAIS(
  records: CotizacionRecord[],
  perfil: PerfilRiesgo,
): RAISEstimacion {
  const tasaAnual = TASAS_ANUALES[perfil];
  const tasaMensual = tasaAnual / 12;

  let capital = 0;

  const sorted = [...records].sort(
    (a, b) =>
      new Date(a.fecha_inicio).getTime() -
      new Date(b.fecha_inicio).getTime(),
  );

  let lastEndDate: Date | null = null;

  for (const record of sorted) {
    const startDate = new Date(record.fecha_inicio);

    if (lastEndDate) {
      const gapMonths = Math.max(
        0,
        Math.round(
          (startDate.getTime() - lastEndDate.getTime()) /
            (30.44 * 24 * 60 * 60 * 1000),
        ),
      );
      capital = capital * (1 + tasaMensual) ** gapMonths;
    }

    const cotizacionMensual = record.salario * TASA_COTIZACION;
    const meses = Math.round(record.semanas / 4.33);

    for (let i = 0; i < meses; i++) {
      capital = capital * (1 + tasaMensual) + cotizacionMensual;
    }

    lastEndDate = new Date(record.fecha_fin);
  }

  const mesadaEstimada = capital / MESES_EXPECTATIVA_VIDA;

  return {
    capitalAcumulado: Math.round(capital),
    mesadaEstimada: Math.round(mesadaEstimada),
    mesesPension: MESES_EXPECTATIVA_VIDA,
    perfilRiesgo: perfil,
  };
}

export function calcularDiferenciaAcumulada(
  mesadaRPM: number,
  mesadaRAIS: number,
  anios: number,
): number {
  return (mesadaRPM - mesadaRAIS) * 12 * anios;
}

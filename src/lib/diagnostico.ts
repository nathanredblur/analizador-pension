import type { Ley } from "@/lib/constants";
import type { CotizacionRecord } from "@/lib/normativa";
import {
  calcularGaps,
  calcularTasaReemplazo,
  calificaTrasladoRegimen,
  semanasRequeridas,
} from "@/lib/normativa";

export type SemaforoColor = "green" | "yellow" | "red";

export interface Alerta {
  type: "gap" | "traslado" | "salario" | "tasa" | "positivo";
  title: string;
  description: string;
  severity: "info" | "warning" | "positive";
}

export interface Recomendacion {
  action: string;
  link: string;
  impact: "alto" | "medio" | "bajo";
}

export function calcularSemaforo(
  semanasCotizadas: number,
  semanasReq: number,
  aniosRestantes: number,
  _ley: Ley,
): SemaforoColor {
  const ratio = semanasCotizadas / semanasReq;
  const faltantes = Math.max(0, semanasReq - semanasCotizadas);

  if (ratio >= 0.9 && aniosRestantes <= 5) return "green";
  if (semanasCotizadas >= semanasReq) return "green";

  if (ratio < 0.6) return "red";
  if (aniosRestantes > 0 && faltantes / aniosRestantes > 52) return "red";

  return "yellow";
}

export function generarAlertas(
  records: CotizacionRecord[],
  sexo: string,
  fechaNac: Date,
  _nHijos: number,
  ley: Ley,
): Alerta[] {
  const alerts: Alerta[] = [];
  const gaps = calcularGaps(records, 26);

  if (gaps.length === 0) {
    alerts.push({
      type: "positivo",
      title: "No tienes vacíos significativos en tu cotización",
      description: "Tu historial de cotización es continuo.",
      severity: "positive",
    });
  } else {
    for (const gap of gaps.slice(0, 2)) {
      alerts.push({
        type: "gap",
        title: `Gap de ${Math.round(gap.duracion_semanas)} semanas (${gap.fecha_inicio} → ${gap.fecha_fin})`,
        description:
          `Entre ${gap.empleador_anterior} y ${gap.empleador_siguiente}.`,
        severity: "warning",
      });
    }
  }

  const totalSemanas = records.reduce((s, r) => s + r.semanas, 0);
  const traslado = calificaTrasladoRegimen(
    totalSemanas,
    sexo,
    fechaNac,
  );
  if (traslado.califica) {
    alerts.push({
      type: "traslado",
      title: "Podrías ser elegible para traslado de régimen",
      description:
        `Cumples edad (${traslado.edad} años) y semanas (${totalSemanas}). Fecha límite: 16 de julio de 2026.`,
      severity: "info",
    });
  }

  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.fecha_fin).getTime() - new Date(a.fecha_fin).getTime(),
  );
  if (sorted.length >= 2) {
    const recent = sorted[0]!.salario;
    const older =
      sorted[Math.min(sorted.length - 1, 4)]!.salario;
    if (recent > older * 1.2) {
      alerts.push({
        type: "salario",
        title: "Tu salario ha crecido significativamente",
        description:
          "Esto beneficia tu IBL. Mantener o mejorar este nivel aumentará tu pensión.",
        severity: "positive",
      });
    }
  }

  const tasa = calcularTasaReemplazo(totalSemanas, ley);
  if (tasa < 0.7) {
    const base = ley === "ley100" ? 1000 : 1300;
    const semanasParaSiguiente = Math.round(
      50 - ((totalSemanas - base) % 50),
    );
    const mesesEquiv = Math.round(semanasParaSiguiente / 4.33);
    alerts.push({
      type: "tasa",
      title: `Tu tasa de reemplazo es ${Math.round(tasa * 100)}%`,
      description:
        `Con ${semanasParaSiguiente} semanas más (~${mesesEquiv} meses) subirías 1.5 puntos. Máximo posible: 80%.`,
      severity: "info",
    });
  }

  return alerts.slice(0, 4);
}

export function generarRecomendaciones(
  records: CotizacionRecord[],
  sexo: string,
  fechaNac: Date,
  _nHijos: number,
  ley: Ley,
): Recomendacion[] {
  const recs: Recomendacion[] = [];
  const gaps = calcularGaps(records);
  const totalSemanas = records.reduce((s, r) => s + r.semanas, 0);
  const requeridas = semanasRequeridas(
    sexo,
    new Date().getFullYear(),
    ley,
  );
  const faltantes = Math.round(Math.max(0, requeridas - totalSemanas));

  if (faltantes > 0) {
    const anios = Math.floor(faltantes / 52);
    const meses = Math.round((faltantes % 52) / 4.33);
    const equiv =
      anios > 0 ? `~${anios} años ${meses > 0 ? `${meses} meses` : ""}` : `~${meses} meses`;
    recs.push({
      action:
        `Cotiza sin interrupción — te faltan ${faltantes} semanas (${equiv}) para cumplir el requisito`,
      link: "situacion",
      impact: "alto",
    });
  }

  const traslado = calificaTrasladoRegimen(
    totalSemanas,
    sexo,
    fechaNac,
  );
  if (traslado.califica) {
    recs.push({
      action:
        "Evalúa el traslado de régimen — agenda la doble asesoría antes de julio 2026",
      link: "compara",
      impact: "alto",
    });
  }

  if (gaps.length > 0) {
    recs.push({
      action:
        "Considera regularizar tus vacíos de cotización — revisa costos en Tu Futuro",
      link: "futuro",
      impact: "medio",
    });
  } else {
    recs.push({
      action:
        "Considera ahorro complementario con CDT para complementar tu pensión",
      link: "futuro",
      impact: "medio",
    });
  }

  return recs.slice(0, 3);
}

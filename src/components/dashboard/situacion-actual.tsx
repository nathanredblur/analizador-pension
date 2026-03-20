import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate, parseLocalDate, safeDate } from "@/lib/dates";
import {
  calcularGaps,
  calcularIBL,
  calcularTasaReemplazo,
  calificaTrasladoRegimen,
  fechaEstimadaPension,
  semanasFaltantes,
  semanasRequeridas,
  descuentoSemanasPorHijos,
} from "@/lib/normativa";
import type { CotizacionRecord, GapRecord } from "@/lib/normativa";
import {
  EDAD_PENSION_HOMBRE,
  EDAD_PENSION_MUJER,
} from "@/lib/constants";
import type { Ley } from "@/lib/constants";
import { calcularSmmlvEquivalente } from "@/lib/calculadoras";
import {
  determinarFactibilidad,
  findNearestSalary,
} from "@/lib/regularizacion";
import {
  calcularCalculoActuarial,
  isoToDDMMYYYY,
} from "@/lib/calculo-actuarial";
import { Term } from "@/components/ui/term";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SectionProps } from "@/components/dashboard/types";

const EMPLOYER_COLORS = [
  "oklch(0.555 0.25 29)",
  "oklch(0.55 0.2 155)",
  "oklch(0.55 0.2 260)",
  "oklch(0.6 0.2 50)",
  "oklch(0.5 0.2 310)",
  "oklch(0.55 0.15 200)",
  "oklch(0.6 0.15 90)",
  "oklch(0.5 0.2 0)",
];

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSemanasFaltantes(faltantes: number): string {
  if (faltantes === 0) return "Ya cumpliste el requisito";
  const anios = Math.floor(faltantes / 52);
  const meses = Math.round((faltantes % 52) / 4.33);
  if (anios === 0) return `${meses} meses cotizando`;
  if (meses === 0) return `${anios} años cotizando`;
  return `${anios} años ${meses} meses cotizando`;
}

interface GanttPeriod {
  startPct: number;
  widthPct: number;
  fechaInicio: string;
  fechaFin: string;
  semanas: number;
  salario: number;
}

interface GanttRow {
  empleador: string;
  color: string;
  periods: GanttPeriod[];
}

function buildGanttRows(records: CotizacionRecord[]): {
  rows: GanttRow[];
  minTs: number;
  maxTs: number;
  yearTicks: number[];
} {
  if (records.length === 0) {
    return { rows: [], minTs: 0, maxTs: 0, yearTicks: [] };
  }

  const allStarts = records.map((r) => safeDate(r.fecha_inicio).getTime());
  const allEnds = records.map((r) => safeDate(r.fecha_fin).getTime());
  const minTs = Math.min(...allStarts);
  const maxTs = Math.max(...allEnds);
  const totalSpan = maxTs - minTs || 1;

  const grouped = new Map<string, CotizacionRecord[]>();
  for (const r of records) {
    const list = grouped.get(r.empleador) ?? [];
    list.push(r);
    grouped.set(r.empleador, list);
  }

  const employerOrder = [...grouped.keys()].sort((a, b) => {
    const aMin = Math.min(
      ...grouped.get(a)!.map((r) => safeDate(r.fecha_inicio).getTime()),
    );
    const bMin = Math.min(
      ...grouped.get(b)!.map((r) => safeDate(r.fecha_inicio).getTime()),
    );
    return aMin - bMin;
  });

  const rows: GanttRow[] = employerOrder.map((empleador, i) => {
    const recs = grouped.get(empleador)!;
    const color = EMPLOYER_COLORS[i % EMPLOYER_COLORS.length]!;
    const periods = recs
      .sort(
        (a, b) =>
          safeDate(a.fecha_inicio).getTime() -
          safeDate(b.fecha_inicio).getTime(),
      )
      .map((r) => {
        const startTs = safeDate(r.fecha_inicio).getTime();
        const endTs = safeDate(r.fecha_fin).getTime();
        return {
          startPct: ((startTs - minTs) / totalSpan) * 100,
          widthPct: Math.max(0.3, ((endTs - startTs) / totalSpan) * 100),
          fechaInicio: formatDate(safeDate(r.fecha_inicio), {
            year: "numeric",
            month: "short",
          }),
          fechaFin: formatDate(safeDate(r.fecha_fin), {
            year: "numeric",
            month: "short",
          }),
          semanas: r.semanas,
          salario: r.salario,
        };
      });
    return { empleador, color, periods };
  });

  const minYear = new Date(minTs).getFullYear();
  const maxYear = new Date(maxTs).getFullYear();
  const yearTicks: number[] = [];
  for (let y = minYear; y <= maxYear + 1; y++) {
    yearTicks.push(y);
  }

  return { rows, minTs, maxTs, yearTicks };
}

function GanttTimeline({ records }: { records: CotizacionRecord[] }) {
  const { rows, minTs, maxTs, yearTicks } = useMemo(
    () => buildGanttRows(records),
    [records],
  );
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);

  if (rows.length === 0) return null;

  const totalSpan = maxTs - minTs || 1;

  return (
    <div className="w-full">
      <div>
        <div className="relative">
          {/* Year grid lines */}
          {yearTicks.map((year) => {
            const ts = new Date(year, 0, 1).getTime();
            const pct = ((ts - minTs) / totalSpan) * 100;
            return (
              <div
                key={year}
                className="pointer-events-none absolute top-0 bottom-0 border-l border-border/40"
                style={{ left: `calc(160px + ${pct}%)` }}
              />
            );
          })}

          {/* Employer rows */}
          {rows.map((row) => (
            <div key={row.empleador} className="flex items-center py-1.5">
              <div
                className="w-[160px] shrink-0 truncate pr-2 text-right text-xs"
                title={row.empleador}
              >
                {row.empleador.slice(0, 22)}
              </div>
              <div className="relative h-6 flex-1">
                <TooltipProvider>
                {row.periods.map((p, i) => {
                  const key = `${row.empleador}-${i}`;
                  return (
                    <UiTooltip key={key}>
                      <TooltipTrigger
                        className="absolute top-0 h-full transition-opacity"
                        style={{
                          left: `${p.startPct}%`,
                          width: `${p.widthPct}%`,
                          backgroundColor: row.color,
                          opacity: hoveredPeriod === key ? 0.8 : 1,
                        }}
                        onMouseEnter={() => setHoveredPeriod(key)}
                        onMouseLeave={() => setHoveredPeriod(null)}
                      />
                      <TooltipContent side="top" className="block max-w-60 text-left">
                        <p className="mb-1.5 font-semibold leading-tight">{row.empleador}</p>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr>
                              <td className="pr-3 text-background/60">Período</td>
                              <td className="text-right">{p.fechaInicio} – {p.fechaFin}</td>
                            </tr>
                            <tr>
                              <td className="pr-3 text-background/60">Salario</td>
                              <td className="text-right">{formatCOP(p.salario)}</td>
                            </tr>
                            <tr>
                              <td className="pr-3 text-background/60">Semanas</td>
                              <td className="text-right">{Math.round(p.semanas)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </TooltipContent>
                    </UiTooltip>
                  );
                })}
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>

        {/* Year labels */}
        <div className="relative ml-[160px] h-5 border-t">
          {yearTicks.map((year) => {
            const ts = new Date(year, 0, 1).getTime();
            const pct = ((ts - minTs) / totalSpan) * 100;
            return (
              <span
                key={year}
                className="absolute top-0.5 -translate-x-1/2 text-[10px] text-muted-foreground"
                style={{ left: `${pct}%` }}
              >
                {year}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GapsTable({
  gaps,
  records,
  fechaNacimiento,
  sexo,
  ley,
  edadEsLimitante,
}: {
  gaps: GapRecord[];
  records: CotizacionRecord[];
  fechaNacimiento: Date;
  sexo: "M" | "F";
  ley: Ley;
  edadEsLimitante: boolean;
}) {
  const totalSemanas = useMemo(
    () => records.reduce((s, r) => s + r.semanas, 0),
    [records],
  );

  const costosActuariales = useMemo(() => {
    const hoy = new Date();
    return gaps.map((gap) => {
      const salary = findNearestSalary(gap, records);
      const result = calcularCalculoActuarial({
        periodos: [
          {
            fechaInicio: isoToDDMMYYYY(gap.fecha_inicio),
            fechaFin: isoToDDMMYYYY(gap.fecha_fin),
          },
        ],
        salarioBase: salary,
        fechaNacimiento,
        sexo,
        semanasCotizadasAntes: Math.round(totalSemanas),
        fechaPago: hoy,
        ley,
      });
      return result.fechaLimite1.total;
    });
  }, [gaps, records, fechaNacimiento, sexo, ley, totalSemanas]);

  const impactoPension = useMemo(() => {
    const semanasGaps = gaps.reduce((s, g) => s + g.duracion_semanas, 0);
    const semanasConRegularizacion = totalSemanas + semanasGaps;
    const ibl = calcularIBL(records);
    const tasaActual = calcularTasaReemplazo(totalSemanas, ley);
    const tasaNueva = calcularTasaReemplazo(semanasConRegularizacion, ley);
    return {
      tasaActual,
      tasaNueva,
      mesadaActual: ibl * tasaActual,
      mesadaNueva: ibl * tasaNueva,
      semanasGaps: Math.round(semanasGaps),
      incrementoTasa: tasaNueva > tasaActual,
    };
  }, [gaps, records, totalSemanas, ley]);

  if (gaps.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <CheckCircle2 className="size-5 text-green-600" />
          <p className="text-sm text-muted-foreground">
            No se encontraron vacíos en tu historial
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalWeeksLost = gaps.reduce(
    (sum, g) => sum + g.duracion_semanas,
    0,
  );
  const totalCosto = costosActuariales.reduce(
    (sum, c) => sum + c,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Períodos sin cotización</CardTitle>
        <CardDescription>
          Brechas detectadas entre empleos (
          {gaps.length} encontradas)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gaps.map((gap, i) => {
            const meses = Math.round(
              gap.duracion_dias / 30,
            );
            const factibilidad =
              determinarFactibilidad(gap);
            return (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {gap.fecha_inicio} &rarr;{" "}
                    {gap.fecha_fin}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gap.empleador_anterior} &rarr;{" "}
                    {gap.empleador_siguiente}
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-1 text-[10px]"
                  >
                    {factibilidad.badge}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-destructive">
                    {gap.duracion_semanas} sem &middot;{" "}
                    {meses} meses
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gap.duracion_dias} días
                  </p>
                  <p className="mt-1 text-xs font-medium">
                    Cálculo actuarial:{" "}
                    {formatCOP(costosActuariales[i]!)}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="flex flex-col gap-1 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              Total semanas perdidas
            </p>
            <div className="text-right">
              <p className="text-sm font-medium text-destructive">
                {Math.round(totalWeeksLost * 100) / 100}{" "}
                sem
              </p>
              <p className="text-xs font-medium">
                Total actuarial:{" "}
                {formatCOP(totalCosto)}
              </p>
            </div>
          </div>
          {impactoPension.incrementoTasa ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                Impacto en tu pensión si regularizas todos los vacíos
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                Por cada 50 semanas adicionales a las 1.300 obligatorias,
                la tasa de reemplazo sube 1.5% (máximo 80%).
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase text-blue-600 dark:text-blue-400">
                    Tasa actual
                  </p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                    {Math.round(impactoPension.tasaActual * 100)}%
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Mesada: {formatCOP(impactoPension.mesadaActual)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-blue-600 dark:text-blue-400">
                    Con regularización (+{impactoPension.semanasGaps} sem)
                  </p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                    {Math.round(impactoPension.tasaNueva * 100)}%
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Mesada: {formatCOP(impactoPension.mesadaNueva)}{" "}
                    (+{formatCOP(impactoPension.mesadaNueva - impactoPension.mesadaActual)}/mes)
                  </p>
                </div>
              </div>
              {edadEsLimitante && (
                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  Regularizar no adelantaría tu fecha de pensión, pero sí
                  aumentaría el monto mensual.
                </p>
              )}
            </div>
          ) : edadEsLimitante ? (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-400">
                Completarás las semanas mínimas antes de la edad de pensión.
                Regularizar estos períodos no adelantaría tu fecha de pensión
                ni cambiaría tu tasa de reemplazo (ya estás al máximo de 80%).
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function SituacionActual({ records, userData, ley }: SectionProps) {
  const stats = useMemo(() => {
    const totalSemanas = records.reduce((s, r) => s + r.semanas, 0);
    const fechaNac = parseLocalDate(userData.fecha_nac);
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const ibl = calcularIBL(records);
    const tasaReemplazo = calcularTasaReemplazo(totalSemanas, ley);
    const mesadaMin = ibl * tasaReemplazo;
    const mesadaMax = ibl * 0.8;
    const smmlv = calcularSmmlvEquivalente(ibl, anioActual);

    let requeridas = semanasRequeridas(userData.sexo, anioActual, ley);
    if (userData.sexo === "F") {
      requeridas = descuentoSemanasPorHijos(
        requeridas,
        userData.n_hijos,
        ley,
      );
    }
    const faltantes = semanasFaltantes(
      records,
      userData.sexo,
      userData.n_hijos,
      anioActual,
      ley,
    );

    const estimacion = fechaEstimadaPension(
      records,
      userData.sexo,
      fechaNac,
      userData.n_hijos,
      undefined,
      undefined,
      ley,
    );

    const edadActual = Math.floor(
      (hoy.getTime() - fechaNac.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000),
    );
    const edadPension =
      userData.sexo === "M" ? EDAD_PENSION_HOMBRE : EDAD_PENSION_MUJER;

    const traslado = calificaTrasladoRegimen(
      totalSemanas,
      userData.sexo,
      fechaNac,
      hoy,
      ley,
    );

    const gaps = calcularGaps(records);
    const mayorGap = gaps.length > 0 ? gaps[0]! : null;

    // Weeks the user still needs to contribute after pension age
    const aniosHastaEdadPension = Math.max(0, edadPension - edadActual);
    const semanasProyectadasAlCumplirEdad =
      totalSemanas + aniosHastaEdadPension * 52;
    const requeridasAlCumplirEdad = semanasRequeridas(
      userData.sexo,
      hoy.getFullYear() + aniosHastaEdadPension,
      ley,
    );
    const semanasFaltantesDespuesEdad = Math.max(
      0,
      Math.round(requeridasAlCumplirEdad - semanasProyectadasAlCumplirEdad),
    );

    return {
      totalSemanas,
      requeridas,
      faltantes,
      ibl,
      tasaReemplazo,
      mesadaMin,
      mesadaMax,
      smmlv,
      estimacion,
      edadActual,
      edadPension,
      traslado,
      gaps,
      mayorGap,
      semanasFaltantesDespuesEdad,
    };
  }, [records, userData, ley]);

  const aggregatedData = useMemo(() => {
    const byEmpleador = new Map<string, number>();
    for (const r of records) {
      byEmpleador.set(
        r.empleador,
        (byEmpleador.get(r.empleador) ?? 0) + r.semanas,
      );
    }
    return [...byEmpleador.entries()]
      .map(([empleador, semanas]) => ({
        empleador: empleador.slice(0, 25),
        semanas: Math.round(semanas),
      }))
      .sort((a, b) => b.semanas - a.semanas);
  }, [records]);

  const progreso = Math.min(
    100,
    (stats.totalSemanas / stats.requeridas) * 100,
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription><Term term="semanas cotizadas">Semanas cotizadas</Term></CardDescription>
            <CardTitle className="text-2xl">
              {Math.round(stats.totalSemanas)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              de {stats.requeridas} requeridas ({Math.round(progreso)}%)
            </p>
            <div className="mt-2 h-2 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Semanas faltantes</CardDescription>
            <CardTitle className="text-2xl">
              {Math.round(stats.faltantes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatSemanasFaltantes(stats.faltantes)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription><Term term="IBL"> IBL estimado</Term></CardDescription>
            <CardTitle className="text-2xl">
              {formatCOP(stats.ibl)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.smmlv.toFixed(1)} <Term term="SMMLV" />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription><Term term="mesada">Mesada estimada</Term></CardDescription>
            <CardTitle className="text-2xl">
              {formatCOP(stats.mesadaMin)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Tasa {Math.round(stats.tasaReemplazo * 100)}% · hasta{" "}
              {formatCOP(stats.mesadaMax)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Edad actual / pensión</CardDescription>
            <CardTitle className="text-2xl">
              {stats.edadActual} / {stats.edadPension}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.edadActual >= stats.edadPension
                ? "Ya cumples la edad"
                : `Faltan ${stats.edadPension - stats.edadActual} años`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fecha estimada</CardDescription>
            <CardTitle className="text-xl">
              {formatDate(stats.estimacion.fecha_pension, {
                year: "numeric",
                month: "short",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.estimacion.anios_restantes > 0
                ? `~${stats.estimacion.anios_restantes} años`
                : "Requisitos cumplidos"}{" "}
              · {stats.estimacion.limitante}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Timeline — grouped by employer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <CardTitle>Línea de tiempo por empleador</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <GanttTimeline records={records} />
        </CardContent>
      </Card>

      {/* Semanas por empleador (aggregated) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <CardTitle>Semanas por empleador</CardTitle>
          </div>
          <CardDescription>
            Agregado por nombre de empleador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, aggregatedData.length * 40)}
          >
            <BarChart
              data={aggregatedData}
              layout="vertical"
              margin={{ left: 120 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="empleador"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`${value} sem`, "Semanas"]}
              />
              <Bar
                dataKey="semanas"
                fill="oklch(0.555 0.163 48.998)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Períodos sin cotización */}
      <GapsTable
        gaps={stats.gaps}
        records={records}
        fechaNacimiento={parseLocalDate(userData.fecha_nac)}
        sexo={userData.sexo}
        ley={ley}
        edadEsLimitante={stats.estimacion.limitante === "edad"}
      />

      {/* Alerts */}
      {stats.faltantes > 0 && (
        <Alert>
          <Clock className="size-4" />
          <AlertTitle>
            Te faltan {Math.round(stats.faltantes)} semanas
          </AlertTitle>
          <AlertDescription>
            Necesitas {formatSemanasFaltantes(stats.faltantes)} para
            alcanzar las {stats.requeridas} semanas requeridas.
          </AlertDescription>
        </Alert>
      )}
      {stats.semanasFaltantesDespuesEdad > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>
            Deberás cotizar {stats.semanasFaltantesDespuesEdad} semanas después de cumplir {stats.edadPension} años
          </AlertTitle>
          <AlertDescription>
            Al cumplir la edad de pensión, aún te faltarían{" "}
            {stats.semanasFaltantesDespuesEdad} semanas (
            {formatSemanasFaltantes(stats.semanasFaltantesDespuesEdad)}
            ) para completar el requisito de semanas. Deberás seguir
            cotizando después de los {stats.edadPension} años.
          </AlertDescription>
        </Alert>
      )}
      {stats.faltantes === 0 && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Requisito de semanas cumplido</AlertTitle>
          <AlertDescription>
            Ya tienes las {stats.requeridas} semanas requeridas. Solo
            falta cumplir la edad de pensión.
          </AlertDescription>
        </Alert>
      )}
      {stats.traslado.dentro_plazo && !stats.traslado.califica && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle><Term term="traslado de régimen">Traslado de régimen</Term></AlertTitle>
          <AlertDescription>
            {stats.traslado.edad < stats.traslado.edad_min
              ? `Podrás trasladarte cuando cumplas ${stats.traslado.edad_min} años (en ${stats.traslado.edad_min - stats.traslado.edad} años)`
              : `Cumples la edad mínima, pero te faltan ${Math.round(stats.traslado.semanas_min - stats.totalSemanas)} semanas para el umbral de ${stats.traslado.semanas_min} semanas`}
          </AlertDescription>
        </Alert>
      )}
      {stats.traslado.dentro_plazo && stats.traslado.califica && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle><Term term="traslado de régimen">Traslado de régimen disponible</Term></AlertTitle>
          <AlertDescription>
            Cumples los requisitos de edad ({stats.traslado.edad_min}{" "}
            años) y semanas ({stats.traslado.semanas_min}) para
            trasladarte. Quedan {stats.traslado.dias_restantes} días de
            plazo.
          </AlertDescription>
        </Alert>
      )}
      {stats.mayorGap && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Mayor período sin cotización</AlertTitle>
          <AlertDescription>
            {Math.round(stats.mayorGap.duracion_semanas)} semanas (
            {Math.round(stats.mayorGap.duracion_dias / 30)} meses) —
            entre {stats.mayorGap.empleador_anterior} y{" "}
            {stats.mayorGap.empleador_siguiente} (
            {stats.mayorGap.fecha_inicio} → {stats.mayorGap.fecha_fin})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

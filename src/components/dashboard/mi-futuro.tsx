import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  Calculator,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  calcularGaps,
  calcularIBL,
  calcularMesada,
  calcularTasaReemplazo,
  calificaTransicion2381,
  descuentoSemanasPorHijos,
  fechaEstimadaPension,
  semanasRequeridas,
} from "@/lib/normativa";
import type { CotizacionRecord } from "@/lib/normativa";
import {
  calcularAhorroMensualNecesario,
  calcularCrecimientoCapital,
} from "@/lib/calculadoras";
import { CDT_TASA_DEFAULT, TASA_COTIZACION } from "@/lib/constants";
import { formatDate, parseLocalDate, safeDate } from "@/lib/dates";
import {
  calcularCalculoActuarial,
  isoToDDMMYYYY,
} from "@/lib/calculo-actuarial";
import type { PeriodoOmision } from "@/lib/calculo-actuarial";
import { findNearestSalary } from "@/lib/regularizacion";
import { Term } from "@/components/ui/term";
import type { SectionProps } from "@/components/dashboard/types";

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

interface Tip {
  icon: typeof Lightbulb;
  title: string;
  description: string;
  impact: "alto" | "medio" | "bajo";
}

const impactColor = {
  alto: "bg-destructive/10 text-destructive",
  medio: "bg-primary/10 text-primary",
  bajo: "bg-secondary text-muted-foreground",
};

const WEEKS_TABLE = [
  1300, 1350, 1400, 1450, 1500, 1550, 1600, 1650, 1700,
] as const;

// ─── Simulador section ───────────────────────────────────────────────────────

function SimuladorSection({
  records,
  userData,
  ley,
}: SectionProps) {
  const totalSemanas = records.reduce((s, r) => s + r.semanas, 0);
  const salarioActual =
    [...records].sort(
      (a, b) =>
        new Date(b.fecha_fin).getTime() -
        new Date(a.fecha_fin).getTime(),
    )[0]?.salario ?? 0;

  const [semanasExtra, setSemanasExtra] = useState(0);
  const [salarioSim, setSalarioSim] = useState(salarioActual);
  const [hijosSim, setHijosSim] = useState(userData.n_hijos);

  const baseResult = useMemo(() => {
    const fechaNac = parseLocalDate(userData.fecha_nac);
    const ibl = calcularIBL(records);
    const [mesadaMin, mesadaMax] = calcularMesada(ibl);
    const tasa = calcularTasaReemplazo(
      records.reduce((s, r) => s + r.semanas, 0),
      ley,
    );
    const mesada = ibl * tasa;
    const est = fechaEstimadaPension(
      records,
      userData.sexo,
      fechaNac,
      userData.n_hijos,
      52,
      new Date(),
      ley,
    );
    return { ibl, mesadaMin, mesadaMax, mesada, tasa, est };
  }, [records, userData, ley]);

  const simResult = useMemo(() => {
    const simRecords: CotizacionRecord[] = [
      ...records,
      ...(semanasExtra > 0
        ? [
            {
              fecha_inicio: new Date().toISOString(),
              fecha_fin: new Date(
                Date.now() + semanasExtra * 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              empleador: "Simulado",
              semanas: semanasExtra,
              salario: salarioSim,
              lic: 0,
              sim: 0,
            },
          ]
        : []),
    ];

    const fechaNac = parseLocalDate(userData.fecha_nac);
    const ibl = calcularIBL(simRecords);
    const [mesadaMin, mesadaMax] = calcularMesada(ibl);
    const simSemanas = simRecords.reduce((s, r) => s + r.semanas, 0);
    const tasa = calcularTasaReemplazo(simSemanas, ley);
    const mesada = ibl * tasa;
    const est = fechaEstimadaPension(
      simRecords,
      userData.sexo,
      fechaNac,
      hijosSim,
      52,
      new Date(),
      ley,
    );
    return { ibl, mesadaMin, mesadaMax, mesada, tasa, est };
  }, [records, userData, semanasExtra, salarioSim, hijosSim, ley]);

  const gaps = useMemo(() => calcularGaps(records), [records]);
  const mayorGap = gaps.length > 0 ? gaps[0]! : null;

  const anioEst = simResult.est.fecha_pension.getFullYear();
  let requeridas = semanasRequeridas(userData.sexo, anioEst, ley);
  if (userData.sexo === "F") {
    requeridas = descuentoSemanasPorHijos(requeridas, hijosSim, ley);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulador &ldquo;¿Y si...?&rdquo;</CardTitle>
          <CardDescription>
            Ajusta las variables para ver cómo afectan tu pensión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>
              Semanas adicionales: {semanasExtra} (~
              {(semanasExtra / 52).toFixed(1)} años)
            </Label>
            <Slider
              min={0}
              max={520}
              step={26}
              value={[semanasExtra]}
              onValueChange={(v) =>
                setSemanasExtra(Array.isArray(v) ? v[0]! : v)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              Salario simulado: {formatCOP(salarioSim)}
            </Label>
            <Slider
              min={1_423_500}
              max={15_000_000}
              step={100_000}
              value={[salarioSim]}
              onValueChange={(v) =>
                setSalarioSim(Array.isArray(v) ? v[0]! : v)
              }
            />
          </div>
          {userData.sexo === "F" && (
            <div className="space-y-2">
              <Label>Hijos (para descuento): {hijosSim}</Label>
              <Slider
                min={0}
                max={5}
                step={1}
                value={[hijosSim]}
                onValueChange={(v) =>
                  setHijosSim(Array.isArray(v) ? v[0]! : v)
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base">
              Situación actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Semanas</span>
              <span>{Math.round(totalSemanas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground"><Term term="IBL" /></span>
              <span>{formatCOP(baseResult.ibl)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground"><Term term="mesada">Mesada</Term></span>
              <span>
                {formatCOP(baseResult.mesadaMin)} –{" "}
                {formatCOP(baseResult.mesadaMax)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Fecha pensión
              </span>
              <span>
                {baseResult.est.fecha_pension.toLocaleDateString(
                  "es-CO",
                  { year: "numeric", month: "short" },
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Años restantes
              </span>
              <span>{baseResult.est.anios_restantes}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="ring-2 ring-primary">
          <CardHeader>
            <CardTitle className="text-base">Simulación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Semanas</span>
              <span className="font-medium">
                {Math.round(totalSemanas + semanasExtra)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground"><Term term="IBL" /></span>
              <span className="font-medium">
                {formatCOP(simResult.ibl)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground"><Term term="mesada">Mesada</Term></span>
              <span className="font-medium">
                {formatCOP(simResult.mesadaMin)} –{" "}
                {formatCOP(simResult.mesadaMax)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Fecha pensión
              </span>
              <span className="font-medium">
                {simResult.est.fecha_pension.toLocaleDateString(
                  "es-CO",
                  { year: "numeric", month: "short" },
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Años restantes
              </span>
              <span className="font-medium">
                {simResult.est.anios_restantes}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requeridas</span>
              <span className="font-medium">{requeridas}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {mayorGap && (
        <Card className="bg-secondary/50">
          <CardContent className="pt-6 space-y-1 text-sm">
            <p className="font-medium">
              Mayor brecha sin cotización:{" "}
              {Math.round(mayorGap.duracion_semanas)} sem (
              {Math.round(mayorGap.duracion_dias / 30)} meses)
            </p>
            <p className="text-muted-foreground">
              Entre {mayorGap.empleador_anterior} y{" "}
              {mayorGap.empleador_siguiente}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delta cards */}
      {semanasExtra > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  &Delta; IBL
                </p>
                <p
                  className={`text-lg font-bold ${
                    simResult.ibl > baseResult.ibl
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  {simResult.ibl > baseResult.ibl ? "+" : ""}
                  {formatCOP(simResult.ibl - baseResult.ibl)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  &Delta; Mesada
                </p>
                <p
                  className={`text-lg font-bold ${
                    simResult.mesadaMin > baseResult.mesadaMin
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  {simResult.mesadaMin > baseResult.mesadaMin
                    ? "+"
                    : ""}
                  {formatCOP(
                    simResult.mesadaMin - baseResult.mesadaMin,
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  &Delta; Años
                </p>
                <p
                  className={`text-lg font-bold ${
                    simResult.est.anios_restantes <
                    baseResult.est.anios_restantes
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  {simResult.est.anios_restantes <
                  baseResult.est.anios_restantes
                    ? ""
                    : "+"}
                  {(
                    simResult.est.anios_restantes -
                    baseResult.est.anios_restantes
                  ).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Optimización section ────────────────────────────────────────────────────

function OptimizacionSection({
  records,
  userData,
  ley,
}: SectionProps) {
  const [semanasExtraAnio, setSemanasExtraAnio] = useState(0);
  const [aumentoSalarial, setAumentoSalarial] = useState(0);

  const totalSemanas = useMemo(
    () => records.reduce((s, r) => s + r.semanas, 0),
    [records],
  );

  const tasaReemplazo = calcularTasaReemplazo(totalSemanas, ley);
  const minTasa = ley === "ley100" ? 0.55 : 0.65;

  const progressValue = Math.min(
    100,
    Math.max(0, ((tasaReemplazo - minTasa) / (0.80 - minTasa)) * 100),
  );

  const closestWeeksRow = WEEKS_TABLE.reduce((prev, curr) =>
    Math.abs(curr - totalSemanas) < Math.abs(prev - totalSemanas)
      ? curr
      : prev,
  );

  const fechaNac = useMemo(
    () => parseLocalDate(userData.fecha_nac),
    [userData.fecha_nac],
  );

  const estExtraSemanas = useMemo(
    () =>
      fechaEstimadaPension(
        records,
        userData.sexo,
        fechaNac,
        userData.n_hijos,
        52 + semanasExtraAnio,
        new Date(),
        ley,
      ),
    [
      records,
      userData.sexo,
      fechaNac,
      userData.n_hijos,
      semanasExtraAnio,
      ley,
    ],
  );

  const salaryAnalysis = useMemo(() => {
    const sorted = [...records].sort(
      (a, b) =>
        new Date(b.fecha_fin).getTime() -
        new Date(a.fecha_fin).getTime(),
    );
    const salarioActual = sorted[0]?.salario ?? 0;
    const nuevoSalario =
      salarioActual * (1 + aumentoSalarial / 100);

    const modifiedRecords =
      aumentoSalarial > 0 && sorted[0]
        ? records.map((r) =>
            r === sorted[0]
              ? { ...r, salario: nuevoSalario }
              : r,
          )
        : records;

    const nuevoIBL = calcularIBL(modifiedRecords);
    const [mesadaMin, mesadaMax] = calcularMesada(nuevoIBL);

    return {
      salarioActual,
      nuevoSalario,
      nuevoIBL,
      mesadaMin,
      mesadaMax,
    };
  }, [records, aumentoSalarial]);

  const tips = useMemo(() => {
    const result: Tip[] = [];
    const anioActual = new Date().getFullYear();
    const ibl = calcularIBL(records);
    const gaps = calcularGaps(records);
    const transicion = calificaTransicion2381(
      records,
      userData.sexo,
    );
    const est = fechaEstimadaPension(
      records,
      userData.sexo,
      fechaNac,
      userData.n_hijos,
      52,
      new Date(),
      ley,
    );

    let requeridas = semanasRequeridas(userData.sexo, anioActual, ley);
    if (userData.sexo === "F") {
      requeridas = descuentoSemanasPorHijos(
        requeridas,
        userData.n_hijos,
        ley,
      );
    }

    if (gaps.length > 0) {
      const totalGapSemanas = gaps.reduce(
        (s, g) => s + g.duracion_semanas,
        0,
      );
      result.push({
        icon: AlertTriangle,
        title: "Evita interrupciones en la cotización",
        description: `Tienes ${gaps.length} gap(s) que suman ~${Math.round(totalGapSemanas)} semanas sin cotizar. Cada semana sin cotizar retrasa tu pensión. Si eres independiente, cotiza como voluntario.`,
        impact: totalGapSemanas > 52 ? "alto" : "medio",
      });
    }

    const salarioReciente =
      [...records].sort(
        (a, b) =>
          new Date(b.fecha_fin).getTime() -
          new Date(a.fecha_fin).getTime(),
      )[0]?.salario ?? 0;
    const [mesadaMin] = calcularMesada(ibl);

    if (salarioReciente > 0) {
      const cotizacionMensual = salarioReciente * TASA_COTIZACION;
      result.push({
        icon: TrendingUp,
        title: "Aumenta tu base de cotización",
        description: `Tu cotización mensual es ~${formatCOP(cotizacionMensual)} (16% de ${formatCOP(salarioReciente)}). Un salario mayor en los últimos 10 años sube directamente tu IBL y tu mesada.`,
        impact: "alto",
      });
    }

    if (
      !transicion.califica &&
      transicion.semanas_faltantes_umbral < 200
    ) {
      result.push({
        icon: Lightbulb,
        title: "Estás cerca del umbral de transición",
        description: `Te faltan solo ${Math.round(transicion.semanas_faltantes_umbral)} semanas para calificar al régimen de transición (Ley 2381). Cotiza sin parar hasta el 30/jun/2025.`,
        impact: "alto",
      });
    }

    if (
      userData.sexo === "F" &&
      userData.n_hijos > 0 &&
      userData.n_hijos <= 3
    ) {
      result.push({
        icon: CheckCircle2,
        title: "Descuento por hijos aplicado",
        description: `Con ${userData.n_hijos} hijo(s) tienes un descuento de ${userData.n_hijos * 50} semanas sobre el requisito. Esto adelanta tu fecha de pensión.`,
        impact: "medio",
      });
    }

    if (mesadaMin > 0 && mesadaMin < 3_000_000) {
      result.push({
        icon: Lightbulb,
        title: "Considera ahorro complementario",
        description: `Tu mesada estimada es ${formatCOP(mesadaMin)}. Complementa con un CDT o fondo voluntario para mantener tu nivel de vida al jubilarte.`,
        impact: "medio",
      });
    }

    if (est.limitante === "edad") {
      result.push({
        icon: Lightbulb,
        title: "Tu limitante es la edad, no las semanas",
        description: `Ya tienes (o tendrás) las semanas necesarias, pero debes esperar hasta cumplir ${userData.sexo === "M" ? "62" : "57"} años. Usa ese tiempo para mejorar tu IBL cotizando sobre un salario más alto.`,
        impact: "bajo",
      });
    }

    return result;
  }, [records, userData, fechaNac, ley]);

  return (
    <div className="space-y-6">
      {/* Replacement rate */}
      <Card>
        <CardHeader>
          <CardTitle><Term term="tasa de reemplazo">Tasa de reemplazo</Term> actual</CardTitle>
          <CardDescription>
            {(tasaReemplazo * 100).toFixed(1)}% de reemplazo — rango:
            {ley === "ley100" ? "55%" : "65%"} a 80%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressValue} />
          <div className="overflow-x-auto">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
              {WEEKS_TABLE.map((w) => {
                const rate = calcularTasaReemplazo(w, ley);
                const isClosest = w === closestWeeksRow;
                return (
                  <div
                    key={w}
                    className={`rounded-lg border p-2 text-center text-sm ${
                      isClosest
                        ? "ring-2 ring-primary border-primary"
                        : ""
                    }`}
                  >
                    <p className="font-medium">{w}</p>
                    <p className="text-muted-foreground">
                      {(rate * 100).toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tus semanas cotizadas: {Math.round(totalSemanas)}
          </p>
        </CardContent>
      </Card>

      {/* Lever 1: extra weeks per year */}
      <Card>
        <CardHeader>
          <CardTitle>¿Qué pasa si cotizo más?</CardTitle>
          <CardDescription>
            Simula cotizar más semanas por año
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              Semanas extra por año: {semanasExtraAnio}
            </Label>
            <Slider
              min={0}
              max={26}
              step={2}
              value={[semanasExtraAnio]}
              onValueChange={(v) =>
                setSemanasExtraAnio(
                  Array.isArray(v) ? v[0]! : v,
                )
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Con {52 + semanasExtraAnio} semanas/año, tu fecha de
            pensión sería:{" "}
            <span className="font-medium text-foreground">
              {formatDate(estExtraSemanas.fecha_pension)}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Lever 2: salary increase */}
      <Card>
        <CardHeader>
          <CardTitle>¿Y si aumento mi salario?</CardTitle>
          <CardDescription>
            Simula un aumento sobre tu salario más reciente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Aumento salarial: {aumentoSalarial}%</Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[aumentoSalarial]}
              onValueChange={(v) =>
                setAumentoSalarial(
                  Array.isArray(v) ? v[0]! : v,
                )
              }
            />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Salario actual:{" "}
              {formatCOP(salaryAnalysis.salarioActual)}
              {aumentoSalarial > 0 && (
                <>
                  {" → "}
                  <span className="font-medium text-foreground">
                    {formatCOP(salaryAnalysis.nuevoSalario)}
                  </span>
                </>
              )}
            </p>
            <p>
              IBL proyectado:{" "}
              <span className="font-medium text-foreground">
                {formatCOP(salaryAnalysis.nuevoIBL)}
              </span>
            </p>
            <p>
              Mesada estimada:{" "}
              <span className="font-medium text-foreground">
                {formatCOP(salaryAnalysis.mesadaMin)} –{" "}
                {formatCOP(salaryAnalysis.mesadaMax)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Optimiza tu pensión</CardTitle>
          <CardDescription>
            Recomendaciones personalizadas basadas en tu historial
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tips.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No hay recomendaciones adicionales. Tu perfil se ve
              bien.
            </p>
          ) : (
            <div className="space-y-4">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border p-4"
                >
                  <tip.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{tip.title}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${impactColor[tip.impact]}`}
                      >
                        Impacto {tip.impact}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tip.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IBL Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>¿Qué es el <Term term="IBL" />?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            El Ingreso Base de Liquidación (IBL) es el promedio
            ponderado de tus salarios de los últimos 10 años de
            cotización. Cada salario se pondera por las semanas que
            cotizaste con ese salario. Un IBL más alto significa
            una mesada más alta.
          </p>
          <p className="rounded-lg bg-muted p-3 font-mono text-sm">
            IBL = &Sigma;(salario &times; semanas) /
            &Sigma;(semanas) — últimos 10 años
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Ahorro complementario section ──────────────────────────────────────────

function AhorroSection({ records, userData, ley }: SectionProps) {
  const [tasaCDT, setTasaCDT] = useState(CDT_TASA_DEFAULT * 100);
  const [capitalObjetivo, setCapitalObjetivo] = useState(
    100_000_000,
  );
  const [ingresoExtra, setIngresoExtra] = useState(500_000);
  const [inflacion, setInflacion] = useState(5);

  const base = useMemo(() => {
    const ibl = calcularIBL(records);
    const totalSem = records.reduce((s, r) => s + r.semanas, 0);
    const tasa = calcularTasaReemplazo(totalSem, ley);
    const mesadaMin = ibl * tasa;
    const fechaNac = parseLocalDate(userData.fecha_nac);
    const est = fechaEstimadaPension(
      records,
      userData.sexo,
      fechaNac,
      userData.n_hijos,
      52,
      new Date(),
      ley,
    );
    return {
      mesadaMin,
      aniosRestantes: Math.max(
        1,
        Math.round(est.anios_restantes),
      ),
    };
  }, [records, userData]);

  const capitalNecesario =
    ingresoExtra > 0 && tasaCDT > 0
      ? (ingresoExtra * 12) / (tasaCDT / 100)
      : 0;

  const capitalAjustado =
    capitalNecesario *
    (1 + inflacion / 100) ** base.aniosRestantes;

  const cuotaMensual = useMemo(
    () =>
      calcularAhorroMensualNecesario(
        capitalObjetivo,
        tasaCDT / 100,
        base.aniosRestantes,
      ),
    [capitalObjetivo, tasaCDT, base.aniosRestantes],
  );

  const crecimiento = useMemo(
    () =>
      calcularCrecimientoCapital(
        cuotaMensual,
        tasaCDT / 100,
        base.aniosRestantes,
      ),
    [cuotaMensual, tasaCDT, base.aniosRestantes],
  );

  const chartData = useMemo(
    () =>
      crecimiento.map((capital, i) => ({
        anio: i,
        capital,
        aportado: cuotaMensual * 12 * i,
      })),
    [crecimiento, cuotaMensual],
  );

  return (
    <div className="space-y-6">
      {/* Calculator inputs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Calculadora de ahorro complementario
          </CardTitle>
          <CardDescription>
            Calcula cuánto necesitas ahorrar mensualmente en un <Term term="CDT" /> para complementar tu pensión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Capital objetivo (COP)</Label>
              <Input
                type="number"
                value={capitalObjetivo}
                onChange={(e) =>
                  setCapitalObjetivo(
                    Number(e.target.value) || 0,
                  )
                }
                step={10_000_000}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Tasa CDT: {tasaCDT.toFixed(1)}% EA
              </Label>
              <Slider
                min={3}
                max={18}
                step={0.5}
                value={[tasaCDT]}
                onValueChange={(v) =>
                  setTasaCDT(Array.isArray(v) ? v[0]! : v)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Ingreso mensual extra deseado (COP)
              </Label>
              <Input
                type="number"
                value={ingresoExtra}
                onChange={(e) =>
                  setIngresoExtra(
                    Number(e.target.value) || 0,
                  )
                }
                step={100_000}
              />
              <p className="text-xs text-muted-foreground">
                Capital necesario para generar ese ingreso:{" "}
                {formatCOP(capitalNecesario)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Inflación estimada: {inflacion}%</Label>
              <Slider
                min={1}
                max={15}
                step={0.5}
                value={[inflacion]}
                onValueChange={(v) =>
                  setInflacion(Array.isArray(v) ? v[0]! : v)
                }
              />
              <p className="text-xs text-muted-foreground">
                Capital ajustado por inflación (
                {base.aniosRestantes} años):{" "}
                {formatCOP(capitalAjustado)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cuota mensual</CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(cuotaMensual)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              durante {base.aniosRestantes} años
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total aportado</CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(
                cuotaMensual * 12 * base.aniosRestantes,
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              aportes sin intereses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Ganancia por intereses
            </CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(
                capitalObjetivo -
                  cuotaMensual * 12 * base.aniosRestantes,
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              interés compuesto al {tasaCDT.toFixed(1)}% EA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Extra income KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Capital necesario</CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(capitalNecesario)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              para generar {formatCOP(ingresoExtra)}/mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Ingreso extra mensual
            </CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(ingresoExtra)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              al {tasaCDT.toFixed(1)}% EA
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Capital ajustado</CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(capitalAjustado)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              con inflación del {inflacion}% a{" "}
              {base.aniosRestantes} años
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Capital growth chart */}
      <Card>
        <CardHeader>
          <CardTitle>Crecimiento del capital</CardTitle>
          <CardDescription>
            Capital acumulado vs aportes a lo largo de{" "}
            {base.aniosRestantes} años
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="anio"
                label={{ value: "Años", position: "bottom" }}
              />
              <YAxis
                tickFormatter={(v) =>
                  `$${(v / 1_000_000).toFixed(0)}M`
                }
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCOP(Number(value)),
                  name === "capital"
                    ? "Capital total"
                    : "Total aportado",
                ]}
              />
              <ReferenceLine
                y={capitalObjetivo}
                stroke="hsl(0 72% 51%)"
                strokeDasharray="6 3"
                label={{
                  value: "Meta",
                  position: "right",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="capital"
                stroke="oklch(0.555 0.163 48.998)"
                fill="oklch(0.555 0.163 48.998 / 0.2)"
              />
              <Area
                type="monotone"
                dataKey="aportado"
                stroke="oklch(0.705 0.015 286.067)"
                fill="oklch(0.705 0.015 286.067 / 0.1)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Cálculo actuarial section ──────────────────────────────────────────────

function CalculoActuarialSection({
  records,
  userData,
  ley,
}: SectionProps) {
  const gaps = useMemo(
    () => calcularGaps(records),
    [records],
  );

  const totalSemanas = useMemo(
    () => records.reduce((s, r) => s + r.semanas, 0),
    [records],
  );

  const [selectedGaps, setSelectedGaps] = useState<
    Set<number>
  >(new Set());
  const [salario, setSalario] = useState(0);

  const periodos = useMemo(() => {
    const result: PeriodoOmision[] = [];
    for (const idx of selectedGaps) {
      const gap = gaps[idx];
      if (gap) {
        result.push({
          fechaInicio: isoToDDMMYYYY(gap.fecha_inicio),
          fechaFin: isoToDDMMYYYY(gap.fecha_fin),
        });
      }
    }
    return result;
  }, [gaps, selectedGaps]);

  const semanasCotizadasAntes = useMemo(() => {
    if (selectedGaps.size === 0) return Math.round(totalSemanas);
    const earliestGapStart = Math.min(
      ...[...selectedGaps].map((idx) => {
        const gap = gaps[idx];
        return gap ? new Date(gap.fecha_inicio).getTime() : Infinity;
      }),
    );
    return Math.round(
      records
        .filter(
          (r) => new Date(r.fecha_fin).getTime() < earliestGapStart,
        )
        .reduce((s, r) => s + r.semanas, 0),
    );
  }, [records, gaps, selectedGaps, totalSemanas]);

  const resultado = useMemo(() => {
    if (periodos.length === 0) return null;
    return calcularCalculoActuarial({
      periodos,
      salarioBase: salario,
      fechaNacimiento: parseLocalDate(userData.fecha_nac),
      sexo: userData.sexo,
      semanasCotizadasAntes,
      fechaPago: new Date(),
      ley,
    });
  }, [periodos, salario, semanasCotizadasAntes, userData, ley]);

  const estimacion = useMemo(
    () =>
      fechaEstimadaPension(
        records,
        userData.sexo,
        parseLocalDate(userData.fecha_nac),
        userData.n_hijos,
        undefined,
        undefined,
        ley,
      ),
    [records, userData, ley],
  );

  const regularizacionInnecesaria = estimacion.limitante === "edad";

  const impactoPension = useMemo(() => {
    if (selectedGaps.size === 0) return null;
    const semanasGaps = [...selectedGaps].reduce((s, idx) => {
      const gap = gaps[idx];
      return gap ? s + gap.duracion_semanas : s;
    }, 0);
    const semanasConReg = totalSemanas + semanasGaps;
    const ibl = calcularIBL(records);
    const tasaActual = calcularTasaReemplazo(totalSemanas, ley);
    const tasaNueva = calcularTasaReemplazo(semanasConReg, ley);
    return {
      tasaActual,
      tasaNueva,
      mesadaActual: ibl * tasaActual,
      mesadaNueva: ibl * tasaNueva,
      semanasGaps: Math.round(semanasGaps),
    };
  }, [selectedGaps, gaps, totalSemanas, records, ley]);

  const toggleGap = (idx: number) => {
    setSelectedGaps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

    const gap = gaps[idx];
    if (gap) {
      setSalario(findNearestSalary(gap, records));
    }
  };

  if (gaps.length === 0) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            <CardTitle>
              Simulador de Cálculo Actuarial
            </CardTitle>
          </div>
          <CardDescription>
            Estima el valor que Colpensiones cobra para
            regularizar períodos sin cotización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {regularizacionInnecesaria && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Regularizar no adelantaría tu fecha de pensión
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  Completarás las semanas mínimas antes de los{" "}
                  {userData.sexo === "M" ? 62 : 57} años. Sin embargo,
                  regularizar podría aumentar tu tasa de reemplazo y mesada
                  si aún no estás al 80%.
                </p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>
              Selecciona los períodos de omisión
            </Label>
            <div className="space-y-2">
              {gaps.map((gap, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleGap(idx)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                    selectedGaps.has(idx)
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between">
                    <span>
                      {formatDate(
                        safeDate(gap.fecha_inicio),
                      )}{" "}
                      —{" "}
                      {formatDate(
                        safeDate(gap.fecha_fin),
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round(gap.duracion_semanas)}{" "}
                      sem
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {gap.empleador_anterior} &rarr;{" "}
                    {gap.empleador_siguiente}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Salario del período (COP)</Label>
            <Input
              type="number"
              value={salario}
              onChange={(e) =>
                setSalario(Number(e.target.value) || 0)
              }
              step={100_000}
            />
            <p className="text-xs text-muted-foreground">
              Si es menor al SMMLV del año, se ajusta
              automáticamente al mínimo
            </p>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <CalculoActuarialResultados
          resultado={resultado}
          impactoPension={impactoPension}
        />
      )}
    </div>
  );
}

function DesgloseRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

interface ImpactoPension {
  tasaActual: number;
  tasaNueva: number;
  mesadaActual: number;
  mesadaNueva: number;
  semanasGaps: number;
}

function CalculoActuarialResultados({
  resultado,
  impactoPension,
}: {
  resultado: NonNullable<
    ReturnType<typeof calcularCalculoActuarial>
  >;
  impactoPension: ImpactoPension | null;
}) {
  const d = resultado.desglose;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="ring-2 ring-primary">
          <CardHeader className="pb-2">
            <CardDescription>
              Pago antes del {resultado.fechaLimite1.fecha}
            </CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(resultado.fechaLimite1.total)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {resultado.totalMeses} meses &middot;{" "}
              {resultado.totalSemanas} semanas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Pago antes del {resultado.fechaLimite2.fecha}
            </CardDescription>
            <CardTitle className="text-xl">
              {formatCOP(resultado.fechaLimite2.total)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Incremento:{" "}
              {formatCOP(
                resultado.fechaLimite2.total -
                  resultado.fechaLimite1.total,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {impactoPension && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-900 dark:text-blue-200">
              Impacto en tu pensión
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-400">
              Por cada 50 semanas adicionales a las 1.300 obligatorias,
              la tasa de reemplazo sube 1.5% sobre el IBL (máximo 80%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">
                  Sin regularizar
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {Math.round(impactoPension.tasaActual * 100)}%
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {formatCOP(impactoPension.mesadaActual)}/mes
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">
                  Con regularización (+{impactoPension.semanasGaps} sem)
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {Math.round(impactoPension.tasaNueva * 100)}%
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {formatCOP(impactoPension.mesadaNueva)}/mes
                </p>
              </div>
            </div>
            {impactoPension.tasaNueva > impactoPension.tasaActual ? (
              <p className="mt-3 rounded border border-blue-300 bg-blue-100 p-2 text-xs font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                Ganarías +{formatCOP(impactoPension.mesadaNueva - impactoPension.mesadaActual)}/mes
                {" "}(+{Math.round((impactoPension.tasaNueva - impactoPension.tasaActual) * 100)}
                % de tasa) pagando {formatCOP(resultado.fechaLimite1.total)} de cálculo actuarial.
              </p>
            ) : (
              <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                Ya estás al máximo de 80%. Regularizar no cambiaría tu mesada.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Desglose del cálculo actuarial
          </CardTitle>
          <CardDescription>
            Fórmula: VRA = (FAC1 × PR + FAC2 × AR) × FAC3
            {d.esCaso2 && " — Caso ii (cotizaciones previas)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Fechas y tiempo
              </p>
              <DesgloseRow
                label="Fecha corte (FC)"
                value={formatDate(d.fc)}
              />
              <DesgloseRow
                label="Fecha referencia (FR)"
                value={formatDate(d.fr)}
              />
              <DesgloseRow
                label="Edad pensión (ER)"
                value={`${d.er} años`}
              />
              <DesgloseRow
                label="Tiempo omisión (t)"
                value={`${d.t.toFixed(2)} años`}
              />
              <DesgloseRow
                label="Tiempo a FR (n)"
                value={`${d.n.toFixed(2)} años`}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Salarios y tasas
              </p>
              <DesgloseRow
                label="Salario base (SB)"
                value={formatCOP(d.sb)}
              />
              <DesgloseRow
                label="Salario referencia (SR)"
                value={formatCOP(d.sr)}
              />
              <DesgloseRow
                label="Tasa reemplazo (TR)"
                value={`${(d.tr * 100).toFixed(1)}%`}
              />
              <DesgloseRow
                label="Pensión referencia (PR)"
                value={formatCOP(d.pr)}
              />
              <DesgloseRow
                label="Auxilio (AR)"
                value={formatCOP(d.ar)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Factores actuariales
              </p>
              <DesgloseRow
                label="FAC1"
                value={d.fac1.toFixed(2)}
              />
              <DesgloseRow
                label="FAC2"
                value={d.fac2.toFixed(2)}
              />
              <DesgloseRow
                label="FAC3"
                value={d.fac3.toFixed(6)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Valor reserva
              </p>
              <DesgloseRow label="VRA" value={formatCOP(d.vra)} />
              <DesgloseRow
                label="VR (+ comisión)"
                value={formatCOP(d.vr)}
              />
              <DesgloseRow
                label="Factor DTF"
                value={d.factorDtf.toFixed(4)}
              />
              <DesgloseRow
                label="VR actualizado"
                value={formatCOP(d.vrActualizado)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/50">
        <CardContent className="space-y-2 pt-6 text-xs text-muted-foreground">
          <p>
            <strong>Nota legal:</strong> Simulador
            informativo basado en el Decreto 1296/2022 y el
            Decreto 1225/2024. El valor real puede variar
            según la liquidación oficial de Colpensiones.
          </p>
          <p>
            La regularización está sujeta a requisitos de
            elegibilidad. Consulta directamente con
            Colpensiones para obtener el valor oficial.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function MiFuturo({ records, userData, ley }: SectionProps) {
  return (
    <div className="space-y-8">
      <SimuladorSection records={records} userData={userData} ley={ley} />

      <div className="border-t pt-6">
        <CalculoActuarialSection
          records={records}
          userData={userData}
          ley={ley}
        />
      </div>

      <div className="border-t pt-6">
        <OptimizacionSection
          records={records}
          userData={userData}
          ley={ley}
        />
      </div>

      <div className="border-t pt-6">
        <AhorroSection records={records} userData={userData} ley={ley} />
      </div>
    </div>
  );
}

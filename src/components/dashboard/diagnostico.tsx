import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Printer,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/lib/dates";
import {
  calcularIBL,
  calcularTasaReemplazo,
  fechaEstimadaPension,
  semanasRequeridas,
  semanasFaltantes,
} from "@/lib/normativa";
import { calcularSmmlvEquivalente } from "@/lib/calculadoras";
import {
  calcularSemaforo,
  generarAlertas,
  generarRecomendaciones,
} from "@/lib/diagnostico";
import type { SemaforoColor } from "@/lib/diagnostico";
import { Term } from "@/components/ui/term";
import type { SectionProps } from "@/components/dashboard/types";

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

const SEMAFORO_CONFIG: Record<
  SemaforoColor,
  { bg: string; border: string; text: string; label: string }
> = {
  green: {
    bg: "bg-[var(--color-positive)]/10",
    border: "border-[var(--color-positive)]",
    text: "text-[var(--color-positive)]",
    label: "Tu pensión va por buen camino",
  },
  yellow: {
    bg: "bg-[var(--color-warning)]/10",
    border: "border-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
    label: "Tu pensión necesita atención",
  },
  red: {
    bg: "bg-[var(--color-negative)]/10",
    border: "border-[var(--color-negative)]",
    text: "text-[var(--color-negative)]",
    label: "Tu pensión requiere acción urgente",
  },
};

const ALERT_ICONS = {
  gap: AlertTriangle,
  traslado: Info,
  salario: TrendingUp,
  tasa: Info,
  positivo: CheckCircle2,
};

export function Diagnostico({ records, userData, ley }: SectionProps) {
  const fechaNac = useMemo(
    () => parseLocalDate(userData.fecha_nac),
    [userData.fecha_nac],
  );

  const totalSemanas = useMemo(
    () => records.reduce((sum, r) => sum + r.semanas, 0),
    [records],
  );

  const semanasReq = useMemo(
    () => semanasRequeridas(userData.sexo, new Date().getFullYear(), ley),
    [userData.sexo, ley],
  );

  const faltantes = useMemo(
    () =>
      semanasFaltantes(
        records,
        userData.sexo,
        userData.n_hijos,
        new Date().getFullYear(),
        ley,
      ),
    [records, userData.sexo, userData.n_hijos, ley],
  );

  const estimacion = useMemo(
    () =>
      fechaEstimadaPension(
        records,
        userData.sexo,
        fechaNac,
        userData.n_hijos,
        52,
        new Date(),
        ley,
      ),
    [records, userData.sexo, fechaNac, userData.n_hijos, ley],
  );

  const ibl = useMemo(() => calcularIBL(records), [records]);

  const tasa = useMemo(
    () => calcularTasaReemplazo(totalSemanas, ley),
    [totalSemanas, ley],
  );

  const mesada = useMemo(() => ibl * tasa, [ibl, tasa]);

  const smmlvEquiv = useMemo(
    () => calcularSmmlvEquivalente(mesada, new Date().getFullYear()),
    [mesada],
  );

  const semaforo = useMemo(
    () =>
      calcularSemaforo(totalSemanas, semanasReq, estimacion.anios_restantes, ley),
    [totalSemanas, semanasReq, estimacion.anios_restantes, ley],
  );

  const alertas = useMemo(
    () => generarAlertas(records, userData.sexo, fechaNac, userData.n_hijos, ley),
    [records, userData.sexo, fechaNac, userData.n_hijos, ley],
  );

  const recomendaciones = useMemo(
    () =>
      generarRecomendaciones(
        records,
        userData.sexo,
        fechaNac,
        userData.n_hijos,
        ley,
      ),
    [records, userData.sexo, fechaNac, userData.n_hijos, ley],
  );

  const semaforoConfig = SEMAFORO_CONFIG[semaforo];
  const progressPercent = Math.min(100, (totalSemanas / semanasReq) * 100);

  const fechaPensionStr = estimacion.fecha_pension.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Semáforo + Headline */}
      <Card className={`${semaforoConfig.bg} border ${semaforoConfig.border}`}>
        <CardContent className="flex items-center gap-4 py-5">
          <div
            className={`flex size-14 shrink-0 items-center justify-content-center rounded-full ${semaforoConfig.bg} ${semaforoConfig.text}`}
          >
            {semaforo === "green" && (
              <CheckCircle2 className="mx-auto size-8" />
            )}
            {semaforo === "yellow" && (
              <AlertTriangle className="mx-auto size-8" />
            )}
            {semaforo === "red" && (
              <AlertTriangle className="mx-auto size-8" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {userData.nombre
                ? `${userData.nombre.split(" ")[0]}, ${semaforoConfig.label.toLowerCase()}`
                : semaforoConfig.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Basado en tu extracto de Colpensiones ·{" "}
              {ley === "ley100" ? "Ley 100/93 vigente" : "Escenario Ley 2381 (suspendida)"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="no-print"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 size-4" />
            Imprimir
          </Button>
        </CardContent>
      </Card>

      {/* 3 KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Te pensionas en
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[var(--color-positive)]">
              {estimacion.anios_restantes <= 0
                ? "Ya cumples"
                : `${Math.ceil(estimacion.anios_restantes)} años`}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {fechaPensionStr}
              {estimacion.limitante === "semanas" ? (
                <> · limitado por semanas</>
              ) : estimacion.limitante === "ambas" ? (
                <> · edad + semanas</>
              ) : (
                <> · {userData.sexo === "M" ? "62" : "57"} años</>
              )}
            </p>
            {estimacion.limitante === "semanas" && (
              <p className="mt-1 text-xs text-[var(--color-warning)]">
                Deberás cotizar {Math.round(
                  (estimacion.fecha_pension.getTime() - estimacion.fecha_por_edad.getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
                )} semanas después de los {userData.sexo === "M" ? "62" : "57"} años
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Term term="mesada">Mesada</Term> estimada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[var(--color-info)]">
              {formatCOP(mesada)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {smmlvEquiv.toFixed(1)} <Term term="SMMLV">SMMLV</Term> ·{" "}
              {Math.round(tasa * 100)}% de tu salario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Term term="semanas cotizadas">Semanas cotizadas</Term>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[var(--color-warning)]">
              {totalSemanas.toLocaleString("es-CO")}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Te faltan {faltantes.toLocaleString("es-CO")} semanas (
              ~{(faltantes / 52).toFixed(1)} años)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Progreso hacia {semanasReq.toLocaleString("es-CO")} semanas
          </span>
          <span className="font-semibold text-[var(--color-warning)]">
            {progressPercent.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-warning)] to-[var(--color-positive)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Alertas */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Puntos de atención</h3>
        {alertas.map((alerta, i) => {
          const Icon =
            ALERT_ICONS[alerta.type as keyof typeof ALERT_ICONS] ?? Info;
          const colorClass =
            alerta.severity === "positive"
              ? "border-l-[var(--color-positive)]"
              : alerta.severity === "warning"
                ? "border-l-[var(--color-warning)]"
                : "border-l-[var(--color-info)]";
          return (
            <Card key={i} className={`border-l-4 ${colorClass}`}>
              <CardContent className="flex items-start gap-3 py-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{alerta.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {alerta.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recomendaciones */}
      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Qué puedes hacer ahora
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recomendaciones.map((rec, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <p className="flex-1 text-sm">
                <span className="font-medium">{rec.action}</span>
              </p>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  Shield,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/ui/term";
import { parseLocalDate } from "@/lib/dates";
import {
  calcularIBL,
  calcularTasaReemplazo,
  calificaTrasladoRegimen,
} from "@/lib/normativa";
import {
  estimarPensionRAIS,
  calcularDiferenciaAcumulada,
} from "@/lib/rais";
import type { PerfilRiesgo } from "@/lib/rais";
import { calcularSmmlvEquivalente } from "@/lib/calculadoras";
import type { SectionProps } from "@/components/dashboard/types";

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

const PERFILES: { key: PerfilRiesgo; label: string }[] = [
  { key: "conservador", label: "Conservador" },
  { key: "moderado", label: "Moderado" },
  { key: "agresivo", label: "Agresivo" },
];

const COMPARISON_ROWS = [
  {
    criterio: "Cálculo de pensión",
    rpm: "Promedio salarial últimos 10 años (IBL) × tasa de reemplazo",
    rais: "Capital acumulado en cuenta individual ÷ meses de expectativa de vida",
  },
  {
    criterio: "Edad mínima",
    rpm: "Mujer: 57 años · Hombre: 62 años",
    rais: "Mujer: 57 años · Hombre: 62 años (o capital suficiente)",
  },
  {
    criterio: "Semanas requeridas",
    rpm: "1.300 semanas (Ley 100/93)",
    rais: "1.150 semanas (o capital para pensión mínima)",
  },
  {
    criterio: "Pensión anticipada",
    rpm: "No aplica — se deben cumplir ambos requisitos",
    rais: "Sí, si el capital alcanza para pensión mínima de 110% del SMMLV",
  },
  {
    criterio: "Si no cumple requisitos",
    rpm: "Indemnización sustitutiva (devolución de aportes sin intereses reales)",
    rais: "Devolución de saldos con rendimientos acumulados",
  },
  {
    criterio: "Herencia / Fallecimiento",
    rpm: "Pensión de sobrevivientes (vitalicia para cónyuge/hijos)",
    rais: "Pensión de sobrevivientes o herencia del capital restante",
  },
  {
    criterio: "Rango pensión/salario",
    rpm: "55%–80% del IBL (Ley 100 Art. 34)",
    rais: "Variable — depende del capital acumulado y rendimientos",
  },
  {
    criterio: "Perfil de riesgo",
    rpm: "Sin riesgo de mercado — pensión definida por fórmula legal",
    rais: "Sujeto a rendimientos del mercado financiero",
  },
];

const TRASLADO_STEPS = [
  "Solicitar doble asesoría (fondo actual + fondo destino)",
  "Radicar solicitud en colpensiones.gov.co",
  "Presentar formulario de traslado con documentos",
  "Esperar resolución (2 a 4 meses)",
];

export function ComparaDecide({
  records,
  userData,
  ley,
}: SectionProps) {
  const [perfil, setPerfil] = useState<PerfilRiesgo>("moderado");

  const fechaNac = useMemo(
    () => parseLocalDate(userData.fecha_nac),
    [userData.fecha_nac],
  );

  const totalSemanas = useMemo(
    () => records.reduce((sum, r) => sum + r.semanas, 0),
    [records],
  );

  const ibl = useMemo(() => calcularIBL(records), [records]);

  const tasaReemplazo = useMemo(
    () => calcularTasaReemplazo(totalSemanas, ley),
    [totalSemanas, ley],
  );

  const mesadaRPM = useMemo(
    () => ibl * tasaReemplazo,
    [ibl, tasaReemplazo],
  );

  const raisEstimacion = useMemo(
    () => estimarPensionRAIS(records, perfil),
    [records, perfil],
  );

  const diferencia20 = useMemo(
    () =>
      calcularDiferenciaAcumulada(
        mesadaRPM,
        raisEstimacion.mesadaEstimada,
        20,
      ),
    [mesadaRPM, raisEstimacion.mesadaEstimada],
  );

  const diferenciasMensual = useMemo(
    () => mesadaRPM - raisEstimacion.mesadaEstimada,
    [mesadaRPM, raisEstimacion.mesadaEstimada],
  );

  const traslado = useMemo(
    () =>
      calificaTrasladoRegimen(
        totalSemanas,
        userData.sexo,
        fechaNac,
        new Date(),
        ley,
      ),
    [totalSemanas, userData.sexo, fechaNac, ley],
  );

  const salarioReciente = useMemo(() => {
    if (records.length === 0) return 0;
    const sorted = [...records].sort(
      (a, b) =>
        new Date(b.fecha_fin).getTime() -
        new Date(a.fecha_fin).getTime(),
    );
    return sorted[0]!.salario;
  }, [records]);

  const smmlvMesadaRPM = useMemo(
    () =>
      calcularSmmlvEquivalente(mesadaRPM, new Date().getFullYear()),
    [mesadaRPM],
  );

  const rpmFavorece = diferenciasMensual >= 0;

  return (
    <div className="space-y-6">
      {/* Block 1: Regulatory status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5 text-[var(--color-accent-semantic)]" />
            Estado normativo actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-positive)]/30 bg-[var(--color-positive)]/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[var(--color-positive)]" />
                <h3 className="font-semibold">
                  <Term term="Ley 100">Ley 100/93</Term> — Vigente
                </h3>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>1.300 semanas para hombres y mujeres</li>
                <li>Edad: 57 (mujer) / 62 (hombre)</li>
                <li>
                  Tasa de reemplazo: 55%–80% del{" "}
                  <Term term="IBL">IBL</Term>
                </li>
                <li>Dos regímenes: RPM y RAIS</li>
              </ul>
            </div>
            <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-5 text-[var(--color-warning)]" />
                <h3 className="font-semibold">
                  <Term term="Ley 2381">Ley 2381/2024</Term> —
                  Suspendida
                </h3>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>
                  Reducción gradual de semanas para mujeres
                  (1.250→750)
                </li>
                <li>Descuento de 50 semanas por hijo (máx. 3)</li>
                <li>Pilar semicontributivo y pilar de ahorro</li>
                <li>
                  Bloqueada por la Corte Constitucional — pendiente
                  decisión de fondo
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block 2: RPM vs RAIS comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5 text-[var(--color-info)]" />
            <Term term="RPM">RPM</Term> vs{" "}
            <Term term="RAIS">RAIS</Term> — Comparativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Criterio
                  </th>
                  <th className="pb-3 pr-4 font-medium text-[var(--color-positive)]">
                    <Term term="Colpensiones">Colpensiones</Term>{" "}
                    (RPM)
                  </th>
                  <th className="pb-3 font-medium text-[var(--color-info)]">
                    Fondo Privado (RAIS)
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      i < COMPARISON_ROWS.length - 1
                        ? "border-b"
                        : ""
                    }
                  >
                    <td className="py-3 pr-4 font-medium">
                      {row.criterio}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.rpm}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {row.rais}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Block 3: Personalized estimation */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">
          Estimación personalizada con tus datos
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* RPM card */}
          <Card className="border-[var(--color-positive)]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[var(--color-positive)]">
                <Term term="Colpensiones">Colpensiones</Term> (RPM)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">
                  <Term term="IBL">IBL</Term>
                </span>
                <div className="text-xl font-bold">
                  {formatCOP(ibl)}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  <Term term="tasa de reemplazo">
                    Tasa de reemplazo
                  </Term>
                </span>
                <div className="text-xl font-bold">
                  {(tasaReemplazo * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  <Term term="mesada">Mesada</Term> estimada
                </span>
                <div className="text-2xl font-extrabold text-[var(--color-positive)]">
                  {formatCOP(mesadaRPM)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {smmlvMesadaRPM.toFixed(1)}{" "}
                  <Term term="SMMLV">SMMLV</Term>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* RAIS card */}
          <Card className="border-[var(--color-info)]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[var(--color-info)]">
                Fondo Privado (RAIS) — Estimado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="mb-1.5 block text-xs text-muted-foreground">
                  <Term term="perfil de riesgo">
                    Perfil de riesgo
                  </Term>
                </span>
                <div className="flex gap-1">
                  {PERFILES.map((p) => (
                    <Button
                      key={p.key}
                      variant={
                        perfil === p.key ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setPerfil(p.key)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Capital acumulado estimado
                </span>
                <div className="text-xl font-bold">
                  {formatCOP(raisEstimacion.capitalAcumulado)}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  <Term term="mesada">Mesada</Term> estimada
                </span>
                <div className="text-2xl font-extrabold text-[var(--color-info)]">
                  {formatCOP(raisEstimacion.mesadaEstimada)}
                </div>
                <span className="text-xs text-muted-foreground">
                  Sobre {raisEstimacion.mesesPension} meses de
                  expectativa
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conclusion card */}
        <Card
          className={
            rpmFavorece
              ? "border-[var(--color-positive)]/30 bg-[var(--color-positive)]/5"
              : "border-[var(--color-info)]/30 bg-[var(--color-info)]/5"
          }
        >
          <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-sm font-semibold">
              Con tu perfil,{" "}
              <span
                className={
                  rpmFavorece
                    ? "text-[var(--color-positive)]"
                    : "text-[var(--color-info)]"
                }
              >
                {rpmFavorece
                  ? "Colpensiones (RPM)"
                  : "Fondo Privado (RAIS)"}
              </span>{" "}
              te favorece
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">
                  Diferencia mensual:{" "}
                </span>
                <span className="font-bold">
                  {formatCOP(Math.abs(diferenciasMensual))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Diferencia acumulada (20 años):{" "}
                </span>
                <span className="font-bold">
                  {formatCOP(Math.abs(diferencia20))}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimación aproximada con perfil {perfil} — no
              constituye cálculo actuarial
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Block 4: Recommendation profiles */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-[var(--color-positive)]">
              <Shield className="size-4" />
              Te conviene Colpensiones si...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-positive)]" />
                Tu salario ha crecido con el tiempo (curva
                ascendente)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-positive)]" />
                Tienes carrera estable y continua
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-positive)]" />
                Tu salario reciente es medio-alto
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-positive)]" />
                Prefieres pensión predecible y vitalicia
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-[var(--color-info)]">
              <TrendingUp className="size-4" />
              Te conviene Fondo Privado si...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-info)]" />
                Tu carrera es corta o irregular
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-info)]" />
                Eres independiente con ingresos variables
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-info)]" />
                Tuviste salario alto desde joven y perfil agresivo
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-info)]" />
                Priorizas pensión anticipada o herencia directa
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Block 5: Transfer eligibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5 text-[var(--color-accent-semantic)]" />
            <Term term="traslado de régimen">
              Traslado de régimen
            </Term>{" "}
            — Elegibilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <TrasladoRequisito
              cumple={traslado.cumple_edad}
              label={`Edad mínima: ${traslado.edad_min} años`}
              detalle={`Tienes ${traslado.edad} años`}
            />
            <TrasladoRequisito
              cumple={traslado.cumple_semanas}
              label={`Semanas mínimas: ${traslado.semanas_min.toLocaleString("es-CO")}`}
              detalle={`Tienes ${totalSemanas.toLocaleString("es-CO")} semanas`}
            />
            <TrasladoRequisito
              cumple={traslado.dentro_plazo}
              label="Dentro del plazo (16 de julio de 2026)"
              detalle={
                traslado.dentro_plazo
                  ? `Quedan ${traslado.dias_restantes} días`
                  : "Plazo vencido"
              }
            />
          </div>

          <Card
            className={
              traslado.califica
                ? "border-[var(--color-positive)]/30 bg-[var(--color-positive)]/5"
                : "border-[var(--color-negative)]/30 bg-[var(--color-negative)]/5"
            }
          >
            <CardContent className="py-3 text-center text-sm font-semibold">
              {traslado.califica
                ? "Cumples los requisitos para trasladarte de régimen"
                : "No cumples todos los requisitos para el traslado"}
            </CardContent>
          </Card>

          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pasos para el traslado
            </h4>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              {TRASLADO_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--color-warning)]" />
            <p className="text-xs text-muted-foreground">
              El traslado voluntario fue autorizado por la Corte
              Constitucional desde junio de 2025. La{" "}
              <Term term="doble asesoría">doble asesoría</Term> es
              un requisito obligatorio y no reemplaza la asesoría
              profesional certificada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Block 6: Long-term impact KPIs */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          Impacto a largo plazo
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tu salario actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold">
                {formatCOP(salarioReciente)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[var(--color-positive)]">
                Mesada Colpensiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-[var(--color-positive)]">
                {formatCOP(mesadaRPM)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[var(--color-info)]">
                Mesada RAIS ({perfil})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-[var(--color-info)]">
                {formatCOP(raisEstimacion.mesadaEstimada)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Diferencia 20 años
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-extrabold ${
                  rpmFavorece
                    ? "text-[var(--color-positive)]"
                    : "text-[var(--color-info)]"
                }`}
              >
                {formatCOP(Math.abs(diferencia20))}
              </div>
              <span className="text-xs text-muted-foreground">
                A favor de{" "}
                {rpmFavorece ? "Colpensiones" : "Fondo Privado"}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="rounded-lg border border-muted bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-semibold">Aviso legal</p>
        <p className="mt-1">
          Esta herramienta es informativa y educativa. No constituye
          asesoría financiera, legal ni actuarial. Las estimaciones
          del régimen RAIS son aproximaciones basadas en supuestos
          simplificados y no reflejan rendimientos reales de fondos
          de pensiones. Consulta con un asesor pensional certificado
          antes de tomar decisiones sobre tu régimen.
        </p>
      </div>
    </div>
  );
}

function TrasladoRequisito({
  cumple,
  label,
  detalle,
}: {
  cumple: boolean;
  label: string;
  detalle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {cumple ? (
        <CheckCircle2 className="size-5 shrink-0 text-[var(--color-positive)]" />
      ) : (
        <XCircle className="size-5 shrink-0 text-[var(--color-negative)]" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </div>
    </div>
  );
}

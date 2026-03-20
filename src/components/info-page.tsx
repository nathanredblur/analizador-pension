import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Lock,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

interface InfoPageProps {
  onBack: () => void;
}

export function InfoPage({ onBack }: InfoPageProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-4" />
            Volver
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Analizador de Pensión Colombiana
          </h1>
          <p className="text-lg text-muted-foreground">
            Herramienta gratuita para entender y proyectar tu pensión
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle>Qué hace esta herramienta</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Sube tu PDF de semanas cotizadas de Colpensiones y obtén un
              análisis completo de tu situación pensional. La herramienta
              extrae automáticamente tu historial y calcula:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Semanas cotizadas, faltantes y fecha estimada de pensión</li>
              <li>IBL ponderado y rango de mesada (65%–80%)</li>
              <li>Brechas de cotización entre empleos</li>
              <li>
                Elegibilidad para el régimen de transición (Ley 2381/2024) y
                traslado de régimen
              </li>
              <li>Proyección de mesada vs canasta familiar con inflación</li>
              <li>
                Simulador "¿Y si...?" para explorar escenarios de cotización
              </li>
              <li>Calculadora de ahorro complementario con CDT</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              <CardTitle>Privacidad</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Tu información es completamente privada. El PDF se procesa
              localmente en tu computador y los datos nunca se envían a
              servidores externos ni se almacenan en disco. Al cerrar la
              sesión, todo se destruye de la memoria.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="size-5 text-primary" />
              <CardTitle>Normativa</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Los cálculos se basan en la legislación colombiana vigente:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="font-medium text-foreground">
                  Ley 100 de 1993
                </span>{" "}
                — Sistema General de Pensiones
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Ley 797 de 2003
                </span>{" "}
                — Edad de pensión: 62 años (hombres), 57 años (mujeres).
                Semanas: 1.300
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Ley 2381 de 2024
                </span>{" "}
                — Reducción gradual de semanas para mujeres (2026–2036),
                régimen de transición y oportunidad de traslado
              </li>
            </ul>
            <p>
              Todos los valores son estimaciones y no constituyen asesoría
              legal o financiera. Consulta con Colpensiones o un asesor
              profesional para decisiones definitivas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              <CardTitle>Desarrollador</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Creado por{" "}
              <a
                href="https://nathanredblur.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                Nathan Redblur
              </a>
              . Proyecto open source con el objetivo de hacer la información
              pensional más accesible para los colombianos.
            </p>
            <a
              href="https://nathanredblur.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="mt-2">
                <ExternalLink className="mr-1.5 size-4" />
                nathanredblur.dev
              </Button>
            </a>
          </CardContent>
        </Card>
      </main>

      <Separator />

      <footer className="py-6 text-center text-xs text-muted-foreground">
        Analizador de Pensión Colombiana &middot;{" "}
        <a
          href="https://nathanredblur.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          nathanredblur.dev
        </a>
      </footer>
    </div>
  );
}

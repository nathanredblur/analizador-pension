import { useState } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  FileSearch,
  PiggyBank,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PdfUploadForm } from "@/components/pdf-upload-form";
import type { CotizacionRecord } from "@/lib/normativa";

interface UserData {
  nombre: string;
  fecha_nac: string;
  sexo: "M" | "F";
  n_hijos: number;
}

const FEATURES = [
  {
    icon: FileSearch,
    title: "Extracción automática",
    description:
      "Sube tu PDF de Colpensiones y extrae automáticamente tu historial de cotizaciones.",
  },
  {
    icon: Calendar,
    title: "Fecha estimada de pensión",
    description:
      "Calcula cuándo podrás pensionarte según tu edad, semanas y la ley vigente.",
  },
  {
    icon: BarChart3,
    title: "Análisis detallado",
    description:
      "Visualiza gaps de cotización, evolución salarial e IBL ponderado.",
  },
  {
    icon: PiggyBank,
    title: "Proyección financiera",
    description:
      "Simula tu mesada con inflación, calcula ahorro complementario con CDT.",
  },
  {
    icon: Shield,
    title: "Régimen de transición",
    description:
      "Verifica si calificas bajo Ley 2381/2024 y oportunidades de traslado.",
  },
  {
    icon: Clock,
    title: "Normativa actualizada",
    description:
      "Ley 100/797/2381: reducción gradual de semanas para mujeres 2026–2036.",
  },
];

function App() {
  const [data, setData] = useState<{
    records: CotizacionRecord[];
    userData: UserData;
  } | null>(null);

  if (data) {
    const totalSemanas = data.records.reduce((s, r) => s + r.semanas, 0);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4 text-center">
          <h1 className="text-2xl font-bold">Dashboard en construcción</h1>
          <p className="text-muted-foreground">
            {data.records.length} registros cargados &middot;{" "}
            {Math.round(totalSemanas)} semanas cotizadas
          </p>
          <button
            className="text-sm text-primary underline underline-offset-2"
            onClick={() => setData(null)}
          >
            &larr; Volver al formulario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="flex flex-col items-center gap-8 px-4 pt-16 pb-12 md:pt-24">
        <Badge variant="secondary" className="text-xs">
          Ley 100 / 797 / 2381 actualizada
        </Badge>

        <div className="max-w-2xl space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Analiza tu pensión
            <span className="text-primary"> colombiana</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Sube tu PDF de Colpensiones y obtén proyecciones detalladas de tu
            pensión basadas en la normativa vigente. Todo se procesa en tu
            navegador.
          </p>
        </div>

        <PdfUploadForm
          onSuccess={(records, userData) => setData({ records, userData })}
        />
      </div>

      <Separator />

      {/* Features */}
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">
          Todo lo que necesitas para entender tu pensión
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <f.icon className="size-5 text-primary" />
                <h3 className="font-medium">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Analizador de Pensión Colombiana &middot; Todos los cálculos son
        estimaciones basadas en la normativa vigente
      </footer>
    </div>
  );
}

export default App;

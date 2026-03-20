import { useState } from "react";
import { Lock, Scale, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PdfUploadForm } from "@/components/pdf-upload-form";
import { Dashboard } from "@/components/dashboard";
import { InfoPage } from "@/components/info-page";
import { ThemeToggle } from "@/components/theme-toggle";
import type { CotizacionRecord } from "@/lib/normativa";
import type { UserData } from "@/components/dashboard/types";

const VALUE_PROPS = [
  {
    icon: Lock,
    title: "100% Privado",
    description: "Todo se procesa en tu navegador. Tus datos nunca salen de tu dispositivo.",
  },
  {
    icon: ShieldCheck,
    title: "Ley actualizada",
    description: "Ley 100/93 vigente con escenario Ley 2381 incluido para comparar.",
  },
  {
    icon: Scale,
    title: "RPM vs RAIS",
    description: "Compara regímenes con tus datos reales y evalúa traslado.",
  },
];

const STEPS = [
  { num: 1, label: "Sube tu PDF" },
  { num: 2, label: "Diagnóstico" },
  { num: 3, label: "Simula" },
  { num: 4, label: "Decide" },
];

function App() {
  const [data, setData] = useState<{
    records: CotizacionRecord[];
    userData: UserData;
  } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  if (showInfo) {
    return <InfoPage onBack={() => setShowInfo(false)} />;
  }

  if (data) {
    return (
      <Dashboard
        records={data.records}
        userData={data.userData}
        onExit={() => setData(null)}
        onShowInfo={() => setShowInfo(true)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center gap-8 px-4 pt-16 pb-12 md:pt-24">
        <Badge variant="secondary" className="text-xs uppercase tracking-widest">
          Analizador de Pensión
        </Badge>

        <div className="max-w-2xl space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Entiende tu pensión.
            <br />
            <span className="text-primary">Toma mejores decisiones.</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Sube tu extracto de Colpensiones y obtén un diagnóstico
            personalizado con recomendaciones claras. 100% privado — tus datos
            nunca salen de tu navegador.
          </p>
        </div>

        <PdfUploadForm
          onSuccess={(records, userData) => setData({ records, userData })}
        />
      </div>

      {/* Value props */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <div
              key={v.title}
              className="rounded-lg border bg-card p-4 text-center"
            >
              <v.icon className="mx-auto mb-2 size-6 text-primary" />
              <h3 className="text-sm font-semibold">{v.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {v.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-3xl px-4 pb-16">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Cómo funciona
        </p>
        <div className="flex items-center justify-center gap-3">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.num}
                </div>
                <span className="text-sm text-muted-foreground">
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className="text-muted-foreground/40">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <button
          onClick={() => setShowInfo(true)}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Acerca del proyecto
        </button>
        {" · "}
        Hecho por{" "}
        <a
          href="https://nathanredblur.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          nathanredblur.dev
        </a>
      </footer>
    </div>
  );
}

export default App;

import { useState } from "react";
import {
  BarChart3,
  Lightbulb,
  LogOut,
  Scale,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { LawToggle } from "@/components/dashboard/law-toggle";
import { Diagnostico } from "@/components/dashboard/diagnostico";
import { SituacionActual } from "@/components/dashboard/situacion-actual";
import { MiFuturo } from "@/components/dashboard/mi-futuro";
import { ComparaDecide } from "@/components/dashboard/compara-decide";
import type { DashboardProps } from "@/components/dashboard/types";
import type { Ley } from "@/lib/constants";

const SECTIONS = [
  { value: "diagnostico", label: "Tu diagnóstico", icon: Lightbulb },
  { value: "situacion", label: "Tu situación", icon: BarChart3 },
  { value: "futuro", label: "Tu futuro", icon: TrendingUp },
  { value: "compara", label: "Compara y decide", icon: Scale },
] as const;

export function Dashboard({
  records,
  userData,
  onExit,
  onShowInfo,
}: DashboardProps) {
  const [ley, setLey] = useState<Ley>("ley100");
  const sectionProps = { records, userData, ley };

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Analizador de Pensión</h1>
            {userData.nombre && (
              <p className="text-sm text-muted-foreground">
                {userData.nombre}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LawToggle ley={ley} onChange={setLey} />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={onExit}>
              <LogOut className="mr-1.5 size-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="diagnostico">
          <TabsList className="no-print mb-6 flex w-full justify-start gap-1">
            {SECTIONS.map((s) => (
              <TabsTrigger
                key={s.value}
                value={s.value}
                className="flex items-center gap-1.5"
              >
                <s.icon className="size-4" />
                <span>{s.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="diagnostico">
            <Diagnostico {...sectionProps} />
          </TabsContent>
          <TabsContent value="situacion">
            <SituacionActual {...sectionProps} />
          </TabsContent>
          <TabsContent value="futuro">
            <MiFuturo {...sectionProps} />
          </TabsContent>
          <TabsContent value="compara">
            <ComparaDecide {...sectionProps} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="no-print border-t py-4 text-center text-xs text-muted-foreground">
        <button
          onClick={onShowInfo}
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

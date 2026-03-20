import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GLOSSARY: Record<string, string> = {
  IBL: "Ingreso Base de Liquidación: promedio ponderado de tus salarios en los últimos 10 años de cotización.",
  SMMLV: "Salario Mínimo Mensual Legal Vigente.",
  mesada:
    "Pago mensual que recibes como pensión. Se calcula como un porcentaje (65%–80%) del IBL.",
  "tasa de reemplazo":
    "Porcentaje del IBL que recibes como mesada. Va del 65% (con 1.300 semanas) al 80% (con 1.800+).",
  CDT: "Certificado de Depósito a Término: instrumento de ahorro a plazo fijo con tasa garantizada.",
  "semanas cotizadas":
    "Semanas que has aportado al sistema de pensiones. Se necesitan entre 750 y 1.300 según sexo y año.",
  "régimen de transición":
    "Beneficio de la Ley 2381/2024 que reduce las semanas requeridas para quienes alcancen cierto umbral al 30/jun/2025.",
  "traslado de régimen":
    "Oportunidad de cambiar entre el Régimen de Prima Media (Colpensiones) y el de Ahorro Individual (AFP). Plazo hasta 16/jul/2026.",
  canasta:
    "Canasta familiar: costo mensual estimado de gastos básicos (arriendo, mercado, servicios, transporte, salud) según estrato.",
  RPM: "Régimen de Prima Media — fondo público administrado por Colpensiones. La pensión se calcula sobre el promedio salarial de los últimos 10 años.",
  RAIS: "Régimen de Ahorro Individual con Solidaridad — fondos privados (Porvenir, Protección, Colfondos, Skandia). La pensión depende del capital acumulado.",
  Colpensiones:
    "Administradora Colombiana de Pensiones — entidad pública que maneja el régimen de prima media (RPM).",
  "Ley 100":
    "Ley del Sistema General de Seguridad Social (1993). Establece los dos regímenes pensionales y los requisitos de edad y semanas.",
  "Ley 2381":
    "Reforma pensional aprobada en 2024 pero suspendida por la Corte Constitucional. Proponía reducción gradual de semanas para mujeres.",
  "doble asesoría":
    "Requisito legal obligatorio para trasladarse entre regímenes pensionales. Incluye asesoría del fondo actual y del fondo destino.",
  "pensión de sobrevivientes":
    "Pensión que reciben los beneficiarios de un afiliado fallecido. En Colpensiones es vitalicia; en fondos privados el capital va a herederos.",
  regularización:
    "Pago retroactivo de aportes para cubrir períodos sin cotización. Permite llenar vacíos en el historial de contribuciones.",
  "perfil de riesgo":
    "Estrategia de inversión del fondo privado: conservador (3-4% anual), moderado (6%), o agresivo (10-15%). Afecta el capital acumulado.",
  BEPS: "Beneficios Económicos Periódicos — programa para personas que no logran pensionarse. Otorga un subsidio periódico, no una pensión.",
  cotización:
    "Aporte mensual obligatorio al sistema pensional, equivalente al 16% del salario base de cotización.",
};

interface TermProps {
  term: string;
  children?: React.ReactNode;
}

export function Term({ term, children }: TermProps) {
  const key = Object.keys(GLOSSARY).find(
    (k) => k.toLowerCase() === term.toLowerCase(),
  );
  const definition = key ? GLOSSARY[key] : null;

  if (!definition) {
    return <>{children ?? term}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="cursor-help border-b border-dotted border-muted-foreground/50">
          {children ?? term}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

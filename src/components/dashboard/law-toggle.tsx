import type { Ley } from "@/lib/constants";

interface LawToggleProps {
  ley: Ley;
  onChange: (ley: Ley) => void;
}

const OPTIONS: Array<{ value: Ley; label: string; sublabel: string }> = [
  { value: "ley100", label: "Ley 100/93", sublabel: "vigente" },
  { value: "ley2381", label: "Ley 2381", sublabel: "suspendida" },
];

export function LawToggle({ ley, onChange }: LawToggleProps) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Normativa aplicada">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={ley === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            ley === opt.value
              ? "bg-primary text-primary-foreground"
              : "border bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          {opt.label}{" "}
          <span className="text-xs opacity-70">({opt.sublabel})</span>
        </button>
      ))}
    </div>
  );
}

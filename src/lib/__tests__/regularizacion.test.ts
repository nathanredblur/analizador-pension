import { describe, expect, it } from "vitest";
import type { GapRecord } from "@/lib/normativa";
import {
  calcularCostoRegularizacion,
  calcularImpactoRegularizacion,
  determinarFactibilidad,
} from "@/lib/regularizacion";

const sampleGap: GapRecord = {
  fecha_inicio: "2018-01-01",
  fecha_fin: "2019-12-31",
  duracion_dias: 730,
  duracion_semanas: 104,
  empleador_anterior: "Empresa A",
  empleador_siguiente: "Empresa B",
};

const sameEmployerGap: GapRecord = {
  fecha_inicio: "2018-01-01",
  fecha_fin: "2019-12-31",
  duracion_dias: 730,
  duracion_semanas: 104,
  empleador_anterior: "Empresa A",
  empleador_siguiente: "Empresa A",
};

describe("calcularCostoRegularizacion", () => {
  it("returns positive cost", () => {
    const cost = calcularCostoRegularizacion(
      sampleGap,
      3_000_000,
    );
    expect(cost).toBeGreaterThan(0);
  });

  it("cost = salary * 16% * weeks", () => {
    const cost = calcularCostoRegularizacion(
      sampleGap,
      3_000_000,
    );
    const expected = 3_000_000 * 0.16 * 104;
    expect(cost).toBeCloseTo(expected);
  });
});

describe("determinarFactibilidad", () => {
  it("same employer → reclamable ante UGPP", () => {
    const result = determinarFactibilidad(sameEmployerGap);
    expect(result.badge).toContain("UGPP");
  });

  it("different employers → posiblemente regularizable", () => {
    const result = determinarFactibilidad(sampleGap);
    expect(result.badge).toContain("regularizable");
  });
});

describe("calcularImpactoRegularizacion", () => {
  it("increases total weeks", () => {
    const impact = calcularImpactoRegularizacion(
      [sampleGap],
      3_000_000,
      810,
      1300,
      3_500_000,
      "ley100",
    );
    expect(impact.semanasNuevas).toBeGreaterThan(810);
  });

  it("reduces semanas faltantes", () => {
    const impact = calcularImpactoRegularizacion(
      [sampleGap],
      3_000_000,
      810,
      1300,
      3_500_000,
      "ley100",
    );
    expect(impact.semanasFaltantesNuevas).toBeLessThan(
      1300 - 810,
    );
  });
});

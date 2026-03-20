import { describe, expect, it } from "vitest";
import type { CotizacionRecord } from "@/lib/normativa";
import {
  calcularDiferenciaAcumulada,
  estimarPensionRAIS,
} from "@/lib/rais";

const records: CotizacionRecord[] = [
  {
    fecha_inicio: "2000-01-01",
    fecha_fin: "2010-12-31",
    empleador: "A",
    semanas: 520,
    salario: 2_000_000,
    lic: 0,
    sim: 0,
  },
  {
    fecha_inicio: "2011-01-01",
    fecha_fin: "2025-12-31",
    empleador: "B",
    semanas: 780,
    salario: 4_000_000,
    lic: 0,
    sim: 0,
  },
];

describe("estimarPensionRAIS", () => {
  it("returns positive capital and mesada", () => {
    const result = estimarPensionRAIS(records, "conservador");
    expect(result.capitalAcumulado).toBeGreaterThan(0);
    expect(result.mesadaEstimada).toBeGreaterThan(0);
  });

  it("aggressive profile yields more capital", () => {
    const conserv = estimarPensionRAIS(records, "conservador");
    const agresivo = estimarPensionRAIS(records, "agresivo");
    expect(agresivo.capitalAcumulado).toBeGreaterThan(
      conserv.capitalAcumulado,
    );
  });

  it("returns capital, mesada, and mesesPension", () => {
    const result = estimarPensionRAIS(records, "moderado");
    expect(result).toHaveProperty("capitalAcumulado");
    expect(result).toHaveProperty("mesadaEstimada");
    expect(result).toHaveProperty("mesesPension");
  });
});

describe("calcularDiferenciaAcumulada", () => {
  it("returns positive difference over 20 years", () => {
    const diff = calcularDiferenciaAcumulada(
      2_400_000,
      1_750_000,
      20,
    );
    expect(diff).toBeCloseTo(
      (2_400_000 - 1_750_000) * 12 * 20,
    );
  });

  it("returns negative if RAIS is better", () => {
    const diff = calcularDiferenciaAcumulada(
      1_000_000,
      2_000_000,
      20,
    );
    expect(diff).toBeLessThan(0);
  });
});

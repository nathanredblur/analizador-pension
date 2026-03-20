import { describe, expect, it } from "vitest";
import type { CotizacionRecord } from "@/lib/normativa";
import {
  calcularSemaforo,
  generarAlertas,
  generarRecomendaciones,
} from "@/lib/diagnostico";

const baseRecords: CotizacionRecord[] = [
  {
    fecha_inicio: "2000-01-01",
    fecha_fin: "2024-12-31",
    empleador: "Empresa A",
    semanas: 1200,
    salario: 3_000_000,
    lic: 0,
    sim: 0,
  },
];

describe("calcularSemaforo", () => {
  it("green: >= 90% weeks and <= 5 years to pension", () => {
    const result = calcularSemaforo(1200, 1300, 4, "ley100");
    expect(result).toBe("green");
  });

  it("red: < 60% weeks", () => {
    const result = calcularSemaforo(500, 1300, 10, "ley100");
    expect(result).toBe("red");
  });

  it("red: insufficient rate (need more than 52 weeks/year)", () => {
    const result = calcularSemaforo(800, 1300, 3, "ley100");
    expect(result).toBe("red");
  });

  it("yellow: fallback for everything else", () => {
    const result = calcularSemaforo(900, 1300, 10, "ley100");
    expect(result).toBe("yellow");
  });

  it("green: already meets requirements", () => {
    const result = calcularSemaforo(1300, 1300, 0, "ley100");
    expect(result).toBe("green");
  });
});

describe("generarAlertas", () => {
  it("returns max 4 alerts", () => {
    const alerts = generarAlertas(
      baseRecords,
      "F",
      new Date("1975-01-01"),
      0,
      "ley100",
    );
    expect(alerts.length).toBeLessThanOrEqual(4);
  });

  it("returns at least 1 alert (positive if no gaps)", () => {
    const alerts = generarAlertas(
      baseRecords,
      "M",
      new Date("1975-01-01"),
      0,
      "ley100",
    );
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("each alert has type, title, description", () => {
    const alerts = generarAlertas(
      baseRecords,
      "M",
      new Date("1975-01-01"),
      0,
      "ley100",
    );
    for (const alert of alerts) {
      expect(alert).toHaveProperty("type");
      expect(alert).toHaveProperty("title");
      expect(alert).toHaveProperty("description");
    }
  });
});

describe("generarRecomendaciones", () => {
  it("returns 1-3 recommendations", () => {
    const recs = generarRecomendaciones(
      baseRecords,
      "F",
      new Date("1975-01-01"),
      0,
      "ley100",
    );
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it("each recommendation has action and link", () => {
    const recs = generarRecomendaciones(
      baseRecords,
      "M",
      new Date("1975-01-01"),
      0,
      "ley100",
    );
    for (const rec of recs) {
      expect(rec).toHaveProperty("action");
      expect(rec).toHaveProperty("link");
    }
  });
});

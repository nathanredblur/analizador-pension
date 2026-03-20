import { describe, expect, it } from "vitest";
import type { CotizacionRecord } from "@/lib/normativa";
import {
  calcularGaps,
  calcularIBL,
  calcularMesada,
  calcularSemanasAlCorte,
  calcularTasaReemplazo,
  calificaTransicion2381,
  calificaTrasladoRegimen,
  descuentoSemanasPorHijos,
  fechaEstimadaPension,
  semanasFaltantes,
  semanasRequeridas,
} from "@/lib/normativa";

const sampleRecords: CotizacionRecord[] = [
  {
    fecha_inicio: "2010-01-01",
    fecha_fin: "2012-05-31",
    empleador: "Empresa A",
    semanas: 120,
    salario: 1_500_000,
    lic: 0,
    sim: 0,
  },
  {
    fecha_inicio: "2012-06-01",
    fecha_fin: "2014-12-31",
    empleador: "Empresa B",
    semanas: 130,
    salario: 2_000_000,
    lic: 0,
    sim: 0,
  },
  {
    fecha_inicio: "2015-01-01",
    fecha_fin: "2025-12-31",
    empleador: "Empresa C",
    semanas: 560,
    salario: 4_000_000,
    lic: 0,
    sim: 0,
  },
];

describe("semanas al corte", () => {
  it("suma todas si el corte es posterior", () => {
    const total = calcularSemanasAlCorte(sampleRecords, new Date("2026-01-01"));
    expect(total).toBeCloseTo(810);
  });

  it("filtra por fecha", () => {
    const total = calcularSemanasAlCorte(sampleRecords, new Date("2011-01-01"));
    expect(total).toBeCloseTo(120);
  });
});

describe("semanas requeridas", () => {
  it("hombre siempre 1300 (ley100)", () => {
    expect(semanasRequeridas("M", 2026, "ley100")).toBe(1300);
  });

  it("ley100: mujer also returns 1300 regardless of year", () => {
    expect(semanasRequeridas("F", 2026, "ley100")).toBe(1300);
    expect(semanasRequeridas("F", 2036, "ley100")).toBe(1300);
  });

  it("ley2381: mujer gradual", () => {
    expect(semanasRequeridas("F", 2026, "ley2381")).toBe(1250);
    expect(semanasRequeridas("F", 2036, "ley2381")).toBe(750);
    expect(semanasRequeridas("F", 2025, "ley2381")).toBe(1300);
  });

  it("ley2381: mujer post 2036 usa mínimo 750", () => {
    expect(semanasRequeridas("F", 2040, "ley2381")).toBe(750);
  });

  it("default ley is ley100", () => {
    expect(semanasRequeridas("F", 2026)).toBe(1300);
  });
});

describe("descuento por hijos", () => {
  it("ley100: no discount (children discount is 2381 provision)", () => {
    expect(descuentoSemanasPorHijos(1300, 3, "ley100")).toBe(1300);
  });

  it("ley2381: applies 50 weeks per child", () => {
    expect(descuentoSemanasPorHijos(1250, 3, "ley2381")).toBe(1100);
  });

  it("ley2381: cap en 3 hijos", () => {
    const base = semanasRequeridas("F", 2026, "ley2381"); // 1250
    expect(descuentoSemanasPorHijos(base, 3, "ley2381")).toBe(
      descuentoSemanasPorHijos(base, 5, "ley2381"),
    );
  });

  it("default ley is ley100 (no discount)", () => {
    expect(descuentoSemanasPorHijos(1300, 3)).toBe(1300);
  });

  it("cero hijos sin descuento", () => {
    expect(descuentoSemanasPorHijos(1250, 0, "ley2381")).toBe(1250);
  });
});

describe("semanas faltantes", () => {
  it("ley100: hombre needs 1300", () => {
    const faltantes = semanasFaltantes(sampleRecords, "M", 0, 2026, "ley100");
    expect(faltantes).toBeCloseTo(1300 - 810);
  });

  it("ley100: mujer also needs 1300 (no child discount)", () => {
    const faltantes = semanasFaltantes(sampleRecords, "F", 3, 2026, "ley100");
    expect(faltantes).toBeCloseTo(1300 - 810);
  });

  it("ley2381: mujer with children gets discount", () => {
    const faltantes = semanasFaltantes(sampleRecords, "F", 3, 2026, "ley2381");
    expect(faltantes).toBeCloseTo(1100 - 810);
  });

  it("no negativo", () => {
    const rich: CotizacionRecord[] = [
      {
        fecha_inicio: "2000-01-01",
        fecha_fin: "2025-12-31",
        empleador: "X",
        semanas: 2000,
        salario: 5_000_000,
        lic: 0,
        sim: 0,
      },
    ];
    expect(semanasFaltantes(rich, "M", 0, 2026)).toBe(0);
  });
});

describe("IBL y mesada", () => {
  it("IBL devuelve float positivo", () => {
    const ibl = calcularIBL(sampleRecords);
    expect(ibl).toBeGreaterThan(0);
  });

  it("IBL ponderado se acerca a salario mayor", () => {
    const ibl = calcularIBL(sampleRecords);
    expect(ibl).toBeGreaterThan(3_000_000);
  });

  it("mesada rango 65%-80%", () => {
    const ibl = calcularIBL(sampleRecords);
    const [min, max] = calcularMesada(ibl);
    expect(min).toBeCloseTo(ibl * 0.65);
    expect(max).toBeCloseTo(ibl * 0.8);
  });
});

describe("tasa de reemplazo", () => {
  it("ley100: 55% at 1000 weeks", () => {
    expect(calcularTasaReemplazo(1000, "ley100")).toBeCloseTo(0.55);
  });

  it("ley100: below 1000 weeks still returns 55% floor", () => {
    expect(calcularTasaReemplazo(800, "ley100")).toBeCloseTo(0.55);
  });

  it("ley100: increases by 1.5% per 50 weeks above 1000", () => {
    expect(calcularTasaReemplazo(1100, "ley100")).toBeCloseTo(0.58);
  });

  it("ley100: capped at 80%", () => {
    expect(calcularTasaReemplazo(3000, "ley100")).toBeCloseTo(0.80);
  });

  it("ley2381: 65% at 1300 weeks", () => {
    expect(calcularTasaReemplazo(1300, "ley2381")).toBeCloseTo(0.65);
  });

  it("ley100 and ley2381 produce different results at 1100 weeks", () => {
    const ley100 = calcularTasaReemplazo(1100, "ley100");
    const ley2381 = calcularTasaReemplazo(1100, "ley2381");
    expect(ley100).not.toBeCloseTo(ley2381);
  });

  it("default ley is ley100", () => {
    expect(calcularTasaReemplazo(1000)).toBeCloseTo(0.55);
  });
});

describe("transición 2381", () => {
  it("mujer con 810 semanas califica", () => {
    const result = calificaTransicion2381(sampleRecords, "F");
    expect(result.califica).toBe(true);
    expect(result.semanas_al_corte).toBeCloseTo(810);
  });

  it("hombre con pocas semanas no califica", () => {
    const few: CotizacionRecord[] = [
      {
        fecha_inicio: "2020-01-01",
        fecha_fin: "2025-01-01",
        empleador: "A",
        semanas: 200,
        salario: 2_000_000,
        lic: 0,
        sim: 0,
      },
    ];
    expect(calificaTransicion2381(few, "M").califica).toBe(false);
  });

  it("resultado contiene claves", () => {
    const result = calificaTransicion2381(sampleRecords, "M");
    expect(result).toHaveProperty("califica");
    expect(result).toHaveProperty("semanas_al_corte");
    expect(result).toHaveProperty("umbral");
    expect(result).toHaveProperty("semanas_faltantes_umbral");
  });
});

describe("traslado régimen", () => {
  it("dentro de plazo califica", () => {
    const result = calificaTrasladoRegimen(
      810,
      "F",
      new Date("1975-01-01"),
      new Date("2025-06-01"),
    );
    expect(result.califica).toBe(true);
    expect(result.cumple_edad).toBe(true);
    expect(result.cumple_semanas).toBe(true);
  });

  it("fuera de plazo no califica", () => {
    const result = calificaTrasladoRegimen(
      810,
      "F",
      new Date("1975-01-01"),
      new Date("2027-01-01"),
    );
    expect(result.califica).toBe(false);
  });

  it("young person fails age check", () => {
    const result = calificaTrasladoRegimen(
      810,
      "F",
      new Date("1990-01-01"),
      new Date("2025-06-01"),
    );
    expect(result.cumple_edad).toBe(false);
    expect(result.califica).toBe(false);
  });

  it("fails weeks check at boundary (749 weeks for woman)", () => {
    const result = calificaTrasladoRegimen(
      749,
      "F",
      new Date("1975-01-01"),
      new Date("2025-06-01"),
    );
    expect(result.cumple_semanas).toBe(false);
    expect(result.califica).toBe(false);
  });
});

describe("gaps", () => {
  it("detecta gaps", () => {
    const gaps = calcularGaps(sampleRecords);
    expect(Array.isArray(gaps)).toBe(true);
  });

  it("detecta gap real", () => {
    const withGap: CotizacionRecord[] = [
      {
        fecha_inicio: "2010-01-01",
        fecha_fin: "2012-12-31",
        empleador: "A",
        semanas: 100,
        salario: 2_000_000,
        lic: 0,
        sim: 0,
      },
      {
        fecha_inicio: "2015-01-01",
        fecha_fin: "2020-12-31",
        empleador: "B",
        semanas: 200,
        salario: 3_000_000,
        lic: 0,
        sim: 0,
      },
    ];
    const gaps = calcularGaps(withGap);
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    expect(gaps[0]!.duracion_semanas).toBeGreaterThan(50);
  });
});

describe("fecha estimada pensión", () => {
  it("retorna estructura correcta", () => {
    const result = fechaEstimadaPension(
      sampleRecords,
      "M",
      new Date("1985-03-15"),
      0,
    );
    expect(result).toHaveProperty("fecha_pension");
    expect(result).toHaveProperty("semanas_cotizadas");
    expect(result.semanas_cotizadas).toBeCloseTo(810);
    expect(result).toHaveProperty("anios_restantes");
  });

  it("ley100: women need 1300 weeks (same as men)", () => {
    const result = fechaEstimadaPension(
      sampleRecords,
      "F",
      new Date("1985-03-15"),
      3,
      52,
      new Date("2026-01-01"),
      "ley100",
    );
    expect(result.semanas_requeridas).toBe(1300);
  });

  it("ley2381: women get child discount", () => {
    const result = fechaEstimadaPension(
      sampleRecords,
      "F",
      new Date("1985-03-15"),
      3,
      52,
      new Date("2026-01-01"),
      "ley2381",
    );
    expect(result.semanas_requeridas).toBeLessThan(1300);
  });

  it("ley100 pension date is later or equal to ley2381 for women", () => {
    const ley100 = fechaEstimadaPension(
      sampleRecords,
      "F",
      new Date("1985-03-15"),
      3,
      52,
      new Date("2026-01-01"),
      "ley100",
    );
    const ley2381 = fechaEstimadaPension(
      sampleRecords,
      "F",
      new Date("1985-03-15"),
      3,
      52,
      new Date("2026-01-01"),
      "ley2381",
    );
    expect(ley100.fecha_pension.getTime()).toBeGreaterThanOrEqual(
      ley2381.fecha_pension.getTime(),
    );
  });
});

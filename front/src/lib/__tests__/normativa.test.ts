import { describe, expect, it } from "vitest";
import type { CotizacionRecord } from "@/lib/normativa";
import {
  calcularGaps,
  calcularIBL,
  calcularMesada,
  calcularSemanasAlCorte,
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
  it("hombre siempre 1300", () => {
    expect(semanasRequeridas("M", 2026)).toBe(1300);
  });

  it("mujer gradual", () => {
    expect(semanasRequeridas("F", 2026)).toBe(1250);
    expect(semanasRequeridas("F", 2036)).toBe(750);
    expect(semanasRequeridas("F", 2025)).toBe(1300);
  });

  it("mujer post 2036 usa mínimo 750", () => {
    expect(semanasRequeridas("F", 2040)).toBe(750);
  });
});

describe("descuento por hijos", () => {
  it("descuento básico", () => {
    const base = semanasRequeridas("F", 2026); // 1250
    expect(descuentoSemanasPorHijos(base, 3)).toBe(1100);
  });

  it("cap en 3 hijos", () => {
    const base = semanasRequeridas("F", 2026);
    expect(descuentoSemanasPorHijos(base, 3)).toBe(
      descuentoSemanasPorHijos(base, 5),
    );
  });

  it("cero hijos sin descuento", () => {
    expect(descuentoSemanasPorHijos(1250, 0)).toBe(1250);
  });
});

describe("semanas faltantes", () => {
  it("hombre", () => {
    const faltantes = semanasFaltantes(sampleRecords, "M", 0, 2026);
    expect(faltantes).toBeCloseTo(1300 - 810);
  });

  it("mujer con hijos", () => {
    const faltantes = semanasFaltantes(sampleRecords, "F", 3, 2026);
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
});

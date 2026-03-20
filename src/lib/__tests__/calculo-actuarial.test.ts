import { describe, expect, it } from "vitest";
import {
  calcularCalculoActuarial,
  calcularEdadEnFecha,
  calcularFAC3,
  calcularFactorDTF,
  calcularFechaCorte,
  calcularFechaReferencia,
  calcularTiempoOmision,
  calcularTotalMeses,
  interpolarFac,
  interpolarSMN,
} from "@/lib/calculo-actuarial";

// ─── Helper unit tests ──────────────────────────────────────

describe("calcularFechaCorte", () => {
  it("returns the latest end date among periods", () => {
    const fc = calcularFechaCorte([
      { fechaInicio: "01/01/2010", fechaFin: "30/06/2010" },
      { fechaInicio: "01/01/2015", fechaFin: "31/12/2015" },
      { fechaInicio: "01/06/2012", fechaFin: "30/11/2012" },
    ]);
    expect(fc.getFullYear()).toBe(2015);
    expect(fc.getMonth()).toBe(11); // December
  });
});

describe("calcularTiempoOmision", () => {
  it("sums days across multiple periods", () => {
    const t = calcularTiempoOmision([
      { fechaInicio: "01/01/2020", fechaFin: "31/12/2020" },
    ]);
    // 366 days / 365.25 ≈ 1.002
    expect(t).toBeGreaterThan(0.99);
    expect(t).toBeLessThan(1.01);
  });

  it("handles multiple periods", () => {
    const t = calcularTiempoOmision([
      { fechaInicio: "01/01/2020", fechaFin: "30/06/2020" },
      { fechaInicio: "01/01/2021", fechaFin: "30/06/2021" },
    ]);
    // ~362 days total / 365.25 ≈ 0.99
    expect(t).toBeGreaterThan(0.95);
    expect(t).toBeLessThan(1.05);
  });
});

describe("calcularTotalMeses", () => {
  it("counts months across periods", () => {
    const m = calcularTotalMeses([
      { fechaInicio: "01/01/2020", fechaFin: "30/06/2020" },
      { fechaInicio: "01/01/2022", fechaFin: "30/06/2022" },
    ]);
    expect(m).toBe(12);
  });
});

describe("calcularEdadEnFecha", () => {
  it("calculates age as decimal", () => {
    const nac = new Date(1980, 0, 1);
    const fecha = new Date(2026, 0, 1);
    const edad = calcularEdadEnFecha(nac, fecha);
    expect(edad).toBeCloseTo(46, 0);
  });
});

describe("interpolarSMN", () => {
  it("returns exact value for integer age", () => {
    const val = interpolarSMN(30);
    expect(val).toBe(10_200_000);
  });

  it("interpolates for fractional age", () => {
    const val = interpolarSMN(30.5);
    // Midpoint between age 30 (10.2M) and 31 (10.6M)
    expect(val).toBe(10_400_000);
  });

  it("clamps to 12 for young ages", () => {
    expect(interpolarSMN(5)).toBe(interpolarSMN(12));
  });

  it("clamps to 71 for old ages", () => {
    expect(interpolarSMN(80)).toBe(interpolarSMN(71));
  });
});

describe("interpolarFac", () => {
  it("returns exact factors for integer age", () => {
    const { fac1, fac2 } = interpolarFac("M", 62);
    expect(fac1).toBe(134.31);
    expect(fac2).toBe(13.43);
  });

  it("interpolates for fractional age", () => {
    const { fac1 } = interpolarFac("F", 60.5);
    // Midpoint between F 60 (161.62) and F 61 (156.30)
    expect(fac1).toBeCloseTo(158.96, 1);
  });

  it("clamps to 55 for young ages", () => {
    const low = interpolarFac("M", 50);
    const at55 = interpolarFac("M", 55);
    expect(low.fac1).toBe(at55.fac1);
  });

  it("clamps to 90 for old ages", () => {
    const high = interpolarFac("M", 95);
    const at90 = interpolarFac("M", 90);
    expect(high.fac1).toBe(at90.fac1);
  });
});

describe("calcularFAC3", () => {
  it("returns value between 0 and 1 for normal case", () => {
    const fac3 = calcularFAC3(2, 10, false, 0);
    expect(fac3).toBeGreaterThan(0);
    expect(fac3).toBeLessThan(1);
  });

  it("caso ii adjusts by t/t1 ratio", () => {
    const fac3Normal = calcularFAC3(2, 10, false, 0);
    const fac3Caso2 = calcularFAC3(2, 10, true, 500);
    // Caso ii should differ from normal
    expect(fac3Caso2).not.toBeCloseTo(fac3Normal, 2);
  });

  it("returns 0 when denominator is 0", () => {
    const fac3 = calcularFAC3(0, 0, false, 0);
    expect(fac3).toBe(0);
  });
});

describe("calcularFactorDTF", () => {
  it("returns 1 when dates are equal", () => {
    const d = new Date(2025, 0, 1);
    expect(calcularFactorDTF(d, d)).toBe(1);
  });

  it("returns > 1 when payment is after FC", () => {
    const fc = new Date(2020, 0, 1);
    const pago = new Date(2026, 2, 31);
    const factor = calcularFactorDTF(fc, pago);
    expect(factor).toBeGreaterThan(1);
  });

  it("increases over time", () => {
    const fc = new Date(2020, 0, 1);
    const pago1 = new Date(2024, 0, 1);
    const pago2 = new Date(2026, 0, 1);
    expect(calcularFactorDTF(fc, pago2)).toBeGreaterThan(
      calcularFactorDTF(fc, pago1),
    );
  });
});

describe("calcularFechaReferencia", () => {
  it("FR is at least pension age date", () => {
    const fechaNac = new Date(1980, 5, 15);
    const fc = new Date(2010, 11, 31);
    const { fr } = calcularFechaReferencia(
      fechaNac, "M", fc, 2, 500,
    );
    // Man born 1980 → pension at 62 → 2042
    expect(fr.getFullYear()).toBeGreaterThanOrEqual(2042);
  });
});

// ─── Integration tests ──────────────────────────────────────

describe("calcularCalculoActuarial", () => {
  const baseInput = {
    periodos: [
      {
        fechaInicio: "01/12/2006",
        fechaFin: "30/04/2009",
      },
    ],
    salarioBase: 600_000,
    fechaNacimiento: new Date(1975, 0, 1),
    sexo: "M" as const,
    semanasCotizadasAntes: 500,
    fechaPago: new Date(2026, 2, 15),
    ley: "ley100" as const,
  };

  it("returns positive total", () => {
    const result = calcularCalculoActuarial(baseInput);
    expect(result.totalPagar).toBeGreaterThan(0);
  });

  it("counts correct months for Dec 2006 – Apr 2009", () => {
    const result = calcularCalculoActuarial(baseInput);
    expect(result.totalMeses).toBe(29);
  });

  it("second deadline total exceeds first", () => {
    const result = calcularCalculoActuarial(baseInput);
    expect(result.fechaLimite2.total).toBeGreaterThan(
      result.fechaLimite1.total,
    );
  });

  it("SB is clamped to at least SMMLV", () => {
    const result = calcularCalculoActuarial({
      ...baseInput,
      salarioBase: 100,
    });
    // Even with salary 100, sb should be at least SMMLV
    expect(result.desglose.sb).toBeGreaterThanOrEqual(300_000);
  });

  it("SB is clamped to at most 25×SMMLV", () => {
    const result = calcularCalculoActuarial({
      ...baseInput,
      salarioBase: 999_999_999,
    });
    const smmlv2009 = 496_900; // SMMLV of FC year (2009)
    expect(result.desglose.sb).toBeLessThanOrEqual(25 * smmlv2009);
  });

  it("desglose contains all required fields", () => {
    const result = calcularCalculoActuarial(baseInput);
    const d = result.desglose;
    expect(d.fc).toBeInstanceOf(Date);
    expect(d.fr).toBeInstanceOf(Date);
    expect(d.er).toBeGreaterThan(0);
    expect(d.t).toBeGreaterThan(0);
    expect(d.fac1).toBeGreaterThan(0);
    expect(d.fac2).toBeGreaterThan(0);
    expect(d.fac3).toBeGreaterThan(0);
    expect(d.vra).toBeGreaterThan(0);
    expect(d.vr).toBeGreaterThan(0);
    expect(d.vrActualizado).toBeGreaterThan(0);
  });

  it("handles multiple periods", () => {
    const result = calcularCalculoActuarial({
      ...baseInput,
      periodos: [
        { fechaInicio: "01/01/2020", fechaFin: "30/06/2020" },
        { fechaInicio: "01/01/2022", fechaFin: "30/06/2022" },
      ],
    });
    expect(result.totalMeses).toBe(12);
    expect(result.totalPagar).toBeGreaterThan(0);
  });

  it("female gets different FAC values than male", () => {
    const male = calcularCalculoActuarial(baseInput);
    const female = calcularCalculoActuarial({
      ...baseInput,
      sexo: "F",
    });
    // Female FAC1 values are higher (longer life expectancy)
    expect(female.desglose.fac1).not.toBe(male.desglose.fac1);
  });
});

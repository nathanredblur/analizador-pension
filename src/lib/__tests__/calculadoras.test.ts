import { describe, expect, it } from "vitest";
import {
  calcularAhorroMensualNecesario,
  calcularCanastaFamiliar,
  calcularCrecimientoCapital,
  calcularSmmlvEquivalente,
  proyectarMesadaReal,
} from "@/lib/calculadoras";

describe("proyectar mesada real", () => {
  it("aplica inflación compuesta", () => {
    const mesada = 2_000_000;
    const result = proyectarMesadaReal(mesada, 10, 0.05);
    const expected = mesada * (1 + 0.05) ** 10;
    expect(result).toBeCloseTo(expected);
  });

  it("inflación cero no cambia mesada", () => {
    expect(proyectarMesadaReal(2_000_000, 10, 0)).toBeCloseTo(2_000_000);
  });

  it("cero años no cambia mesada", () => {
    expect(proyectarMesadaReal(2_000_000, 0, 0.05)).toBeCloseTo(2_000_000);
  });
});

describe("ahorro mensual necesario", () => {
  it("cuota es positiva", () => {
    const cuota = calcularAhorroMensualNecesario(100_000_000, 0.1, 10);
    expect(cuota).toBeGreaterThan(0);
  });

  it("cuota es menor que capital objetivo", () => {
    const cuota = calcularAhorroMensualNecesario(100_000_000, 0.1, 10);
    expect(cuota).toBeLessThan(100_000_000);
  });

  it("mayor tasa → menor cuota", () => {
    const cuotaBaja = calcularAhorroMensualNecesario(100_000_000, 0.05, 10);
    const cuotaAlta = calcularAhorroMensualNecesario(100_000_000, 0.15, 10);
    expect(cuotaAlta).toBeLessThan(cuotaBaja);
  });
});

describe("crecimiento capital", () => {
  it("longitud correcta", () => {
    const result = calcularCrecimientoCapital(500_000, 0.1, 5);
    expect(result).toHaveLength(6);
  });

  it("empieza en cero", () => {
    const result = calcularCrecimientoCapital(500_000, 0.1, 5);
    expect(result[0]).toBeCloseTo(0);
  });

  it("crece cada año", () => {
    const result = calcularCrecimientoCapital(500_000, 0.1, 5);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]!);
    }
  });

  it("supera aportaciones por interés compuesto", () => {
    const cuota = 500_000;
    const anios = 5;
    const result = calcularCrecimientoCapital(cuota, 0.1, anios);
    const aportaciones = cuota * 12 * anios;
    expect(result[result.length - 1]).toBeGreaterThan(aportaciones);
  });
});

describe("canasta familiar", () => {
  it("estrato 2 tiene todas las claves", () => {
    const canasta = calcularCanastaFamiliar(2);
    expect(canasta).toHaveProperty("arriendo");
    expect(canasta).toHaveProperty("mercado");
    expect(canasta).toHaveProperty("servicios");
    expect(canasta).toHaveProperty("transporte");
    expect(canasta).toHaveProperty("salud");
    expect(canasta).toHaveProperty("total");
    expect(canasta.total).toBeGreaterThan(0);
  });

  it("total es suma de componentes", () => {
    const c = calcularCanastaFamiliar(2);
    const suma =
      c.arriendo + c.mercado + c.servicios + c.transporte + c.salud;
    expect(c.total).toBeCloseTo(suma);
  });

  it("estrato 4 más caro que estrato 2", () => {
    const c2 = calcularCanastaFamiliar(2);
    const c4 = calcularCanastaFamiliar(4);
    expect(c4.total).toBeGreaterThan(c2.total);
  });
});

describe("SMMLV equivalente", () => {
  it("dos salarios", () => {
    const result = calcularSmmlvEquivalente(1_423_500 * 2, 2025);
    expect(result).toBeCloseTo(2.0, 1);
  });

  it("un salario", () => {
    const result = calcularSmmlvEquivalente(1_423_500, 2025);
    expect(result).toBeCloseTo(1.0, 1);
  });

  it("año desconocido usa fallback", () => {
    const result = calcularSmmlvEquivalente(1_423_500, 2050);
    expect(result).toBeGreaterThan(0);
  });
});

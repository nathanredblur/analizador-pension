import { describe, expect, it } from "vitest";
import {
  DESCUENTO_SEMANAS_POR_HIJO,
  EDAD_PENSION_HOMBRE,
  EDAD_PENSION_MUJER,
  MAX_HIJOS_DESCUENTO,
  SEMANAS_REQUERIDAS_HOMBRE,
  SEMANAS_REQUERIDAS_MUJER_POR_ANIO,
  SMMLV_HISTORICO,
  TASA_COTIZACION,
  TASA_REEMPLAZO_MAX,
  TASA_REEMPLAZO_MIN,
  TRANSICION_2381_SEMANAS_HOMBRE,
  TRANSICION_2381_SEMANAS_MUJER,
} from "@/lib/constants";

describe("constants", () => {
  it("semanas hombre", () => {
    expect(SEMANAS_REQUERIDAS_HOMBRE).toBe(1300);
  });

  it("edades pensión", () => {
    expect(EDAD_PENSION_HOMBRE).toBe(62);
    expect(EDAD_PENSION_MUJER).toBe(57);
  });

  it("semanas mujer gradual", () => {
    expect(SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2025]).toBe(1300);
    expect(SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2026]).toBe(1250);
    expect(SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2036]).toBe(750);
    expect(SEMANAS_REQUERIDAS_MUJER_POR_ANIO[2027]).toBe(1200);
  });

  it("descuento hijos", () => {
    expect(DESCUENTO_SEMANAS_POR_HIJO).toBe(50);
    expect(MAX_HIJOS_DESCUENTO).toBe(3);
  });

  it("tasas", () => {
    expect(TASA_COTIZACION).toBe(0.16);
    expect(TASA_REEMPLAZO_MIN).toBe(0.65);
    expect(TASA_REEMPLAZO_MAX).toBe(0.80);
  });

  it("transición 2381", () => {
    expect(TRANSICION_2381_SEMANAS_MUJER).toBe(750);
    expect(TRANSICION_2381_SEMANAS_HOMBRE).toBe(900);
  });

  it("SMMLV histórico completo", () => {
    expect(SMMLV_HISTORICO[2000]).toBeDefined();
    expect(SMMLV_HISTORICO[2025]).toBe(1_423_500);
    for (let year = 2000; year <= 2025; year++) {
      expect(SMMLV_HISTORICO[year]).toBeDefined();
    }
  });
});

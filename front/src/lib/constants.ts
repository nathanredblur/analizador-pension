// ─── LEY 797 DE 2003 (Hombres y régimen general) ──────────────────────────────
export const SEMANAS_REQUERIDAS_HOMBRE = 1300;
export const EDAD_PENSION_HOMBRE = 62;

// ─── LEY 2381 DE 2024 — REFORMA PENSIONAL (Mujeres) ──────────────────────────
export const EDAD_PENSION_MUJER = 57;
export const SEMANAS_REQUERIDAS_MUJER_POR_ANIO: Record<number, number> = {
  2025: 1300,
  2026: 1250,
  2027: 1200,
  2028: 1150,
  2029: 1100,
  2030: 1050,
  2031: 1000,
  2032: 950,
  2033: 900,
  2034: 850,
  2035: 800,
  2036: 750,
};
export const DESCUENTO_SEMANAS_POR_HIJO = 50;
export const MAX_HIJOS_DESCUENTO = 3;

// ─── RÉGIMEN DE TRANSICIÓN — LEY 2381/2024 ─────────────────────────────────
export const TRANSICION_2381_FECHA_CORTE_SEMANAS = "2025-06-30";
export const TRANSICION_2381_SEMANAS_MUJER = 750;
export const TRANSICION_2381_SEMANAS_HOMBRE = 900;
export const TRASLADO_FECHA_LIMITE = "2026-07-16";
export const TRASLADO_MUJER_EDAD_MIN = 47;
export const TRASLADO_HOMBRE_EDAD_MIN = 52;

// ─── TASA DE REEMPLAZO (Ley 100/797) ──────────────────────────────────────────
export const TASA_REEMPLAZO_MIN = 0.65;
export const TASA_REEMPLAZO_MAX = 0.80;
export const SEMANAS_BASE_TASA = 1300;
export const INCREMENTO_SEMANAS_TASA = 50;
export const INCREMENTO_TASA_POR_BLOQUE = 0.015;

// ─── COTIZACIÓN OBLIGATORIA ────────────────────────────────────────────────────
export const TASA_COTIZACION = 0.16;

// ─── PROYECCIONES FINANCIERAS ─────────────────────────────────────────────────
export const INFLACION_DEFAULT = 0.05;
export const CDT_TASA_DEFAULT = 0.10;

// ─── SMMLV HISTÓRICO COLOMBIA (COP) ───────────────────────────────────────────
export const SMMLV_HISTORICO: Record<number, number> = {
  2000: 260_100,
  2001: 286_000,
  2002: 309_000,
  2003: 332_000,
  2004: 358_000,
  2005: 381_500,
  2006: 408_000,
  2007: 433_700,
  2008: 461_500,
  2009: 496_900,
  2010: 515_000,
  2011: 535_600,
  2012: 566_700,
  2013: 589_500,
  2014: 616_000,
  2015: 644_350,
  2016: 689_455,
  2017: 737_717,
  2018: 781_242,
  2019: 828_116,
  2020: 877_803,
  2021: 908_526,
  2022: 1_000_000,
  2023: 1_160_000,
  2024: 1_300_000,
  2025: 1_423_500,
  2026: 1_750_905,
};

// ─── CANASTA FAMILIAR DE REFERENCIA (COP, 2025) ───────────────────────────────
export const CANASTA_ARRIENDO_ESTRATO_2 = 700_000;
export const CANASTA_ARRIENDO_ESTRATO_3 = 1_200_000;
export const CANASTA_ARRIENDO_ESTRATO_4 = 2_000_000;
export const CANASTA_MERCADO_FAMILIAR = 900_000;
export const CANASTA_SERVICIOS_PUBLICOS = 200_000;
export const CANASTA_TRANSPORTE = 180_000;
export const CANASTA_SALUD_MEDICAMENTOS = 150_000;

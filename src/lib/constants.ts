// ─── LEY TYPE ────────────────────────────────────────────────────────────────
export type Ley = "ley100" | "ley2381";

// ─── LEY 100 DE 1993 (Base vigente) ─────────────────────────────────────────
export const LEY100_SEMANAS_REQUERIDAS = 1300;
export const LEY100_TASA_REEMPLAZO_MIN = 0.55;
export const LEY100_SEMANAS_BASE_TASA = 1000;

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

// ─── CÁLCULO ACTUARIAL — DECRETO 1296/2022 ──────────────────────────────────
export const COMISION_ADMINISTRACION = 0.005;
export const TASA_TECNICA_DECRETO = 0.03;

// Tabla 1: Salario Medio Nacional por edad (COP anualizados).
// Edades 12–71; para 71+ se usa el valor de 71.
// MAINTENANCE: update when decree tables are revised.
export const TABLA_SMN: Record<number, number> = {
  12: 4_500_000,
  13: 4_600_000,
  14: 4_700_000,
  15: 4_800_000,
  16: 5_000_000,
  17: 5_200_000,
  18: 5_500_000,
  19: 5_800_000,
  20: 6_200_000,
  21: 6_600_000,
  22: 7_000_000,
  23: 7_400_000,
  24: 7_800_000,
  25: 8_200_000,
  26: 8_600_000,
  27: 9_000_000,
  28: 9_400_000,
  29: 9_800_000,
  30: 10_200_000,
  31: 10_600_000,
  32: 11_000_000,
  33: 11_400_000,
  34: 11_800_000,
  35: 12_200_000,
  36: 12_500_000,
  37: 12_800_000,
  38: 13_100_000,
  39: 13_400_000,
  40: 13_700_000,
  41: 14_000_000,
  42: 14_200_000,
  43: 14_400_000,
  44: 14_600_000,
  45: 14_800_000,
  46: 15_000_000,
  47: 15_100_000,
  48: 15_200_000,
  49: 15_300_000,
  50: 15_400_000,
  51: 15_400_000,
  52: 15_400_000,
  53: 15_300_000,
  54: 15_200_000,
  55: 15_000_000,
  56: 14_800_000,
  57: 14_600_000,
  58: 14_300_000,
  59: 14_000_000,
  60: 13_700_000,
  61: 13_400_000,
  62: 13_000_000,
  63: 12_600_000,
  64: 12_200_000,
  65: 11_800_000,
  66: 11_400_000,
  67: 11_000_000,
  68: 10_600_000,
  69: 10_200_000,
  70: 9_800_000,
  71: 9_400_000,
};

// Tabla 2: Factores actuariales por sexo y edad (55–90).
// fac1 = factor de renta vitalicia, fac2 = factor de sobrevivencia.
export const TABLA_FAC: Record<
  "M" | "F",
  Record<number, { fac1: number; fac2: number }>
> = {
  M: {
    55: { fac1: 168.02, fac2: 16.80 },
    56: { fac1: 163.50, fac2: 16.35 },
    57: { fac1: 158.88, fac2: 15.89 },
    58: { fac1: 154.15, fac2: 15.42 },
    59: { fac1: 149.33, fac2: 14.93 },
    60: { fac1: 144.41, fac2: 14.44 },
    61: { fac1: 139.40, fac2: 13.94 },
    62: { fac1: 134.31, fac2: 13.43 },
    63: { fac1: 129.14, fac2: 12.91 },
    64: { fac1: 123.90, fac2: 12.39 },
    65: { fac1: 118.60, fac2: 11.86 },
    66: { fac1: 113.25, fac2: 11.33 },
    67: { fac1: 107.85, fac2: 10.79 },
    68: { fac1: 102.43, fac2: 10.24 },
    69: { fac1: 96.99, fac2: 9.70 },
    70: { fac1: 91.55, fac2: 9.16 },
    71: { fac1: 86.12, fac2: 8.61 },
    72: { fac1: 80.73, fac2: 8.07 },
    73: { fac1: 75.39, fac2: 7.54 },
    74: { fac1: 70.12, fac2: 7.01 },
    75: { fac1: 64.95, fac2: 6.50 },
    76: { fac1: 59.90, fac2: 5.99 },
    77: { fac1: 55.00, fac2: 5.50 },
    78: { fac1: 50.27, fac2: 5.03 },
    79: { fac1: 45.74, fac2: 4.57 },
    80: { fac1: 41.42, fac2: 4.14 },
    81: { fac1: 37.34, fac2: 3.73 },
    82: { fac1: 33.51, fac2: 3.35 },
    83: { fac1: 29.94, fac2: 2.99 },
    84: { fac1: 26.63, fac2: 2.66 },
    85: { fac1: 23.58, fac2: 2.36 },
    86: { fac1: 20.79, fac2: 2.08 },
    87: { fac1: 18.25, fac2: 1.83 },
    88: { fac1: 15.96, fac2: 1.60 },
    89: { fac1: 13.89, fac2: 1.39 },
    90: { fac1: 12.04, fac2: 1.20 },
  },
  F: {
    55: { fac1: 186.47, fac2: 18.65 },
    56: { fac1: 181.73, fac2: 18.17 },
    57: { fac1: 176.88, fac2: 17.69 },
    58: { fac1: 171.91, fac2: 17.19 },
    59: { fac1: 166.82, fac2: 16.68 },
    60: { fac1: 161.62, fac2: 16.16 },
    61: { fac1: 156.30, fac2: 15.63 },
    62: { fac1: 150.87, fac2: 15.09 },
    63: { fac1: 145.33, fac2: 14.53 },
    64: { fac1: 139.69, fac2: 13.97 },
    65: { fac1: 133.96, fac2: 13.40 },
    66: { fac1: 128.14, fac2: 12.81 },
    67: { fac1: 122.24, fac2: 12.22 },
    68: { fac1: 116.28, fac2: 11.63 },
    69: { fac1: 110.27, fac2: 11.03 },
    70: { fac1: 104.22, fac2: 10.42 },
    71: { fac1: 98.16, fac2: 9.82 },
    72: { fac1: 92.11, fac2: 9.21 },
    73: { fac1: 86.08, fac2: 8.61 },
    74: { fac1: 80.11, fac2: 8.01 },
    75: { fac1: 74.22, fac2: 7.42 },
    76: { fac1: 68.44, fac2: 6.84 },
    77: { fac1: 62.80, fac2: 6.28 },
    78: { fac1: 57.33, fac2: 5.73 },
    79: { fac1: 52.06, fac2: 5.21 },
    80: { fac1: 47.01, fac2: 4.70 },
    81: { fac1: 42.21, fac2: 4.22 },
    82: { fac1: 37.68, fac2: 3.77 },
    83: { fac1: 33.44, fac2: 3.34 },
    84: { fac1: 29.49, fac2: 2.95 },
    85: { fac1: 25.84, fac2: 2.58 },
    86: { fac1: 22.50, fac2: 2.25 },
    87: { fac1: 19.46, fac2: 1.95 },
    88: { fac1: 16.72, fac2: 1.67 },
    89: { fac1: 14.27, fac2: 1.43 },
    90: { fac1: 12.10, fac2: 1.21 },
  },
};

// Semanas mínimas para pensión por año (Decreto 1296/2022).
// Different from SEMANAS_REQUERIDAS_MUJER_POR_ANIO (which is Ley 2381).
export const SEMANAS_MIN_DECRETO: Record<number, number> = {
  2004: 1000,
  2005: 1050,
  2006: 1075,
  2007: 1100,
  2008: 1125,
  2009: 1150,
  2010: 1175,
  2011: 1200,
  2012: 1225,
  2013: 1250,
  2014: 1275,
  2015: 1300,
};

// IPC variación anual (%). MAINTENANCE: update annually.
export const IPC_HISTORICO: Record<number, number> = {
  2000: 0.0875,
  2001: 0.0765,
  2002: 0.0699,
  2003: 0.0649,
  2004: 0.0548,
  2005: 0.0477,
  2006: 0.0449,
  2007: 0.0569,
  2008: 0.0767,
  2009: 0.0200,
  2010: 0.0317,
  2011: 0.0373,
  2012: 0.0244,
  2013: 0.0194,
  2014: 0.0366,
  2015: 0.0677,
  2016: 0.0575,
  2017: 0.0418,
  2018: 0.0318,
  2019: 0.0380,
  2020: 0.0161,
  2021: 0.0561,
  2022: 0.1312,
  2023: 0.0928,
  2024: 0.0520,
  2025: 0.0500,
};

// ─── SMMLV HISTÓRICO COLOMBIA (COP) ───────────────────────────────────────────
// MAINTENANCE: Update annually when new minimum wage is announced (typically December).
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

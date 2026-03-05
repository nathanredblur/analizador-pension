# ─── LEY 797 DE 2003 (Hombres y régimen general) ──────────────────────────────
SEMANAS_REQUERIDAS_HOMBRE = 1300
EDAD_PENSION_HOMBRE = 62

# ─── LEY 2381 DE 2024 — REFORMA PENSIONAL (Mujeres) ──────────────────────────
# Reducción gradual de semanas requeridas para mujeres (desde 2026)
# Comunicado oficial Colpensiones, 26 dic 2025
EDAD_PENSION_MUJER = 57
SEMANAS_REQUERIDAS_MUJER_POR_ANIO: dict[int, int] = {
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
    2036: 750,  # mínimo final desde 2036
}
# Reducción adicional por hijos (hasta 3 hijos, 50 sem c/u)
DESCUENTO_SEMANAS_POR_HIJO = 50
MAX_HIJOS_DESCUENTO = 3

# ─── RÉGIMEN DE TRANSICIÓN — LEY 2381/2024 (VIGENTE) ─────────────────────────
# Fuente: colpensiones.gov.co/sistemadeproteccion/Regtransicion.html
# Requisito: cumplir umbral de semanas AL 30 DE JUNIO DE 2025
TRANSICION_2381_FECHA_CORTE_SEMANAS = "2025-06-30"
TRANSICION_2381_SEMANAS_MUJER = 750
TRANSICION_2381_SEMANAS_HOMBRE = 900
# Oportunidad de traslado de régimen (Art. 76 Ley 2381/2024)
TRASLADO_FECHA_LIMITE = "2026-07-16"
TRASLADO_MUJER_EDAD_MIN = 47
TRASLADO_HOMBRE_EDAD_MIN = 52

# ─── RÉGIMEN DE TRANSICIÓN HISTÓRICO (Ley 100/1993) ──────────────────────────
# Solo informativo — venció el 31 de diciembre de 2014
TRANSICION_HISTORICO_FECHA_VIGENCIA = "1994-04-01"
TRANSICION_HISTORICO_FECHA_CORTE = "2014-12-31"
TRANSICION_HISTORICO_SEMANAS_EXTENSION = 750  # con 750+ sem a jul-2005
TRANSICION_HISTORICO_TASA_MAX = 0.90  # hasta 90% bajo Decreto 758/1990
TRANSICION_HISTORICO_MUJER_EDAD_MIN = 35
TRANSICION_HISTORICO_HOMBRE_EDAD_MIN = 40
TRANSICION_HISTORICO_ANIOS_COTIZADOS_MIN = 15

# ─── TASA DE REEMPLAZO (Ley 100/797) ──────────────────────────────────────────
TASA_REEMPLAZO_MIN = 0.65  # 65% con 1.300 semanas exactas
TASA_REEMPLAZO_MAX = 0.80  # 80% con semanas adicionales
SEMANAS_BASE_TASA = 1300
INCREMENTO_SEMANAS_TASA = 50
INCREMENTO_TASA_POR_BLOQUE = 0.015

# ─── COTIZACIÓN OBLIGATORIA ────────────────────────────────────────────────────
TASA_COTIZACION = 0.16  # 16% del salario base (empleado + empleador)

# ─── PROYECCIONES FINANCIERAS ─────────────────────────────────────────────────
INFLACION_DEFAULT = 0.05  # 5% anual (slider default)
CDT_TASA_DEFAULT = 0.10  # 10% EA

# ─── SMMLV HISTÓRICO COLOMBIA (COP) ───────────────────────────────────────────
SMMLV_HISTORICO: dict[int, int] = {
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
    2026: 1_750_905,  # estimado
}

# ─── CANASTA FAMILIAR DE REFERENCIA (COP, 2025) ───────────────────────────────
CANASTA_ARRIENDO_ESTRATO_2 = 700_000
CANASTA_ARRIENDO_ESTRATO_3 = 1_200_000
CANASTA_ARRIENDO_ESTRATO_4 = 2_000_000
CANASTA_MERCADO_FAMILIAR = 900_000
CANASTA_SERVICIOS_PUBLICOS = 200_000
CANASTA_TRANSPORTE = 180_000
CANASTA_SALUD_MEDICAMENTOS = 150_000

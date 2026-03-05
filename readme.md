# 🏦 Analizador de Pensión Colombiana — Especificación del Proyecto

> Aplicación web para analizar el historial de aportes a pensión obligatoria
> (RPM / Colpensiones) y proyectar el futuro pensional del usuario.

---

## 📋 Descripción General

Aplicación web **sin persistencia** construida con Python + UV + Plotly Dash.
El usuario sube su PDF de historial de aportes directamente en el navegador,
ingresa sus datos personales, y obtiene un dashboard interactivo completo.

**Todos los datos se procesan en memoria y se destruyen al cerrar el navegador.**
Ningún archivo se guarda en disco ni en servidor.

---

## ⚙️ Stack Tecnológico

| Componente            | Tecnología                     |
| --------------------- | ------------------------------ |
| Gestor de proyecto    | UV (pyproject.toml)            |
| Framework web         | Plotly Dash                    |
| Extracción PDF        | pdfplumber + pikepdf           |
| Manipulación de datos | pandas                         |
| Gráficas              | Plotly Express / Graph Objects |
| Estilos               | Dash Bootstrap Components      |

---

## 🏗️ Estructura del Proyecto

```
pension-analyzer/
├── pyproject.toml
├── uv.lock
├── README.md
└── src/
    ├── app.py               # Entry point Dash, layout principal
    ├── constants.py         # Todas las constantes de normativa y canasta
    ├── extractor.py         # PDF → DataFrame en memoria
    ├── normativa.py         # Lógica Ley 100, 797, 2381, cálculo mesada/IBL
    ├── calculadoras.py      # Proyecciones, CDT, inflación, canasta
    └── components/
        ├── formulario.py    # Fase A: upload + datos usuario
        ├── resumen.py       # Sección 1: KPI Cards
        ├── timeline.py      # Sección 2: Timeline de aportes
        ├── salarios.py      # Sección 3: Análisis salarial
        ├── proyeccion.py    # Sección 4: Proyección pensional
        ├── ahorro.py        # Sección 5: Calculadora CDT
        ├── simulador.py     # Sección 6: Simulador ¿Y si...?
        └── transicion.py   # Sección 7: Régimen de Transición Ley 2381
```

---

## 📁 constants.py — Normativa Colombiana Vigente

Centraliza **todas** las constantes. Son visibles en la UI para que el usuario
entienda la base de los cálculos.

```python
# ─── LEY 797 DE 2003 (Hombres y régimen general) ──────────────────────────
SEMANAS_REQUERIDAS_HOMBRE = 1300
EDAD_PENSION_HOMBRE = 62

# ─── LEY 2381 DE 2024 — REFORMA PENSIONAL (Mujeres) ──────────────────────
# Reducción gradual de semanas requeridas para mujeres (desde 2026)
# Comunicado oficial Colpensiones, 26 dic 2025
EDAD_PENSION_MUJER = 57
SEMANAS_REQUERIDAS_MUJER_POR_ANIO = {
    2025: 1300,
    2026: 1250,
    2027: 1200,
    2028: 1150,
    2029: 1100,
    2030: 1050,
    2031: 1000,
    2032:  950,
    2033:  900,
    2034:  850,
    2035:  800,
    2036:  750,  # mínimo final desde 2036
}
# Reducción adicional por hijos (hasta 3 hijos, 50 sem c/u)
DESCUENTO_SEMANAS_POR_HIJO = 50
MAX_HIJOS_DESCUENTO = 3

# ─── RÉGIMEN DE TRANSICIÓN — LEY 2381/2024 (VIGENTE) ─────────────────────
# Fuente: colpensiones.gov.co/sistemadeproteccion/Regtransicion.html
# Requisito: cumplir umbral de semanas AL 30 DE JUNIO DE 2025
TRANSICION_2381_FECHA_CORTE_SEMANAS = "2025-06-30"
TRANSICION_2381_SEMANAS_MUJER = 750
TRANSICION_2381_SEMANAS_HOMBRE = 900
# Oportunidad de traslado de régimen (Art. 76 Ley 2381/2024)
TRASLADO_FECHA_LIMITE = "2026-07-16"
TRASLADO_MUJER_EDAD_MIN = 47
TRASLADO_HOMBRE_EDAD_MIN = 52

# ─── RÉGIMEN DE TRANSICIÓN HISTÓRICO (Ley 100/1993) ──────────────────────
# Solo informativo — venció el 31 de diciembre de 2014
TRANSICION_HISTORICO_FECHA_VIGENCIA = "1994-04-01"
TRANSICION_HISTORICO_FECHA_CORTE = "2014-12-31"
TRANSICION_HISTORICO_SEMANAS_EXTENSION = 750  # con 750+ sem a jul-2005
TRANSICION_HISTORICO_TASA_MAX = 0.90          # hasta 90% bajo Decreto 758/1990
TRANSICION_HISTORICO_MUJER_EDAD_MIN = 35
TRANSICION_HISTORICO_HOMBRE_EDAD_MIN = 40
TRANSICION_HISTORICO_ANIOS_COTIZADOS_MIN = 15

# ─── TASA DE REEMPLAZO (Ley 100/797) ──────────────────────────────────────
TASA_REEMPLAZO_MIN = 0.65    # 65% con 1.300 semanas exactas
TASA_REEMPLAZO_MAX = 0.80    # 80% con semanas adicionales

# ─── COTIZACIÓN OBLIGATORIA ────────────────────────────────────────────────
TASA_COTIZACION = 0.16       # 16% del salario base (empleado + empleador)

# ─── PROYECCIONES FINANCIERAS ─────────────────────────────────────────────
INFLACION_DEFAULT = 0.05     # 5% anual (slider default)
CDT_TASA_DEFAULT = 0.10      # 10% EA

# ─── SMMLV HISTÓRICO COLOMBIA (COP) ───────────────────────────────────────
SMMLV_HISTORICO = {
    2000: 260_100,  2001: 286_000,  2002: 309_000,  2003: 332_000,
    2004: 358_000,  2005: 381_500,  2006: 408_000,  2007: 433_700,
    2008: 461_500,  2009: 496_900,  2010: 515_000,  2011: 535_600,
    2012: 566_700,  2013: 589_500,  2014: 616_000,  2015: 644_350,
    2016: 689_455,  2017: 737_717,  2018: 781_242,  2019: 828_116,
    2020: 877_803,  2021: 908_526,  2022: 1_000_000, 2023: 1_160_000,
    2024: 1_300_000, 2025: 1_423_500, 2026: 1_750_905,  # estimado
}

# ─── CANASTA FAMILIAR DE REFERENCIA (COP, 2025) ───────────────────────────
CANASTA_ARRIENDO_ESTRATO_2 = 700_000
CANASTA_ARRIENDO_ESTRATO_3 = 1_200_000
CANASTA_ARRIENDO_ESTRATO_4 = 2_000_000
CANASTA_MERCADO_FAMILIAR   = 900_000
CANASTA_SERVICIOS_PUBLICOS = 200_000
CANASTA_TRANSPORTE         = 180_000
CANASTA_SALUD_MEDICAMENTOS = 150_000
```

---

## 🖥️ FASE A — Formulario Inicial

Pantalla de bienvenida antes del dashboard.

**Campos:**

- 📄 Upload del PDF (drag & drop o clic)
- 🔒 Contraseña del PDF (input tipo `password`)
- 👤 Nombre completo
- 📅 Fecha de nacimiento
- ⚧ Sexo (M / F)
- 👶 Número de hijos _(solo mujeres — para calcular descuento de semanas)_
- ▶️ Botón **"Analizar mi pensión"**

**Comportamiento:**

- Procesa todo en memoria al hacer clic
- Si el PDF falla: error claro con instrucciones
- Al éxito: oculta el formulario y renderiza el dashboard sin recargar

---

## 📊 FASE B — Dashboard Interactivo (7 Secciones)

### 📌 Panel Lateral Fijo — "¿Cómo se calcula?"

Visible en todo momento. Muestra las constantes clave con su fuente legal:

| Parámetro                        | Valor                                         | Fuente                |
| -------------------------------- | --------------------------------------------- | --------------------- |
| Semanas requeridas (hombre)      | 1.300                                         | Ley 797/2003          |
| Semanas requeridas (mujer 2026)  | 1.250                                         | Ley 2381/2024         |
| Semanas requeridas (mujer 2036+) | 750                                           | Ley 2381/2024         |
| Descuento por hijo (mujer)       | 50 sem (máx 3)                                | Ley 2381/2024         |
| Edad pensión hombre              | 62 años                                       | Ley 797/2003          |
| Edad pensión mujer               | 57 años                                       | Ley 797/2003          |
| Tasa de reemplazo                | 65%–80% IBL                                   | Ley 100/797           |
| Tasa de cotización               | 16% del salario                               | Ley 100/797           |
| Reg. transición (Ley 2381)       | 750 sem mujer / 900 sem hombre al 30/jun/2025 | Ley 2381/2024         |
| Traslado de régimen              | Hasta 16/jul/2026                             | Art. 76 Ley 2381/2024 |
| Reg. transición histórico        | Venció dic 2014                               | Informativo           |

---

### SECCIÓN 1 — Resumen del Perfil 📋

**KPI Cards:**

- Semanas cotizadas totales
- Semanas faltantes para pensión _(calculado según año actual y sexo)_
- Barra de progreso visual hacia la meta
- Edad actual y edad de pensión
- Fecha estimada de pensión _(asumiendo cotización continua)_
- Años y meses restantes para pensionarse
- Mesada estimada (rango mín–máx en COP)

**Alertas automáticas:**

- 🟢 **Régimen de Transición Ley 2381 activo**: si el usuario tenía el
  umbral de semanas al 30/jun/2025, mostrar badge verde con beneficios
- 🟡 **Oportunidad de traslado de régimen**: si cumple requisitos del
  Art. 76 y la fecha es anterior al 16/jul/2026, mostrar aviso con
  días restantes y botón informativo a la Doble Asesoría
- 🟠 **Descuento por hijos** _(mujeres)_: semanas descontadas y nueva
  meta ajustada
- 🔵 **Régimen de transición histórico** _(solo si aplica)_: badge
  informativo si al 01/abr/1994 tenía ≥15 años cotizados, mujer ≥35
  años, u hombre ≥40 años

---

### SECCIÓN 2 — Timeline de Aportes 📅

**Gráfica 1 — Gantt horizontal por empleador**

- Bloques coloreados por empresa con tooltip: nombre, período, semanas
- Gaps resaltados en rojo con duración exacta (semanas y meses)
- Zoom interactivo por rango de fechas

**Gráfica 2 — Mapa de calor mensual**

- Estilo "GitHub contributions"
- Eje Y: años | Eje X: meses (Ene–Dic)
- 🟢 Verde: cotizó | 🔴 Rojo: no cotizó
- Tooltip con empleador y semanas del mes

**Gráfica 3 — Acumulado de semanas**

- Área chart: semanas acumuladas en el tiempo
- Línea horizontal: meta de semanas _(dinámica según sexo, año e hijos)_
- Proyección futura con línea punteada hasta alcanzar la meta

---

### SECCIÓN 3 — Análisis Salarial 💰

**Gráfica 1 — Evolución salarial**

- Línea temporal del último salario reportado
- Coloreada por empleador
- Tooltip con empresa, período y salario exacto

**Gráfica 2 — Salario vs SMMLV histórico**

- Barras duales: salario del usuario vs SMMLV del año
- Eje secundario: número de SMMLV que representaba su salario
- Resalta períodos por debajo de 1 SMMLV

**Indicador — IBL estimado**

- Ingreso Base de Liquidación = promedio ponderado últimos 10 años
- Card con valor en COP y en SMMLV actuales

**Slider interactivo — Impacto del IBL**

- "Si mi IBL fuera $X, mi mesada estimada sería..."
- Actualiza en tiempo real la mesada proyectada

---

### SECCIÓN 4 — Proyección Pensional 📈

**Card — Mesada estimada hoy**

- Rango: 65%–80% del IBL en pesos de hoy
- Valor en SMMLV actuales

**Gráfica — Valor real de la mesada al jubilarse**

- Proyección ajustada por inflación al año de jubilación
- 🎛️ Slider de inflación: 2%–15%, default 5%
- Muestra valor nominal y valor en poder adquisitivo de hoy

**Panel — ¿Qué puedo comprar con esa pensión?**
Barras apiladas interactivas con la composición de la mesada:

| Gasto                      | Referencia                    |
| -------------------------- | ----------------------------- |
| 🏠 Arriendo                | 3 opciones: estrato 2 / 3 / 4 |
| 🛒 Mercado familiar        | $900.000 ref.                 |
| 💡 Servicios públicos      | $200.000 ref.                 |
| 🚌 Transporte              | $180.000 ref.                 |
| 💊 Salud / medicamentos    | $150.000 ref.                 |
| ✅ / ❌ Sobrante o déficit | Coloreado verde/rojo          |

- Toggle para seleccionar el estrato de referencia
- Porcentaje de la canasta cubierto por la mesada

---

### SECCIÓN 5 — Calculadora de Ahorro Complementario (CDT) 🏦

_"¿Cuánto debo ahorrar hoy para tener un ingreso adicional al jubilarme?"_

**Inputs (actualizan en tiempo real):**

- 💵 Ingreso mensual adicional deseado al jubilarse (COP)
- 🎛️ Tasa CDT anual: 5%–20% EA, default 10%
- 🎛️ Inflación: slider compartido con Sección 4

**Outputs calculados:**

- Cuota mensual a ahorrar hoy
- Capital total necesario al jubilarse
- Capital total acumulado con los aportes proyectados

**Gráfica — Crecimiento del capital**

- Área chart: capital acumulado año a año
- Línea de meta: capital necesario
- Punto de cruce resaltado

---

### SECCIÓN 6 — Simulador "¿Y si...?" 🔮

**Controles:**

- 🎛️ Slider: semanas adicionales por año que planea cotizar (0–52)
- 🔘 Toggle: "¿Empezar a cotizar desde hoy?" (si hay gap activo)
- 🔢 Input: número de hijos adicionales _(mujeres)_

**Outputs actualizados en tiempo real:**

- Nueva fecha estimada de pensión
- Semanas ganadas con el escenario
- Nueva mesada estimada
- Comparativa: escenario actual vs escenario simulado (tabla lado a lado)

**Alerta destacada — Gap más largo:**

- Período sin cotizar más extenso detectado
- Duración en semanas, meses y años
- Fechas de inicio y fin del gap
- Impacto en semanas totales

---

### SECCIÓN 7 — Régimen de Transición (Ley 2381/2024) 🔄

> Esta sección determina si el usuario califica o puede calificar al
> Régimen de Transición de la nueva reforma pensional, y qué necesitaría
> hacer para lograrlo.

#### ¿Qué es el Régimen de Transición (Ley 2381/2024)?

Es la figura que garantiza la aplicación de las reglas de la Ley 100 de
1993 a los afiliados cercanos a cumplir requisitos de pensión. Para
acceder se debían tener, **al 30 de junio de 2025**:

- 👩 **Mujeres**: ≥ 750 semanas cotizadas
- 👨 **Hombres**: ≥ 900 semanas cotizadas

Si el usuario tenía inconsistencias en su historia laboral (semanas no
pagadas, períodos no reportados), puede corregirlas y completar el umbral.

---

#### Diagnóstico Automático

La app calcula y muestra:

| Verificación                           | Resultado              |
| -------------------------------------- | ---------------------- |
| Semanas al 30/jun/2025                 | X semanas              |
| Umbral requerido (sexo)                | 750 / 900 semanas      |
| ¿Cumple el umbral?                     | ✅ Sí / ❌ No          |
| Semanas faltantes para el umbral       | N semanas              |
| Semanas en columna **Lic** (licencias) | N semanas detectadas   |
| Semanas en columna **Sim** (simuladas) | N semanas detectadas   |
| Gaps regularizables detectados         | N períodos             |
| ¿Cumple edad para Doble Asesoría?      | Mujer ≥47 / Hombre ≥52 |
| ¿Está dentro del plazo de traslado?    | Antes del 16/jul/2026  |

---

#### Calculadora de Semanas a Regularizar

Si el usuario **no cumplía** el umbral al 30/jun/2025 pero está cerca,
la app calcula cuánto costaría ponerse al día:

**Fórmula del costo por semana:**

```
Costo por semana = salario_base × 16% ÷ 4.33
```

_(16% tasa de cotización, dividido entre semanas promedio del mes)_

**Outputs:**

- Semanas faltantes para el umbral
- Costo estimado total en COP para pagar esas semanas
- Costo mensual equivalente si se pagan en cuotas
- Lista de gaps identificados en el historial que podrían regularizarse,
  ordenados por prioridad (más recientes primero)

**Gráfica — Gaps regularizables:**

- Timeline de los períodos sin cotizar
- Resaltados según si son regularizables o no
- Tooltip con costo estimado de regularizar cada período

---

#### Oportunidad de Traslado de Régimen (Art. 76 Ley 2381/2024)

Si el usuario califica al Régimen de Transición, puede además evaluar
trasladarse de un fondo privado a Colpensiones (o viceversa):

**Requisitos del traslado:**

- 👩 Mujer: ≥ 47 años + ≥ 750 semanas
- 👨 Hombre: ≥ 52 años + ≥ 900 semanas
- Realizar la **Doble Asesoría** obligatoria

**Alerta de urgencia:**

- 🔴 Si está dentro del plazo → contador regresivo de días hasta
  el **16 de julio de 2026**
- ⚫ Si ya pasó el plazo → mostrar como histórico informativo

**Card informativo:**

- Beneficios de trasladarse a Colpensiones
- Link a la Doble Asesoría: `colpensiones.gov.co/dobleasesoria`
- Nota: _"En 2025 se realizaron 150.000 traslados de fondos privados
  a Colpensiones. Más de 17 millones de afiliados a fondos privados
  podrían acceder a este beneficio."_

---

## 🔄 Flujo de la Aplicación

```
Usuario abre http://localhost:8050
         │
         ▼
  [FASE A] Formulario
  ├── Sube PDF
  ├── Ingresa contraseña
  ├── Ingresa datos personales (nombre, fecha nac., sexo, hijos)
  └── Clic "Analizar mi pensión"
         │
         ▼
  extractor.py   → DataFrame en memoria
  normativa.py   → Cálculos pensionales, IBL, mesada
  calculadoras.py → Proyecciones, CDT, inflación, canasta
         │
         ▼
  [FASE B] Dashboard renderizado
  ├── Panel lateral: constantes visibles
  ├── Sección 1: Resumen + alertas automáticas
  ├── Sección 2: Timeline + mapa de calor
  ├── Sección 3: Análisis salarial
  ├── Sección 4: Proyección + canasta
  ├── Sección 5: Calculadora CDT
  ├── Sección 6: Simulador ¿Y si...?
  └── Sección 7: Régimen de Transición Ley 2381
         │
         ▼
  Al cerrar sesión → datos destruidos en memoria
```

---

## 📦 Dependencias (pyproject.toml)

```toml
[project]
name = "pension-analyzer"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "dash>=2.18",
    "dash-bootstrap-components>=1.6",
    "plotly>=5.22",
    "pandas>=2.2",
    "pdfplumber>=0.11",
    "pikepdf>=9.0",
    "rich>=13.0",
]
```

---

## 🚀 Instalación y Uso

```bash
# Instalar UV si no lo tienes
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clonar e instalar dependencias
git clone <repo>
cd pension-analyzer
uv sync

# Ejecutar
uv run src/app.py

# Abrir en el navegador
http://localhost:8050
```

---

## 🔐 Privacidad

> ⚠️ **Esta aplicación no guarda ningún dato.**
> El PDF, la contraseña y todos los datos procesados existen únicamente
> en memoria durante la sesión activa. Al cerrar el navegador o refrescar
> la página, toda la información se destruye automáticamente.
> Ningún archivo se escribe en disco ni se envía a ningún servidor externo.

---

## 📚 Marco Legal de Referencia

| Norma                               | Descripción                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Ley 100 de 1993                     | Sistema General de Pensiones                                                |
| Decreto 758 de 1990                 | Base régimen de transición histórico (hasta 90% mesada)                     |
| Ley 797 de 2003                     | Reforma pensional — semanas y edades vigentes                               |
| Acto Legislativo 01 de 2005         | Cierre régimen de transición histórico                                      |
| Ley 2381 de 2024                    | Reforma Pensional — reducción semanas mujeres + nuevo régimen de transición |
| Art. 76 Ley 2381/2024               | Oportunidad de traslado (hasta 16/jul/2026)                                 |
| Ley 2452 de 2025                    | Nuevo Código Procesal del Trabajo (vigente desde 2/abr/2026)                |
| Comunicado Colpensiones 26/dic/2025 | Gradualidad semanas mujeres 2026–2036                                       |

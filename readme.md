# Analizador de Pension Colombiana

Aplicacion web que analiza tu historial de cotizaciones de Colpensiones y te muestra un diagnostico completo de tu situacion pensional, con proyecciones y recomendaciones basadas en la normativa colombiana vigente.

**Todo se procesa en tu navegador — ningun dato personal sale de tu computador.**

## Que hace

Sube el PDF de semanas cotizadas que descargas desde [Mi Colpensiones](https://www.colpensiones.gov.co/) y la aplicacion te entrega:

- **Diagnostico con semaforo** (verde/amarillo/rojo) que resume tu estado pensional de un vistazo
- **Situacion actual** con el detalle de tus semanas cotizadas, brechas laborales y salario promedio
- **Proyeccion a futuro** con la fecha estimada de pension, semanas faltantes y cuanto recibiras mensualmente
- **Comparacion RPM vs RAIS** para que decidas si te conviene trasladarte de regimen antes de la fecha limite (julio 2026)

## Normativa aplicada

Los calculos se basan en la legislacion pensional colombiana:

- **Ley 100 de 1993** y **Ley 797 de 2003** — requisitos generales de semanas y edad de pension
- **Ley 2381 de 2024** — escala gradual reducida de semanas para mujeres (de 1,300 en 2025 a 750 en 2036) y descuento de 50 semanas por hijo (maximo 3)
- **Decreto 1296 de 2022** — calculo actuarial para el regimen RAIS (ahorro individual)

### Reglas principales

| Concepto | Hombres | Mujeres |
|----------|---------|---------|
| Edad de pension | 62 anos | 57 anos |
| Semanas requeridas (RPM) | 1,300 | 1,300 a 750 (escala gradual Ley 2381) |
| Tasa de reemplazo | 65% a 80% del IBL | 65% a 80% del IBL |

- El **IBL** (Ingreso Base de Liquidacion) se calcula como el promedio ponderado de los ultimos 10 anos de salarios
- Las mujeres con hijos obtienen un descuento de hasta 150 semanas (50 por hijo, maximo 3)
- El traslado entre regimenes esta disponible hasta julio 2026, con requisitos minimos de edad y semanas

## Stack

| Capa | Tecnologia |
|------|------------|
| UI | React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Graficas | Recharts |
| Extraccion PDF | pdf.js (100% en el navegador) |
| Build | Vite |
| Tests | Vitest |

No hay backend. La aplicacion es un sitio estatico que se puede servir desde cualquier CDN.

## Inicio rapido

Requisitos: Node 22+ con [pnpm](https://pnpm.io/)

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## Tests

```bash
pnpm test
```

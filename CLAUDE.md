# Cálculo de Costo - Chromascan — decisiones fijas

Estas son decisiones que el usuario (Gabriel) ya tomó. No volver a preguntarlas: aplicarlas directamente.

## Flujo de trabajo

- **Nunca hacer `git push` sin confirmación explícita del usuario.** Cada push dispara un redeploy automático en Render. Trabajar primero en el sandbox; recién pushear cuando el usuario lo pida con algo como "pushealo".
- Este sandbox **no tiene acceso a `onrender.com`** (bloqueado por política de red). No se puede verificar nada directamente en Render; el usuario manda screenshots y yo doy instrucciones exactas de click a click, o opero la herramienta yo mismo vía Playwright contra el sandbox cuando el usuario lo pide.
- Los servidores de desarrollo del sandbox (Postgres, backend, Vite) se caen seguido (reinicios del contenedor). Reiniciar en este orden: `service postgresql start` → verificar con `psql -d calculadora -c "SELECT 1;"` → `nohup npx tsx src/index.ts &` (desde `server/`) → `nohup npx vite --port 5173 &` (desde `client/`).

## Identidad visual

- Navy institucional: **`#003A70`** (elegido por el usuario sobre el `#005192` del manual de marca oficial — es una decisión consciente, no un error).
- Logos: AkzoNobel (blanco) en el Sidebar sobre fondo navy; International (color) en el Header sobre fondo blanco. Assets reales en `client/public/logos/`, nunca recrear los logos.
- Encabezados de sección usan la clase `.section-bar` (navy, bleed a los bordes de la card vía `-mx-5 -mt-5` o `-mx-6 -mt-6`), no `<h2>`/`<h3>` planos.
- Nombres de producto en sentence case (ej. `Interthane 3230SG`), nunca ALL CAPS, al fusionar/renombrar.

## Consolidación de productos (fusión por marca)

Regla general: **nunca fusionar automáticamente por similitud de nombre** — solo fusión manual confirmada por el usuario, porque variantes de nombre a veces son productos realmente distintos.

Reglas ya confirmadas, válidas para toda fusión futura de variantes equivalentes:

- **Interthane 3230**: HG (brillante) y SG (semimate) son productos distintos — **nunca fusionar entre sí**. Cada uno consolida solo sus propias variantes de escritura (ej. `INTERTHANE 3230SG` + `Interthane 3230 SG` → un solo `Interthane 3230SG`; `Interthane 3230SG Yellow` también entra ahí).
- **Interthane 990 HS** (High Solids) es un producto distinto de **Interthane 990** liso — **nunca fusionar entre sí**. Las variantes de escritura de HS entre sí sí se fusionan (`Interthane 990HS` + `Interthane 990 HS` → un solo `Interthane 990 HS`).
- **Interthane 990 Orange** y **Interthane 990 Yellow** son variantes de nombre del mismo producto, no productos distintos → fusionan directo dentro de **Interthane 990**.
- Typos de escritura simples (ej. "Inetrthane 990", "Integard 740", "Interfuf 262", "Interseal 670 HS" vs "670HS") siempre fusionan a la grafía correcta.
- Patrón general: cuando la única diferencia es ortografía/espaciado/mayúsculas, es el mismo producto. Cuando la diferencia nombra una propiedad técnica real del producto (HS = high solids, HG/SG = brillo/acabado), son productos distintos.

## Pendiente sin resolver

- La pregunta sobre "los que tienen guion, deberían ir sin guion" quedó sin responder (el usuario descartó la pregunta de aclaración). No asumir ninguna interpretación hasta que el usuario la retome.

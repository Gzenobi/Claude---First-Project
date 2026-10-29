# Cálculo de Costo - Chromascan — decisiones fijas

Estas son decisiones que el usuario (Gabriel) ya tomó. No volver a preguntarlas: aplicarlas directamente.

## Flujo de trabajo

- **URL pública de la app en Render**: https://proyecto-costo-colores.onrender.com — plan gratuito, así que si no tuvo tráfico en ~15 min se "duerme" y el primer acceso tarda unos segundos en cargar (cold start); es esperado, no un bug.
- **Nunca hacer `git push` sin confirmación explícita del usuario.** Cada push dispara un redeploy automático en Render. Trabajar primero en el sandbox; recién pushear cuando el usuario lo pida con algo como "pushealo".
- Este sandbox **no tiene acceso a `onrender.com`** (bloqueado por política de red). No se puede verificar nada directamente en Render; el usuario manda screenshots y yo doy instrucciones exactas de click a click, o opero la herramienta yo mismo vía Playwright contra el sandbox cuando el usuario lo pide.
- Los servidores de desarrollo del sandbox (Postgres, backend, Vite) se caen seguido (reinicios del contenedor). Reiniciar en este orden: `service postgresql start` → verificar con `psql -d calculadora -c "SELECT 1;"` → `nohup npx tsx src/index.ts &` (desde `server/`) → `nohup npx vite --port 5173 &` (desde `client/`). Si el contenedor es nuevo (otro mes), el rol `calc_app` y la base `calculadora` locales no existen — crearlos (`CREATE ROLE calc_app WITH LOGIN PASSWORD 'devpass';` y `CREATE DATABASE calculadora OWNER calc_app;` como superusuario `postgres`), escribir `server/.env` con `DATABASE_URL="postgresql://calc_app:devpass@localhost:5432/calculadora"` y `PORT=4000`, y correr `npx prisma migrate deploy` + `npm run seed`.

## Base de datos de producción: Supabase (no Render)

- La base de Render se usó originalmente, pero **Render borra las bases Postgres gratuitas a los 30 días** (no solo las "duerme" como al Web Service) — eso pasó el 2026-10-29 y se perdió toda la data real cargada hasta ese momento (decisión del usuario: no pagar para recuperarla, se re-importa todo de nuevo).
- Desde esa fecha, la base de producción vive en **Supabase** (proyecto `calculo-costo-chromascan`, org "Gzenobi's Org", región `sa-east-1`), conectada vía la variable `DATABASE_URL` en el Web Service de Render — el Web Service de Render en sí **no** expira ni tiene ese límite de 30 días, solo la base.
- **Importante — conexión IPv4 obligatoria**: la conexión "directa" de Supabase (`db.<ref>.supabase.co:5432`) es IPv6-only y Render no tiene salida IPv6, así que esa URL nunca conecta desde Render (error `P1001: Can't reach database server`). Hay que usar uno de los *poolers* de Supabase (IPv4):
  - **Session pooler** (host `aws-*.pooler.supabase.com`, puerto **5432**, usuario `postgres.<project-ref>`) — es el que funciona para `prisma migrate deploy`. El **Transaction pooler** (mismo host, puerto 6543) se cuelga en el paso de migración porque Prisma necesita un advisory lock que el modo transacción de pgbouncer no soporta — el deploy queda colgado y Render lo cancela por timeout de puerto sin abrir nunca el servidor. Usar siempre **Session pooler**, no Transaction pooler, para la `DATABASE_URL` de este proyecto.
  - La contraseña real de la base está solo en la variable de entorno `DATABASE_URL` de Render (Environment tab del Web Service) — no se guarda en este repo ni en `server/.env` de producción.
- Supabase marcó **RLS (Row Level Security) deshabilitado** en las 15 tablas como hallazgo de seguridad crítico por defecto — en principio no aplica como riesgo real acá porque la app nunca usa la API de Supabase ni expone la anon key al navegador (el backend Express se conecta directo por `DATABASE_URL`, sin pasar por PostgREST), pero quedó pendiente decidir si habilitarlo igual por las dudas (el usuario no lo confirmó todavía).

## Identidad visual

- Navy institucional: **`#003A70`** (elegido por el usuario sobre el `#005192` del manual de marca oficial — es una decisión consciente, no un error).
- Logos: AkzoNobel (blanco) en el Sidebar sobre fondo navy; International (color) en el Header sobre fondo blanco. Assets reales en `client/public/logos/`, nunca recrear los logos.
- Encabezados de sección usan la clase `.section-bar` (navy, bleed a los bordes de la card vía `-mx-5 -mt-5` o `-mx-6 -mt-6`), no `<h2>`/`<h3>` planos.
- Nombres de producto en sentence case (ej. `Interthane 3230SG`), nunca ALL CAPS, al fusionar/renombrar.

## Consolidación de productos (fusión por marca)

Regla general: **nunca fusionar automáticamente por similitud de nombre** — solo fusión manual confirmada por el usuario, porque variantes de nombre a veces son productos realmente distintos.

Reglas ya confirmadas, válidas para toda fusión futura de variantes equivalentes:

- **Interthane 3230**: DECISIÓN ACTUALIZADA (2026-09-20) — por ahora, **todas** las versiones (plano, HG, SG, y cualquier variante de escritura/color de esas) se consolidan en **un solo producto** `Interthane 3230`. La separación HG (brillante) vs SG (semimate) en dos productos distintos queda pendiente para más adelante — no volver a fusionar HG y SG entre sí sin que el usuario primero re-separe este producto único.
- **Interthane 990 HS** (High Solids) es un producto distinto de **Interthane 990** liso — **nunca fusionar entre sí**. Las variantes de escritura de HS entre sí sí se fusionan (`Interthane 990HS` + `Interthane 990 HS` → un solo `Interthane 990 HS`).
- **Interthane 990 Orange** y **Interthane 990 Yellow** son variantes de nombre del mismo producto, no productos distintos → fusionan directo dentro de **Interthane 990**.
- Typos de escritura simples (ej. "Inetrthane 990", "Integard 740", "Interfuf 262", "Interseal 670 HS" vs "670HS") siempre fusionan a la grafía correcta.
- Patrón general: cuando la única diferencia es ortografía/espaciado/mayúsculas, es el mismo producto. Cuando la diferencia nombra una propiedad técnica real del producto (HS = high solids, HG/SG = brillo/acabado), son productos distintos — salvo que el usuario decida agruparlos temporalmente, como en el caso 3230 de arriba.

## Búsqueda: siempre por MARCA de producto + COLOR

- El flujo de cálculo busca por **Producto (marca)** y **Color**, nunca por base. La base a usar surge de la fórmula (Base→Parte B vía el maestro de costos), no se elige a mano.
- Por diseño, `Product.name`/`Product.code` se crean siempre desde el campo de marca del archivo de fórmula (`Linhas:`), nunca desde el código de una base — verificado en `server/src/services/ImportService.ts` (`importOneFormula`). La lista de Productos nunca debería mostrar una base como si fuera una marca; si eso aparece, es un dato de origen mal cargado a corregir puntualmente, no un problema de arquitectura.

## Pendiente sin resolver

- La pregunta sobre "los que tienen guion, deberían ir sin guion" quedó sin responder (el usuario descartó la pregunta de aclaración). No asumir ninguna interpretación hasta que el usuario la retome.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

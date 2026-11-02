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

## Identidad visual — "Hull & Oxide" (2026-10-31, reemplaza el branding AkzoNobel)

**DECISIÓN ACTUALIZADA**: se abandonó por completo el branding de AkzoNobel/International ("Rediseñemos, salgamos del branding de AKZO y busquemos algo mas moderno y funcional" — decisión explícita del usuario). Ya no aplica nada del manual de marca oficial de AkzoNobel para esta app. No reintroducir el navy `#003A70`, los logos de AkzoNobel/International, ni `.section-bar` sin que el usuario lo pida explícitamente.

- Sistema de diseño propio **"Hull & Oxide"**, inspirado en pinturas industriales/marinas reales (primer anticorrosivo rojo-óxido, pátina verdigris de herrajes de bronce) en vez de defaults genéricos de SaaS. Validado primero con un mockup interactivo (Artifact) antes de aplicarlo a toda la app real.
- Paleta (tokens Tailwind v4 en `client/src/index.css`, vía `@theme`; los **nombres** de token quedaron igual que antes — `navy`, `sky`, `fuchsia`, `violet`, `purple` — solo cambiaron los **valores hex**, lo que permitió re-aplicar el rebrand global sin tocar la mayoría de los componentes):
  - `navy` → **ink** `#1a1d1e` (texto, headers, botones, fondo del Sidebar).
  - `sky` y `fuchsia` → **oxide** `#b23a1f` (mismo hex a propósito: único acento/link/selección y también el color de error/destructivo).
  - `violet` → **ochre** `#a67c27` (advertencias).
  - `purple`/`ultramarine` → **verdigris** `#2f6b5e` (positivo/success, 3er color de gráficos).
  - `gray-dark` → gris cálido `#5c584f` (antes un gris frío `#5b6b7a`) — si aparece `#5b6b7a` hardcodeado en algún lado es un resabio viejo a corregir, no usar ese valor nunca más.
- Tipografía: **Archivo** (sans, UI) + **IBM Plex Mono** (códigos de componente, cifras de datos) vía Google Fonts, cargadas en `client/index.html`.
- Logos: **ninguno**. Se quitaron los logos de AkzoNobel (`akzonobel-white.svg`) e International (`international-blue.png`) del Sidebar/Header; en su lugar hay un wordmark propio "Chromascan" (cuadradito de acento `bg-sky` + texto) en `Sidebar.tsx`. Los archivos de logo en `client/public/logos/` quedaron sin referenciar — se pueden borrar si se quiere limpiar.
- Encabezados de sub-sección usan la clase **`.panel-head`** (texto en negrita + una sola línea fina inferior `border-bottom`, sin relleno de color) — reemplaza a `.section-bar` (la barra sólida navy de la era AkzoNobel), que ya no se usa en ningún lado.
- Se eliminó el patrón `border-l-4` (borde izquierdo de color grueso en cards de alerta) en toda la app — quedaba redundante con los `.badge` de estado y había sido marcado como anti-patrón ("side-tab") por el skill `/impeccable`. No reintroducirlo.
- Nombres de producto en sentence case (ej. `Interthane 3230SG`), nunca ALL CAPS, al fusionar/renombrar.

## Movimiento/interacción — "Vidrio" (2026-11-02)

**DECISIÓN TOMADA**: entre 5 personalidades de interacción propuestas (basadas en el skill `anthropic-skills:apple-design` — springs en vez de animaciones de duración fija), el usuario eligió **Vidrio**: superficies de material translúcido real (`backdrop-filter: blur`) en los paneles que de verdad se superponen a otro contenido, no como fondo decorativo en superficies que no tapan nada detrás.

- Implementado sobre la paleta Hull & Oxide (no se cambió color, solo movimiento/materialidad).
- `client/src/lib/spring.ts`: motor de spring reutilizable (`createSpring`, `rubberband`, `project`, `prefersReducedMotion`) parametrizado como Apple (damping ratio + response, no stiffness/damping crudos). Usar este motor para cualquier nueva interacción arrastrable — no CSS transitions para gestos.
- `.glass-dark` / `.glass-light` / `.glass-pop-in` en `client/src/index.css`: utilidades de vidrio, con fallback a superficie sólida bajo `prefers-reduced-transparency: reduce` y sin animación bajo `prefers-reduced-motion: reduce`.
- **Drawer mobile del Sidebar**: ya no es una transición CSS de ancho fijo — se arrastra 1:1 con el dedo/puntero, tiene rubber-band en los bordes, hereda la velocidad del gesto al soltar y proyecta el destino (como scroll con inercia). Translúcido+blur solo en mobile (overlay real sobre el contenido); en desktop vuelve a ser sólido porque ahí va en flujo normal, no superpuesto — ver el `@media (min-width: 768px)` sobre `.sidebar-drawer` en `index.css` (necesario para ganarle a las utilidades `md:` de Tailwind, que son CSS en capa y pierden contra CSS sin capa por diseño del navegador).
- Dropdown de búsqueda del Header y el modal `MappingWizard`/`CostMappingWizard` (Import Fórmulas/Costos) usan `.glass-light` + `.glass-pop-in`, anclados a su disparador (`transform-origin`).
- Header y barra superior **no** se hicieron translúcidos: en el layout actual no se superponen a contenido que scrollea debajo (están en su propia fila del flex, no flotando), así que el efecto vidrio no aportaría nada ahí sin un rediseño de layout mayor — no se hizo esa reestructuración.
- Si se agregan nuevos paneles flotantes/modales/menús, seguir el mismo patrón: `.glass-light` sobre fondo claro o `.glass-dark` sobre fondo oscuro, `.glass-pop-in` para la entrada, `transform-origin` apuntando al disparador, y el motor de `spring.ts` si hay arrastre de por medio.

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

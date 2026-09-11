# AkzoNobel Industrial Coatings — CRM Comercial

CRM comercial **zero-install** para el equipo de ventas técnicas de recubrimientos industriales AkzoNobel. Funciona abriendo `index.html` directamente en el navegador — sin Node, sin build, sin backend.

## Cómo usar

1. Descomprime el proyecto (o clónalo).
2. Haz doble click en `index.html`.
3. Listo. La app carga datos de ejemplo automáticamente la primera vez.

Requiere conexión a internet solo para cargar las librerías desde CDN (Chart.js, SheetJS, SortableJS, Lucide Icons). No requiere instalación de ningún tipo.

## Arquitectura

```
index.html          Punto de entrada, carga CSS + scripts + CDN
css/styles.css       Sistema de diseño completo (paleta AkzoNobel, componentes, responsive)
js/storage.js        Capa de persistencia: IndexedDB (datasets) + LocalStorage (config/backup)
js/ui.js             Componentes reutilizables: toasts, modales, tablas, paginación, formularios
js/mockData.js       Constantes de dominio + generador de datos de ejemplo industriales
js/router.js         Router SPA basado en hash (#/dashboard, #/clientes, ...)
js/charts.js         Wrappers de Chart.js con la paleta oficial de marca
js/dashboard.js      Vista de dashboard ejecutivo (KPIs + 4 gráficos)
js/clients.js        Módulo CRUD de clientes (búsqueda, filtros, orden, paginación)
js/projects.js       Módulo de proyectos: vista tabla + kanban, CRUD
js/kanban.js         Tablero kanban reutilizable con drag & drop (SortableJS)
js/activities.js     Módulo de actividades comerciales: timeline + CRUD
js/export.js         Exportación XLSX / CSV / JSON (SheetJS), incluye "exportar solo mi trabajo"
js/import.js         Importación (uno o varios archivos) con merge automático y detección de duplicados
js/team.js           Vista "Equipo" (solo Administrador): consolidación + estadísticas por vendedor
js/users.js          Perfil local (nombre + rol), alcance de datos multi-usuario
js/app.js            Bootstrap: login gate, shell (sidebar/topbar), seeding, wiring de rutas
assets/              Logo AkzoNobel (SVG)
data/                Reservado para datasets adicionales
```

No se usan módulos ES6 (`import`/`export`) para evitar el bloqueo CORS que los navegadores aplican a `type="module"` cuando se abre un archivo con `file://`. En su lugar, cada script se registra en un único namespace global `window.CRM`.

## Módulos funcionales

- **Dashboard**: clientes totales, proyectos, pipeline abierto, forecast ponderado, actividades pendientes/vencidas, ganados/perdidos + gráficos de pipeline por etapa, forecast mensual, proyectos por segmento y actividades por responsable.
- **Clientes**: CRUD completo, búsqueda, filtro por segmento, orden por columna, paginación.
- **Proyectos**: CRUD completo, vista tabla y vista kanban con drag & drop entre etapas (Prospecto → Calificación → Cotización → Prueba Técnica → Negociación → Ganado/Perdido), filtros por segmento/etapa/responsable.
- **Actividades**: CRUD completo, timeline cronológico, marcado automático de actividades vencidas, marcar como completada.
- **Datos y backup**: exportar todo a XLSX/JSON o por módulo a CSV; importar uno o varios archivos XLSX/JSON con merge automático por ID y detección de duplicados por clave natural (email, nombre de proyecto, título+fecha); backup automático a LocalStorage tras cada cambio y restauración manual.

## Multi-usuario (sin servidor)

Cada computador guarda su propia base de datos local (IndexedDB) — no hay un servidor central. Para trabajar en equipo, el flujo es:

1. **Cada vendedor** abre su propia copia del CRM, se identifica una vez con su nombre y rol "Vendedor" (perfil local, no es una contraseña), y trabaja normalmente. Todo lo que crea queda etiquetado internamente con su nombre.
2. Cuando quiere compartir su avance, va a **Datos y backup → "Exportar mi trabajo"** y descarga un XLSX o JSON con *solo* sus propios registros, y se lo envía por email al administrador.
3. **El administrador** abre su propia copia del CRM con rol "Administrador" y, en la sección **Equipo**, sube de una vez los archivos que le enviaron uno o varios vendedores. Los registros se consolidan sin duplicar (merge por ID y por clave natural).
4. En **Equipo**, el administrador ve estadísticas por vendedor (clientes, proyectos, pipeline, actividades) y puede alternar entre "ver todo el equipo" o "ver solo a X" desde cualquier módulo (Dashboard, Clientes, Proyectos, Actividades) mediante un filtro persistente indicado en la barra superior.

Para cambiar de usuario en el mismo computador, usa el botón de salir junto al avatar en la barra superior.

## Paleta de marca

Se utiliza la paleta oficial de AkzoNobel: Navy `#005192` (color ancla), Sky `#008BC5`, Purple `#542C97`, Ultramarine `#000394`, Fuchsia `#E0457A`, Violet `#A8269A`, sobre neutros blanco/gris (`#B7B9BA`, `#868688`).

## Persistencia

- **IndexedDB** (`akzonobel_crm_db`): almacena clientes, proyectos y actividades — soporta datasets grandes y consultas eficientes.
- **LocalStorage**: configuración de UI (sidebar colapsado, filtros) y backup JSON automático versionado, restaurable desde la vista "Datos y backup".

## Compartir / publicar

Esta carpeta puede comprimirse en un ZIP y compartirse tal cual, o publicarse como sitio estático (GitHub Pages, Netlify, S3, etc.) sin ningún paso de compilación.

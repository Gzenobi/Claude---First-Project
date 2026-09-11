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
js/export.js         Exportación XLSX / CSV / JSON (SheetJS)
js/import.js         Importación con merge automático y detección de duplicados
js/app.js            Bootstrap: shell (sidebar/topbar), seeding, wiring de rutas
assets/              Logo AkzoNobel (SVG)
data/                Reservado para datasets adicionales
```

No se usan módulos ES6 (`import`/`export`) para evitar el bloqueo CORS que los navegadores aplican a `type="module"` cuando se abre un archivo con `file://`. En su lugar, cada script se registra en un único namespace global `window.CRM`.

## Módulos funcionales

- **Dashboard**: clientes totales, proyectos, pipeline abierto, forecast ponderado, actividades pendientes/vencidas, ganados/perdidos + gráficos de pipeline por etapa, forecast mensual, proyectos por segmento y actividades por responsable.
- **Clientes**: CRUD completo, búsqueda, filtro por segmento, orden por columna, paginación.
- **Proyectos**: CRUD completo, vista tabla y vista kanban con drag & drop entre etapas (Prospecto → Calificación → Cotización → Prueba Técnica → Negociación → Ganado/Perdido), filtros por segmento/etapa/responsable.
- **Actividades**: CRUD completo, timeline cronológico, marcado automático de actividades vencidas, marcar como completada.
- **Datos y backup**: exportar todo a XLSX/JSON o por módulo a CSV; importar XLSX/JSON con merge automático por ID y detección de duplicados por clave natural (email, nombre de proyecto, título+fecha); backup automático a LocalStorage tras cada cambio y restauración manual.

## Paleta de marca

Se utiliza la paleta oficial de AkzoNobel: Navy `#005192` (color ancla), Sky `#008BC5`, Purple `#542C97`, Ultramarine `#000394`, Fuchsia `#E0457A`, Violet `#A8269A`, sobre neutros blanco/gris (`#B7B9BA`, `#868688`).

## Persistencia

- **IndexedDB** (`akzonobel_crm_db`): almacena clientes, proyectos y actividades — soporta datasets grandes y consultas eficientes.
- **LocalStorage**: configuración de UI (sidebar colapsado, filtros) y backup JSON automático versionado, restaurable desde la vista "Datos y backup".

## Compartir / publicar

Esta carpeta puede comprimirse en un ZIP y compartirse tal cual, o publicarse como sitio estático (GitHub Pages, Netlify, S3, etc.) sin ningún paso de compilación.

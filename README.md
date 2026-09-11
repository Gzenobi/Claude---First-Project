# AkzoNobel Marine & Protective Coatings — CRM Comercial

CRM comercial **zero-install** para el equipo de ventas técnicas de recubrimientos industriales AkzoNobel. Funciona abriendo `index.html` directamente en el navegador — sin Node, sin build, sin backend.

## Cómo usar

1. Descomprime el proyecto (o clónalo).
2. Haz doble click en `index.html`.
3. Listo. La app arranca **vacía** (sin datos de ejemplo) — lista para cargar información real desde el primer momento.

¿Quieres explorar la app con datos de prueba primero? En **Datos y backup → Reiniciar datos → "Cargar datos de ejemplo"** puedes agregar un set de ~20 clientes/proyectos/actividades/materiales de ejemplo en cualquier momento, y borrarlos después con **"Borrar todos los datos"** (deja todo en blanco, sin afectar tu perfil de usuario) para arrancar con información real.

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
js/materials.js      Catálogo de materiales: CRUD + carga de planilla (XLSX/CSV/JSON)
js/export.js         Exportación XLSX / CSV / JSON (SheetJS), incluye "exportar solo mi trabajo"
js/import.js         Importación (uno o varios archivos) con merge automático y detección de duplicados
js/team.js           Vista "Equipo" (solo Administrador): consolidación + estadísticas por representante
js/users.js          Perfil local (nombre + rol), alcance de datos multi-usuario
js/app.js            Bootstrap: login gate, shell (sidebar/topbar), carga de ejemplo/reset, wiring de rutas
assets/              Logo AkzoNobel (SVG)
data/                Reservado para datasets adicionales
```

No se usan módulos ES6 (`import`/`export`) para evitar el bloqueo CORS que los navegadores aplican a `type="module"` cuando se abre un archivo con `file://`. En su lugar, cada script se registra en un único namespace global `window.CRM`.

## Módulos funcionales

- **Dashboard**: clientes totales, proyectos, pipeline abierto, forecast ponderado, actividades pendientes/vencidas, ganados/perdidos. Los 4 gráficos (pipeline por etapa, forecast mensual, proyectos por segmento, actividades por responsable) son **clickeables**: al hacer click en una barra/segmento se abre una ventana emergente con el detalle de los registros que la componen. El forecast mensual muestra dos series — revenue ponderado en USD y volumen ponderado en litros — con eje dual.
- **Clientes**: CRUD completo, búsqueda, filtro por segmento, orden por columna, paginación.
- **Proyectos**: CRUD completo (incluye valor en USD y volumen estimado en litros), vista tabla y vista kanban con drag & drop entre etapas (Prospecto → Calificación → Cotización → Prueba Técnica → Negociación → Ganado/Perdido), filtros por segmento/etapa/responsable.
- **Actividades**: CRUD completo, timeline cronológico, marcado automático de actividades vencidas, marcar como completada.
- **Materiales**: catálogo de productos AkzoNobel (código, categoría, unidad, precio, stock, proveedor). Permite subir una planilla XLSX/CSV/JSON para cargar o actualizar el catálogo en bloque (sin duplicar), además de alta/edición/baja manual.
- **Datos y backup**: exportar todo a XLSX/JSON o por módulo a CSV; importar uno o varios archivos XLSX/JSON con merge automático por ID y detección de duplicados por clave natural (email, nombre de proyecto, título+fecha); backup automático a LocalStorage tras cada cambio y restauración manual.

## Multi-usuario (sin servidor)

Cada computador guarda su propia base de datos local (IndexedDB) — no hay un servidor central. Para trabajar en equipo, el flujo es:

1. **Cada representante comercial** abre su propia copia del CRM, se identifica una vez con su nombre y rol ("Representante Comercial" / "Sales Representative"; perfil local, no es una contraseña), y trabaja normalmente. Todo lo que crea queda etiquetado internamente con su nombre.
2. Cuando quiere compartir su avance, va a **Datos y backup → "Exportar mi trabajo"** y descarga un XLSX o JSON con *solo* sus propios registros, y se lo envía por email al administrador.
3. **El administrador** abre su propia copia del CRM con rol "Administrador" y, en la sección **Equipo**, sube de una vez los archivos que le enviaron uno o varios representantes. Los registros se consolidan sin duplicar (merge por ID y por clave natural).
4. En **Equipo**, el administrador ve estadísticas por representante (clientes, proyectos, pipeline, actividades) y puede alternar entre "ver todo el equipo" o "ver solo a X" desde cualquier módulo (Dashboard, Clientes, Proyectos, Actividades) mediante un filtro persistente indicado en la barra superior.

Para cambiar de usuario en el mismo computador, usa el botón de salir junto al avatar en la barra superior.

### Aislamiento de datos entre representantes

Un **Representante Comercial / Sales Representative** solo ve sus propios clientes, proyectos y actividades — nunca los de otro representante, ni siquiera si varias personas usan el mismo computador (con "Cambiar de usuario"). El **Administrador** es el único rol que ve todo el equipo consolidado, o puede filtrar por una persona específica desde Equipo. El catálogo de **Materiales** es la excepción: es compartido y visible para todos los roles, porque es información de producto, no comercial.

En la práctica esto casi nunca hace falta pensarlo: si cada representante usa su propio computador (el flujo recomendado), ya están físicamente separados — cada uno tiene su propia base de datos local. El filtro por usuario importa sobre todo si varias personas comparten un mismo computador.

## Paleta de marca

Se utiliza la paleta oficial de AkzoNobel: Navy `#005192` (color ancla), Sky `#008BC5`, Purple `#542C97`, Ultramarine `#000394`, Fuchsia `#E0457A`, Violet `#A8269A`, sobre neutros blanco/gris (`#B7B9BA`, `#868688`).

## Persistencia

- **IndexedDB** (`akzonobel_crm_db`): almacena clientes, proyectos, actividades y materiales — soporta datasets grandes y consultas eficientes.
- **LocalStorage**: configuración de UI (sidebar colapsado, filtros) y backup JSON automático versionado, restaurable desde la vista "Datos y backup".

## Compartir / publicar

Esta carpeta puede comprimirse en un ZIP y compartirse tal cual, o publicarse como sitio estático (GitHub Pages, Netlify, S3, etc.) sin ningún paso de compilación.

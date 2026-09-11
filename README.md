# AkzoNobel Marine & Protective Coatings — CRM Comercial

CRM comercial **zero-install** para el equipo de ventas técnicas de recubrimientos industriales AkzoNobel. Funciona abriendo `index.html` directamente en el navegador — sin Node, sin build, sin backend.

## Cómo usar

1. Descomprime el proyecto (o clónalo).
2. Haz doble click en `index.html`.
3. Listo. La app arranca **vacía** (sin datos de ejemplo) — lista para cargar información real desde el primer momento.

¿Quieres explorar la app con datos de prueba primero? En **Datos y backup → Reiniciar datos → "Cargar datos de ejemplo"** puedes agregar un set de ~20 clientes/proyectos/actividades/materiales de ejemplo en cualquier momento, y borrarlos después con **"Borrar todos los datos"** (deja todo en blanco, sin afectar tu perfil de usuario) para arrancar con información real.

No requiere conexión a internet ni instalación de ningún tipo: todas las librerías (Chart.js, SheetJS, SortableJS, Lucide Icons) vienen empaquetadas dentro del proyecto en `vendor/` — no depende de ningún CDN externo. Esto es importante en redes corporativas con firewalls/proxies restrictivos que suelen bloquear dominios de CDN no autorizados.

## Arquitectura

```
index.html          Punto de entrada, carga CSS + scripts (todos locales)
vendor/              Chart.js, SheetJS, SortableJS, Lucide y Firebase SDK empaquetados localmente (ver vendor/README.md)
css/styles.css       Sistema de diseño completo (paleta AkzoNobel, componentes, responsive)
js/firebase-config.js Configuración de Firebase (opcional — placeholder por defecto, ver "Sincronización en la nube")
js/cloud.js          Gate + bootstrap de Firebase: detecta si hay configuración real
js/storage.js        Capa de persistencia local: IndexedDB (datasets) + LocalStorage (config/backup)
js/storage-cloud.js  Reemplaza CRM.Storage por Firestore SOLO si hay configuración real de Firebase
js/ui.js             Componentes reutilizables: toasts, modales, tablas, paginación, formularios
js/mockData.js       Constantes de dominio + generador de datos de ejemplo industriales
js/router.js         Router SPA basado en hash (#/dashboard, #/clientes, ...)
js/charts.js         Wrappers de Chart.js con la paleta oficial de marca
js/dashboard.js      Vista de dashboard ejecutivo (KPIs + 4 gráficos)
js/clients.js        Módulo CRUD de clientes (búsqueda, filtros, orden, paginación)
js/projects.js       Módulo de proyectos: vista tabla + kanban, CRUD
js/kanban.js         Tablero kanban reutilizable con drag & drop (SortableJS)
js/activities.js     Módulo de actividades comerciales: timeline + vista calendario + CRUD
js/materials.js      Catálogo de materiales: CRUD + carga de planilla (XLSX/CSV/JSON)
js/export.js         Exportación XLSX / CSV / JSON (SheetJS), incluye "exportar solo mi trabajo"
js/import.js         Importación (uno o varios archivos) con merge automático y detección de duplicados
js/team.js           Vista "Equipo" (solo Administrador): consolidación + estadísticas por representante
js/users.js          Perfil local (nombre + rol), alcance de datos multi-usuario
js/users-cloud.js    Reemplaza CRM.Users por login real de Firebase Auth SOLO si hay configuración real
js/app.js            Bootstrap: login gate, shell (sidebar/topbar), carga de ejemplo/reset, wiring de rutas
assets/              Logo AkzoNobel (SVG) + íconos de la PWA (assets/icons/)
data/                Reservado para datasets adicionales
manifest.json        Manifiesto de la PWA (nombre, íconos, colores) — ver "Instalar en el celular"
sw.js                Service worker: cachea la app para que funcione instalada/sin conexión
firestore.rules      Reglas de seguridad de Firestore (aislamiento por representante) — ver "Sincronización en la nube"
firebase.json / firestore.indexes.json  Configuración de Firebase (Hosting, Firestore, emulador local)
```

No se usan módulos ES6 (`import`/`export`) para evitar el bloqueo CORS que los navegadores aplican a `type="module"` cuando se abre un archivo con `file://`. En su lugar, cada script se registra en un único namespace global `window.CRM`.

## Módulos funcionales

- **Dashboard**: clientes totales, proyectos, pipeline abierto, forecast ponderado, actividades pendientes/vencidas, ganados/perdidos. Los 4 gráficos (pipeline por etapa, forecast mensual, proyectos por segmento, actividades por responsable) son **clickeables**: al hacer click en una barra/segmento se abre una ventana emergente con el detalle de los registros que la componen. El forecast mensual muestra dos series — revenue ponderado en USD y volumen ponderado en litros — con eje dual.
- **Clientes**: CRUD completo, búsqueda, filtro por segmento, orden por columna, paginación.
- **Proyectos**: CRUD completo (incluye valor en USD y volumen estimado en litros), vista tabla y vista kanban con drag & drop entre etapas (Prospecto → Calificación → Cotización → Prueba Técnica → Negociación → Ganado/Perdido), filtros por segmento/etapa/responsable.
- **Actividades**: CRUD completo, vista timeline (cronológica) y vista **calendario mensual** (con navegación mes a mes, día actual resaltado, y click en un día o actividad para ver/editar el detalle), marcado automático de actividades vencidas, marcar como completada.
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

## Sincronización en la nube (opcional)

Por defecto el CRM es **100% local**: cada computador tiene su propia base de datos y el equipo se coordina exportando/importando archivos (ver sección anterior). Si además quieres que el **mismo usuario** vea sus datos actualizados tanto en su computador como en su celular (o que el equipo se consolide automáticamente, sin enviar archivos por email), puedes activar la sincronización en la nube con **Firebase** — es opcional y no rompe nada de lo anterior: mientras no la configures, la app funciona exactamente igual que hoy.

### Qué cambia al activarla

- **Login real**: en vez de un perfil local (solo nombre), cada persona crea una cuenta con **email y contraseña** propia.
- **Datos en la nube**: clientes, proyectos y actividades se guardan en Firestore (la base de datos de Firebase) en vez de en el navegador — así el celular y la computadora del mismo usuario ven lo mismo, en tiempo real.
- **Aislamiento reforzado por el servidor**: un Representante Comercial solo puede leer/escribir sus propios registros (y ve los datos de ejemplo compartidos); un Administrador ve todo. Esto no depende de la app — está garantizado por las reglas de seguridad de Firestore (`firestore.rules`), así que ni abriendo las herramientas de desarrollador del navegador se puede saltar.
- El catálogo de **Materiales** sigue siendo compartido y editable por cualquier usuario autenticado, igual que en modo local.
- Exportar/importar XLSX/JSON y el backup local siguen disponibles para respaldos manuales.

### Cómo activarla (una sola vez, para todo el equipo)

1. Crea un proyecto gratis en [Firebase Console](https://console.firebase.google.com/) (plan Spark, sin costo para uso típico de un equipo comercial).
2. En el proyecto, activa **Authentication → Sign-in method → Email/contraseña**.
3. Activa **Firestore Database** (modo producción).
4. En **Reglas** de Firestore, pega el contenido de `firestore.rules` (incluido en este repositorio) y publica.
5. En **Configuración del proyecto → Tus apps → Web**, crea una app web y copia el objeto de configuración (`apiKey`, `authDomain`, `projectId`, etc.).
6. Pega esos valores en `js/firebase-config.js`, reemplazando los `TU_...` de ejemplo.
7. Vuelve a compartir el proyecto (ZIP o repositorio) con el equipo — cada quien crea su cuenta con email y contraseña la primera vez que abre `index.html`, eligiendo su rol.

Si `js/firebase-config.js` mantiene los valores de ejemplo (o no se completa), la app detecta que no hay configuración real y sigue funcionando 100% local, sin errores ni intentos de conexión a internet.

`firebase.json` y `firestore.indexes.json` se incluyen para quienes quieran administrar el proyecto con el CLI de Firebase (`firebase deploy --only firestore:rules`) o probar cambios localmente con el [Emulador de Firebase](https://firebase.google.com/docs/emulator-suite) — no son necesarios para el uso normal del equipo.

## Instalar en el celular (PWA)

El CRM se puede "instalar" en el celular como una app, con su propio ícono en la pantalla de inicio y sin la barra del navegador — es una **Progressive Web App (PWA)**, no un `.apk`: no hay que pasar por ninguna tienda de aplicaciones ni instalar nada por fuera del navegador.

**Requisito:** a diferencia de abrir `index.html` con doble click en la computadora, instalar en el celular requiere que la app esté publicada en algún servidor con **HTTPS** (el botón "Instalar"/"Agregar a pantalla de inicio" no aparece abriendo un archivo local desde el celular). Como ya tenés un proyecto Firebase para la sincronización en la nube (sección anterior), lo más simple es usar **Firebase Hosting**, que es gratis:

1. Instala el CLI de Firebase una sola vez: `npm install -g firebase-tools`.
2. Desde la carpeta del proyecto: `firebase login` (una vez) y `firebase use --add` para elegir tu proyecto.
3. Publica: `firebase deploy --only hosting`. Te va a dar una URL tipo `https://tu-proyecto.web.app`.
4. Compartí esa URL con el equipo. (Si no vas a usar sincronización en la nube, también sirve: la app funciona en modo 100% local incluso publicada así, cada celular/computadora guarda lo suyo — ver "Sincronización en la nube" para la diferencia.)

**Para instalarla en el celular**, con esa URL abierta:
- **Android (Chrome)**: aparece un banner "Agregar AkzoNobel CRM a la pantalla de inicio", o desde el menú ⋮ → "Instalar app".
- **iPhone (Safari)**: botón compartir (□↑) → "Agregar a pantalla de inicio".

Una vez instalada, abre en pantalla completa como una app nativa, y sigue funcionando **sin conexión** después de la primera carga (los archivos de la app quedan cacheados en el celular vía un service worker) — lo que no funciona sin conexión es, lógicamente, la sincronización en la nube en sí (necesita internet para guardar/traer datos de Firestore).

## Paleta de marca

Se utiliza la paleta oficial de AkzoNobel: Navy `#005192` (color ancla), Sky `#008BC5`, Purple `#542C97`, Ultramarine `#000394`, Fuchsia `#E0457A`, Violet `#A8269A`, sobre neutros blanco/gris (`#B7B9BA`, `#868688`).

## Persistencia

- **IndexedDB** (`akzonobel_crm_db`): almacena clientes, proyectos, actividades y materiales — soporta datasets grandes y consultas eficientes.
- **LocalStorage**: configuración de UI (sidebar colapsado, filtros) y backup JSON automático versionado, restaurable desde la vista "Datos y backup".

## Redes corporativas

Como no depende de ningún CDN externo (ver `vendor/`), la app carga sin problema aunque el firewall corporativo bloquee dominios externos no autorizados — solo se necesita poder servir/abrir los archivos del propio proyecto. Aun así, dos cosas dependen de la política de cada empresa y conviene probar en el equipo real antes de un despliegue masivo:

- **Persistencia de IndexedDB/LocalStorage**: algunas políticas de Chrome/Edge administrado borran el almacenamiento del sitio al cerrar el navegador. Probar: cargar datos, cerrar el navegador completamente, volver a abrir `index.html` y verificar que los datos sigan ahí.
- **Descargas**: exportar/importar XLSX/JSON depende de que el navegador permita descargar y adjuntar archivos.

## Compartir / publicar

Esta carpeta puede comprimirse en un ZIP y compartirse tal cual, o publicarse como sitio estático (GitHub Pages, Netlify, S3, etc.) sin ningún paso de compilación.

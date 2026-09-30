# Librerías de terceros (empaquetadas localmente)

Estos archivos se distribuyen junto con el CRM para que **no dependa de ningún CDN externo** en tiempo de ejecución — importante en redes corporativas con firewalls/proxies restrictivos que pueden bloquear dominios de CDN no autorizados.

| Archivo | Librería | Versión | Licencia | Uso en el CRM |
|---|---|---|---|---|
| `chart.umd.js` | [Chart.js](https://www.chartjs.org/) | 4.4.4 | MIT | Gráficos del Dashboard |
| `xlsx.full.min.js` | [SheetJS (xlsx)](https://sheetjs.com/) | 0.18.5 | Apache-2.0 | Exportar/importar XLSX y CSV |
| `Sortable.min.js` | [SortableJS](https://sortablejs.github.io/Sortable/) | 1.15.2 | MIT | Drag & drop del tablero Kanban |
| `lucide.min.js` | [Lucide Icons](https://lucide.dev/) | 0.462.0 | ISC | Iconografía de toda la interfaz |
| `firebase-app-compat.js` | [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk) | 12.19.0 | Apache-2.0 | Núcleo de Firebase (build "compat", `<script>` clásico) |
| `firebase-auth-compat.js` | [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk) | 12.19.0 | Apache-2.0 | Autenticación por email + contraseña (sincronización en la nube, opcional) |
| `firebase-firestore-compat.js` | [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk) | 12.19.0 | Apache-2.0 | Base de datos en la nube (sincronización opcional entre dispositivos) |

Cada licencia completa está en `LICENSE.<librería>.txt` en esta misma carpeta, tal como viene publicada por cada proyecto — no se modificó ningún archivo de código de terceros. Los tres archivos de Firebase son **opcionales**: el CRM funciona 100% local sin ellos; solo se activan si se configura un proyecto Firebase real (ver sección "Sincronización en la nube" en el README principal).

## Actualizar una versión

1. Descargar la versión deseada del build UMD/minificado correspondiente (desde npm o el CDN oficial del proyecto).
2. Reemplazar el archivo en esta carpeta manteniendo el mismo nombre.
3. Actualizar la versión en esta tabla y en el comentario correspondiente de `index.html`.
4. Probar que el CRM siga funcionando (Dashboard, Kanban, exportar/importar, íconos).

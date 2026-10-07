# Forecast MP&Y: herramienta de forecast mensual de consumo

Aplicación web 100% local (HTML + JavaScript, sin backend) para cargar el Excel de forecast (`FORECAST_MPY_ARG_*.xlsb`), analizar el consumo histórico por cliente × producto y completar el forecast de los próximos meses mucho más rápido que en Excel.

## Cómo usarla

1. Abrí `index.html` con doble clic (Chrome o Edge). No requiere instalación ni internet: las librerías están en `vendor/`.
2. Arrastrá el archivo `.xlsb` o `.xlsx` a la pantalla, o usá **Cargar archivo Excel**. El archivo de ~5 MB tarda unos 3 segundos y nunca sale de tu PC.
3. **Dashboard**: revisá los KPIs, la evolución mensual (real, forecast, plan anterior y estadístico) y las alertas. Hacé clic en un cliente, grupo o estado de los gráficos para ir directo a esas filas en la grilla.
4. **Forecast**: la grilla principal.
   - Filtrá por cliente, KAM, grupo, clase, texto (descripción/SKU/ProductId) o estado (con alertas, en alza, en baja, intermitentes, sin movimiento, picos, riesgo de quiebre, bloqueados).
   - Editá cualquier celda de forecast. **Enter** o **↓/↑** pasan a la fila siguiente o anterior y **Esc** cancela. La celda editada queda **bloqueada** (fondo ámbar) y las acciones masivas no la modifican.
   - **Acciones masivas** sobre las filas filtradas o las seleccionadas (casillas), para un rango de meses:
     completar con sugerido · copiar plan anterior (DMR) · copiar estadístico del sistema · copiar mes anterior · aplicar % de aumento/disminución · valor fijo · poner en cero · bloquear/desbloquear. Con la opción "Solo celdas en 0" se completan únicamente los huecos.
   - **Deshacer** (o Ctrl+Z) revierte las últimas 20 acciones.
   - Hacé clic en la descripción para abrir el **detalle del producto**, que muestra el gráfico de 18 meses, las métricas y las acciones para esa fila.
5. **Vista mensual**: elegí un mes y comparalo, fila por fila, contra el mismo mes del año anterior, el promedio, el sugerido, el plan anterior, el estadístico y la cartera. También se puede editar desde ahí.
6. **Resumen por cliente / por producto**: consolidado en litros, con variaciones contra el promedio y contra el plan anterior.
7. **Alertas**: lista priorizada por severidad y volumen.
8. **Exportar Excel final**: genera `Forecast_Final_<archivo>_<fecha>.xlsx`.

Todo (datos, ediciones, bloqueos y reglas) se **guarda solo** en el navegador. Si cerrás la pestaña y la volvés a abrir, la sesión se restaura.

### Ciclo mensual recomendado

1. Cargá el archivo nuevo del mes. Si había valores manuales, la app pregunta si querés conservarlos para los meses que coinciden.
2. Filtrá por **Estado → Con alertas** y resolvé primero las de severidad alta.
3. Recorré la grilla por cliente y ajustá lo necesario.
4. Exportá. La exportación guarda un **snapshot**, y el mes siguiente el KPI *Forecast accuracy* compara ese snapshot contra el consumo real.

## Previsión con la curva histórica (pop-up)

Para proyectar los meses que vienen a partir de la historia de cada cliente:

1. En **Forecast**, tocá **📈 Previsión por cliente**, o **Prever** en *Resumen por cliente*. Elegí el cliente y, si querés, un grupo de productos.
2. El pop-up muestra la **curva histórica del cliente** (21 meses, en litros), la proyección propuesta, el mismo mes del año anterior y el plan anterior.
3. Elegí el **método**:
   - **Curva año anterior** (recomendado a nivel cliente): repite la forma del año pasado, escalada al nivel actual. Por ejemplo, si los últimos 6 meses están 10% arriba de los mismos 6 meses del año anterior, cada mes proyectado = mismo mes del año anterior × 1,10.
   - **Índice estacional**: promedio reciente sin estacionalidad × peso de cada mes calendario según toda la historia.
   - **Tendencia lineal**: prolonga la recta de los últimos 12 meses.
   - **Promedio N meses**: valor plano. El más estable para demanda irregular.
   - **Plan anterior**: arranca del DMR para ajustarlo.
4. Ajustá la **ventana** y un **% general** (por ejemplo, +5 por aumento de precio o una obra nueva). Si hace falta, **corregí cualquier mes a mano** en la tabla.
5. **Aplicar al forecast** reparte el total de cada mes entre los productos del cliente **según su mix de los últimos N meses**. Las celdas bloqueadas se respetan: su volumen se descuenta y el resto se reparte entre las libres. Los valores se convierten a piezas con el PAC y se redondean de forma acumulada.

Para un producto puntual usá el botón **✎** de la fila, o **Ingresar forecast (curva)** en el detalle. Es el mismo pop-up pero con la curva de ese producto en piezas, y por defecto los valores aplicados quedan bloqueados. En productos intermitentes arranca con *Promedio*, porque la curva del año anterior amplificaría los pedidos esporádicos.

Cualquier aplicación se puede revertir con **Deshacer**.

## Proyectos: propuesta estadística + VULOPPS + corrección manual

El forecast final se arma en tres capas:

```
Forecast final = Base estadística (con historia limpia)  ±  Corrección manual  +  Proyectos VULOPPS ≥ 70%
```

1. **Limpieza de historia.** En el detalle de cada producto, marcá los meses que fueron un proyecto puntual (chips de *Limpieza de historia*). Los meses que el sistema detecta como pico aparecen con borde violeta. Esos meses dejan de contar para el promedio, la tendencia, la curva del pop-up y el mix de reparto. También hay acciones masivas: *Limpieza: excluir picos sugeridos* y *Limpieza: restaurar historia completa*. Después usá *Completar con sugerido* para que la base tome los nuevos promedios.
2. **Base + corrección manual.** Es la grilla de siempre: sugerido, pop-up por curva y ediciones bloqueadas.
3. **Proyectos.** Se leen de la hoja **VULOPPS** del archivo: tipo OPP/VUL, %, nombre, cliente (OMP GROUP), SKU y litros por mes en columnas AAAAMM. En la vista **Proyectos** se pueden agregar, editar o eliminar con un pop-up, que tiene un ayudante para repartir un total entre meses.
   - **OPP suma y VUL resta.** Solo entran los que tienen **probabilidad ≥ 70%**, y ese umbral se puede cambiar.
   - Los litros se convierten a piezas con el PAC del producto. Si el cliente nunca compró ese producto, se crea una fila nueva de origen "proyecto".
   - En la grilla, cada mes muestra la base (editable) y debajo, en violeta, el aporte de proyectos. La columna *Total final* incluye ambos.
   - Al cargar un archivo nuevo, los proyectos de VULOPPS se reemplazan por los del archivo; los cargados a mano se conservan.

La exportación agrega dos hojas: **Base vs Proyectos**, con las dos capas por separado, y **Proyectos**, con el formato de VULOPPS para pegarla de vuelta en el archivo, incluyendo los proyectos cargados a mano. Las alertas de desvío comparan la **base** contra la historia limpia, porque el volumen de proyectos ya está explicado. Cartera y plan anterior se comparan contra el **total final**.

## Volcar al Excel original (sin tocar fórmulas ni estructura)

El archivo que se devuelve a Demanda tiene que conservar sus fórmulas y su estructura. Por eso la app **no reescribe el `.xlsb`**: genera un archivo auxiliar con bloques alineados celda por celda con el original, para pegarlos con **Pegado especial → Valores + Saltar blancos**.

- **Bloque DMR** (`BLOQUE_DMR`): se pega en `Forecast!AS34` y cubre AS:BG (oct-26 a dic-27, en piezas). Solo trae valor en las celdas que cambiaron respecto del archivo cargado. El resto va vacío y "Saltar blancos" lo saltea, así que las fórmulas (por ejemplo `=BI34`), los formatos y los valores negativos originales quedan intactos.
- **Bloque VULOPPS** (`BLOQUE_VULOPPS`): se pega en `VULOPPS!C9` y cubre los 10 renglones OPP y los 10 VUL de la plantilla. La columna H (descripción) y los totales son fórmulas: van vacíos y no se tocan.
- **Control_DMR**: lista cada celda que cambia, con la celda exacta, antes, después y si reemplaza una fórmula `=estadístico`.
- **Filas_nuevas**: combinaciones o proyectos que no entran en la estructura del original (no se agregan filas). Quedan para cargar a mano o informar a Demanda.
- Opciones: respetar las celdas con fórmula `=estadístico` aunque tu valor sea distinto, e incluir los proyectos dentro del DMR. Por defecto los proyectos van solo por VULOPPS, para no contarlos dos veces.
- El forecast inicial por defecto es el **DMR del archivo**, así solo viajan las correcciones que hiciste a conciencia. La propuesta estadística sigue disponible como *Sugerido*: está en el tooltip de cada celda, en la vista mensual, en el pop-up de curva y en la acción masiva "Completar con sugerido".

Verificación realizada con el archivo real: después de simular el pegado sobre una copia del original, las 15.240 celdas del DMR quedaron con el valor esperado, solo se escribieron las celdas con cambios y las fórmulas no tocadas siguieron intactas.

## Qué lee del archivo

| Hoja | Uso |
|---|---|
| `Forecast` (opcional) | Base de filas: KEY, cliente (OMP GROUP), KAM, SKU, code shape, descripción, sub-brand, PAC, clase estadística, historia **en piezas** (bloque *Actuals*), plan anterior (bloque *DMR*), estadístico (bloque *Estadístico*) y cartera (columnas 10/11/12 bajo *Carteira*). |
| `Actuals` | Historia por cliente × producto (en litros). Completa el ProductId y agrega las combinaciones que tienen consumo pero no figuran en la hoja Forecast, marcadas como "solo Actuals", con el PAC estimado a partir de la descripción. |
| `KAM` | Completa el KAM de las filas que no lo traen. |
| `VULOPPS` | Proyectos: oportunidades (OPP) y vulnerabilidades (VUL) con probabilidad, en litros por mes. |

La detección es automática: busca la fila de encabezados por nombre de columna (`OMPGroupName`, `ProductId`, `Description`, `CODE SAP`, etc.), reconoce las columnas de meses en formato fecha y clasifica cada bloque (real, plan o estadístico, y piezas o litros) a partir de las etiquetas de las filas de arriba. Si el archivo solo tiene una hoja tipo Actuals, trabaja en litros y propone un horizonte de 12 meses.

> **Nota técnica:** SheetJS 0.18.5 (la última versión publicada en npm/CDN) no puede leer el `metadata.bin` que Excel 365 agrega a este `.xlsb` y falla con "Unexpected record 0x3b". La app lo resuelve quitando esa referencia del paquete en memoria antes de leerlo. No afecta a los datos.

## Reglas de negocio

| Regla | Implementación |
|---|---|
| Forecast sugerido | Promedio de los últimos N meses (N = 6 por defecto, configurable). |
| Otros métodos | Tendencia lineal (recta de mínimos cuadrados sobre la ventana, con tope de 3× el promedio) · Promedio + crecimiento % · Promedio × índice estacional (solo para filas estacionales). |
| Redondeo | Acumulado: un consumo de 0,3 pz/mes se reparte como 0, 1, 0, 0, 1… en vez de quedar en 0, así se conserva el total. |
| Tendencia | Cambio de la recta ajustada a lo largo de la ventana, relativo al promedio. **En alza** si es ≥ +50% y **en baja** si es ≤ −50%. |
| Intermitente | Consume en menos de 2 de cada 3 meses de la ventana. En este archivo es más de la mitad de las combinaciones, y para ellas el promedio y la tendencia son poco representativos. |
| Sin movimiento | Consumo 0 en toda la ventana. |
| Estacionalidad básica | Correlación ≥ 0,6 con el mismo mes del año anterior (con al menos 6 pares de meses) y coeficiente de variación ≥ 0,3. |
| Picos anormales | Solo en consumidores regulares (≥ 6 meses con consumo de 12): valor > 3× el promedio del resto y > promedio + 3 desvíos. |
| Alertas | **Desvío vs histórico** (forecast promedio vs promedio N meses > umbral, 50% por defecto) · **Forecast sin consumo reciente** · **Consumo sin forecast** (próximos 3 meses en 0) · **Pico anormal** · **Riesgo de quiebre** · **Cambio fuerte vs plan anterior**. |
| Riesgo de quiebre | **Alto** si la cartera de un mes supera el forecast de ese mes. **Medio** si el forecast del primer mes es menor al 60% del consumo de los últimos 3 meses (solo en filas no intermitentes). |
| Forecast accuracy | Con snapshot: 1 − WAPE del forecast exportado contra el real, a nivel cliente × SKU y en litros. Sin snapshot: backtest del promedio sobre los últimos 3 meses reales, a nivel total de cartera, con el valor a nivel cliente × SKU como referencia. |

## Arquitectura

```
forecast-app/
├── index.html      Estructura: sidebar, topbar, filtros globales, 7 vistas, drawer de detalle, pop-up de previsión
├── styles.css      Identidad AkzoNobel (navy #003A70), semáforos, layout responsive
├── app.js          Toda la lógica (un IIFE, sin dependencias de build)
├── vendor/         jQuery 3.7.1, DataTables 1.13.11, Chart.js 4.4.4, SheetJS 0.18.5 (locales)
└── assets/logos/   AkzoNobel (blanco) e International (color)
```

`app.js` está dividido en 10 secciones numeradas:

1. **Utilidades**: formato es-AR, claves de mes `YYYY-MM`, parseo de números escritos por el usuario.
2. **Estado y persistencia**: un único objeto `state`. El forecast se guarda como arrays alineados a los meses (`state.fc[id][i]`), con una máscara de bloqueo (`state.manual[id][i]`). Se guarda en `localStorage` con debounce.
3. **Lectura de Excel**: primero lee solo los nombres de hoja y después únicamente las hojas candidatas (`sheets: [...]`), en modo `dense`. Incluye la detección de encabezados, bloques y unidades, y el merge Forecast + Actuals.
4. **Motor de análisis** en dos niveles (cálculo incremental):
   - `analyze(row)` depende solo de la historia y las reglas (promedios, tendencia, estacionalidad, picos, sugerido, backtest). Se recalcula al cargar o al cambiar reglas.
   - `evaluate(row)` depende del forecast (totales, desvíos, alertas, riesgo). Al editar una celda se recalcula **solo esa fila** y se refrescan solo sus celdas calculadas en la tabla.
5. **Operaciones de forecast**: edición, acciones masivas que respetan los bloqueos y pila de deshacer.
6. **Filtros**: comunes a todas las vistas.
7. **Vistas**: pop-up de previsión por curva (`projectCurve` + reparto por mix con `distribute`), dashboard (Chart.js), grilla (DataTables con `deferRender` y paginación, para que con miles de filas solo se dibuje la página visible), vista mensual, resúmenes, alertas, detalle y configuración. Cada vista se re-renderiza solo cuando está activa y marcada como "sucia".
8. **Exportación**: además del Excel de análisis, `exportOriginal` genera los bloques de pegado (8b) para el original. SheetJS arma hasta 7 hojas (*Forecast Final*, *Base vs Proyectos*, *Resumen por Producto*, *Resumen por Cliente*, *Alertas*, *Proyectos*, *Parámetros*) con título, fecha de generación, autofiltro, anchos de columna y formatos numéricos (`#,##0`, `0.0%`).
9. **Configuración y snapshots**: export/import JSON con reglas + valores manuales + bloqueos.
10. **Inicialización y eventos**: delegación de eventos y restauración de sesión.

Para depurar, en la consola del navegador está disponible `window.FC` (`FC.state`, `FC.analyzeAll()`, `FC.exportExcel()`).

## Limitaciones conocidas

- SheetJS Community no escribe estilos de celda (colores o negritas) en el Excel exportado. Sí escribe formatos numéricos, anchos y autofiltros.
- `localStorage` tiene un límite de ~5 MB por navegador. Este archivo ocupa ~1 MB de sesión. Con archivos mucho más grandes, el guardado automático avisa si no entra.
- La sesión y los snapshots quedan en el navegador y la PC donde se usó la herramienta. Para cambiar de PC, usá **Exportar/Importar configuración**.

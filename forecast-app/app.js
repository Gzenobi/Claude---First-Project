/* =====================================================================
   Forecast MP&Y — aplicación de forecast mensual de consumo
   100% cliente: SheetJS (lectura/escritura Excel), DataTables (grillas),
   Chart.js (gráficos). Sin backend: todo se guarda en localStorage.

   Índice del archivo
     1. Utilidades
     2. Estado y persistencia
     3. Lectura de Excel (detección de hojas, encabezados y meses)
     4. Motor de análisis (promedios, tendencia, estacionalidad, picos,
        sugerido, alertas, riesgo de quiebre, accuracy)
     5. Operaciones de forecast (edición, acciones masivas, deshacer)
     6. Filtros
     7. Vistas (dashboard, grilla, mensual, resúmenes, alertas, detalle)
     8. Exportación a Excel
     9. Configuración (import/export) y snapshots
    10. Inicialización y eventos
   ===================================================================== */
(function () {
  'use strict';

  /* ===================================================================
     1. UTILIDADES
     =================================================================== */
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

  const $id = (id) => document.getElementById(id);
  const fmt = (v) => (v == null || isNaN(v) ? '–' : nf0.format(v));
  const fmt1 = (v) => (v == null || isNaN(v) ? '–' : nf1.format(v));
  const fmtPct = (v) => (v == null || !isFinite(v) ? '–' : (v > 0 ? '+' : '') + nf0.format(v * 100) + '%');
  const pctClass = (v) => (v == null || !isFinite(v) ? '' : v > 0.005 ? 'pos' : v < -0.005 ? 'neg' : '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Normaliza texto para comparar encabezados y búsquedas (sin acentos ni símbolos). */
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const sum = (a) => { let s = 0; for (const v of a) s += v || 0; return s; };
  const mean = (a) => (a.length ? sum(a) / a.length : 0);
  const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(sum(a.map((v) => (v - m) ** 2)) / (a.length - 1)); };
  const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
  const nextTick = () => new Promise((r) => setTimeout(r, 30));

  /** 'YYYY-MM' → 'oct-26' */
  const mLabel = (k) => MES[+k.slice(5, 7) - 1] + '-' + k.slice(2, 4);
  /** Suma n meses a una clave 'YYYY-MM'. */
  const addMonths = (k, n) => {
    const t = +k.slice(0, 4) * 12 + (+k.slice(5, 7) - 1) + n;
    return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0');
  };

  /** Convierte un valor de celda de encabezado en clave de mes 'YYYY-MM' (o null). */
  function toMonthKey(v) {
    if (typeof v === 'number' && v > 36500 && v < 73050) { // serial de fecha Excel entre 2000 y 2099
      const d = XLSX.SSF.parse_date_code(v);
      return d ? d.y + '-' + String(d.m).padStart(2, '0') : null;
    }
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0');
    if (typeof v === 'string') {
      let m = v.trim().match(/^(\d{4})[-/](\d{1,2})/);
      if (m) return m[1] + '-' + m[2].padStart(2, '0');
      m = norm(v).match(/^(ene|jan|feb|mar|abr|apr|may|jun|jul|ago|aug|sep|set|oct|out|nov|dic|dec)(\d{2,4})$/);
      if (m) {
        const map = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dic: 12, dec: 12 };
        const y = m[2].length === 2 ? 2000 + +m[2] : +m[2];
        return y + '-' + String(map[m[1]]).padStart(2, '0');
      }
    }
    return null;
  }

  /** Número desde celda (vacíos y textos no numéricos → 0). */
  function toNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v === 'string' && v.trim() !== '') { const n = parseNum(v); return isNaN(n) ? 0 : n; }
    return 0;
  }
  /** Interpreta números escritos por el usuario: "1.234", "1234,5", "1,234.5". */
  function parseNum(s) {
    s = String(s).trim().replace(/\s/g, '');
    if (s === '') return 0;
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.includes(',')) s = s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return Number(s);
  }

  function toast(msg, err) {
    const t = $id('toast');
    t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = 'toast'), err ? 6000 : 3200);
  }
  function loading(text) {
    $id('loading').hidden = !text;
    if (text) $id('loadingText').textContent = text;
  }

  /* ===================================================================
     2. ESTADO Y PERSISTENCIA
     =================================================================== */
  const LS_SESSION = 'fcApp.v1.session';
  const LS_SNAPS = 'fcApp.v1.snapshots';

  const DEFAULT_SETTINGS = {
    window: 6,          // meses de historia para promedio / tendencia
    method: 'avg',      // avg | trend | growth | seasonal
    growthPct: 5,       // % para el método crecimiento
    alertPct: 50,       // umbral de desvío forecast vs promedio
    spikeFactor: 3,     // pico = valor > N × promedio del resto
    histVisible: 6,     // meses de historia visibles en la grilla
    initFrom: 'suggested',
    projThreshold: 70,  // % mínimo de probabilidad para que un proyecto VULOPPS entre al forecast
  };

  /**
   * state.rows: un registro por combinación cliente × SKU.
   *   hist[]  alineado a meta.histMonths (null = mes sin dato)
   *   plan[], stat[], cart[] alineados a meta.fcMonths
   * state.fc[id]     forecast de trabajo (array alineado a fcMonths)
   * state.manual[id] 1 = celda editada/bloqueada (no la pisan las acciones masivas)
   */
  const state = {
    meta: null,
    rows: [],
    byId: new Map(),
    fc: {},
    manual: {},
    projects: [],       // capa de proyectos (VULOPPS + manuales): { id, type OPP|VUL, name, client, sku, desc, prob, liters{mes}, source }
    projRow: {},        // derivado: piezas netas de proyectos incluidos por fila y mes
    excl: {},           // limpieza de historia: excl[id] = ['2026-09', …] meses marcados como proyecto
    settings: { ...DEFAULT_SETTINGS },
    filters: { client: '', kam: '', group: '', cls: '', text: '', status: '', hideDead: true },
    selected: new Set(),
    undo: [],
    view: 'dashboard',
    dirty: new Set(),   // vistas que deben re-renderizarse
  };

  const saveSession = debounce(() => {
    if (!state.meta) return;
    try {
      const rows = state.rows.map(({ _a, _e, ...r }) => r); // sin campos derivados
      const projects = state.projects.map(({ _row, _incl, _noPac, ...pj }) => pj);
      localStorage.setItem(LS_SESSION, JSON.stringify({ v: 1, meta: state.meta, rows, fc: state.fc, manual: state.manual, settings: state.settings, projects, excl: state.excl, savedAt: Date.now() }));
      $id('saveState').textContent = 'Guardado automático ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      $id('saveState').textContent = 'No se pudo guardar (espacio local lleno)';
    }
  }, 700);

  function loadSession() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
      if (!s || s.v !== 1 || !s.rows) return false;
      state.meta = s.meta; state.rows = s.rows; state.fc = s.fc || {}; state.manual = s.manual || {};
      state.projects = s.projects || []; state.excl = s.excl || {};
      state.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
      return true;
    } catch (e) { return false; }
  }

  /** Marca cambios: recalcula lo necesario, invalida vistas y agenda guardado. */
  function touch() {
    ['dashboard', 'monthly', 'clients', 'products', 'alerts'].forEach((v) => state.dirty.add(v));
    updateAlertBadge();
    saveSession();
  }

  /* ===================================================================
     3. LECTURA DE EXCEL
     =================================================================== */

  // Alias de encabezados reconocidos (comparados normalizados, sin acentos ni símbolos)
  const ALIASES = {
    key: ['key'],
    client: ['ompgroupname', 'ompgroup', 'cliente', 'customer', 'client', 'customername'],
    sku: ['sku', 'codesap', 'material', 'codigo', 'codigosap'],
    productId: ['productid'],
    shape: ['codeshape'],
    desc: ['description', 'materialdescription', 'descripcion', 'producto', 'productdescription'],
    group: ['subbrand', 'grupo', 'grupocomercial', 'group'],
    brand: ['brand', 'marca'],
    pc: ['pureprofitcenter', 'pc', 'profitcenter'],
    kam: ['kam', 'vendedor'],
    pac: ['pac', 'envase', 'packsize'],
    cls: ['classstat', 'clase', 'class'],
    type: ['type', 'tipo'],
  };
  const FIELD_BY_ALIAS = {};
  Object.entries(ALIASES).forEach(([f, list]) => list.forEach((a) => (FIELD_BY_ALIAS[a] = f)));

  /** Lee el libro. Workaround: SheetJS 0.18.5 falla con algunos metadata.bin de Excel 365
      ("Unexpected record 0x3b"); en ese caso se quita la referencia y se reintenta. */
  function readWorkbook(u8, sheets) {
    const opts = { type: 'array', dense: true, cellFormula: false, cellHTML: false, cellText: false, cellStyles: false, cellNF: false, sheets };
    try { return XLSX.read(u8, opts); } catch (e) {
      if (!/Unexpected record|metadata/i.test(e.message)) throw e;
      return XLSX.read(stripMetadata(u8), opts);
    }
  }
  function stripMetadata(u8) {
    const cfb = XLSX.CFB.read(u8, { type: 'array' });
    cfb.FullPaths.forEach((p, i) => {
      if (/\[Content_Types\]\.xml$/.test(p)) {
        const f = cfb.FileIndex[i];
        const xml = new TextDecoder().decode(f.content).replace(/<Override[^>]*metadata[^>]*\/>/gi, '');
        f.content = new TextEncoder().encode(xml); f.size = f.content.length;
      }
    });
    return XLSX.CFB.write(cfb, { type: 'array', fileType: 'zip' });
  }

  /** Busca la fila de encabezados (la que tiene más alias conocidos + columnas de meses). */
  function analyzeSheet(aoa) {
    let best = null;
    const lim = Math.min(aoa.length, 80);
    for (let r = 0; r < lim; r++) {
      const row = aoa[r] || [];
      const cols = {}; const months = [];
      row.forEach((v, c) => {
        const f = FIELD_BY_ALIAS[norm(v)];
        if (f && cols[f] == null) cols[f] = c;
        const mk = toMonthKey(v);
        if (mk) months.push({ c, key: mk });
      });
      const score = Object.keys(cols).length * 2 + Math.min(months.length, 12);
      if ((cols.client != null || cols.sku != null) && months.length >= 3 && (!best || score > best.score)) best = { r, cols, months, score };
    }
    if (!best) return null;

    // Sección (real / plan / estadístico) y unidad de cada columna de mes, leyendo las filas de arriba
    const labelLeft = (rowArr, c) => {
      for (let j = c; j >= 0; j--) {
        const v = rowArr && rowArr[j];
        if (typeof v === 'string' && v.trim() && !v.startsWith('=')) return v;
      }
      return '';
    };
    best.months.forEach((m) => {
      m.section = 'hist'; m.unit = '';
      for (let k = 1; k <= 3; k++) {
        const lab = norm(labelLeft(aoa[best.r - k], m.c));
        if (!m.unit && /pieza|unidad|pcs/.test(lab)) m.unit = 'pz';
        if (!m.unit && /litro/.test(lab)) m.unit = 'L';
      }
      for (let k = 1; k <= 3; k++) {
        const lab = norm(labelLeft(aoa[best.r - k], m.c));
        if (/estad|stat/.test(lab)) { m.section = 'stat'; break; }
        if (/dmr|plan|forecast|previous/.test(lab)) { m.section = 'plan'; break; }
        if (/actual|real|hist|consumo|venta/.test(lab)) { m.section = 'hist'; break; }
      }
    });
    // Columnas de cartera (encabezados 1..12 bajo una etiqueta "Carteira/Cartera")
    best.cart = [];
    (aoa[best.r] || []).forEach((v, c) => {
      if (typeof v === 'number' && v >= 1 && v <= 12 && Number.isInteger(v)) {
        for (let k = 1; k <= 2; k++) if (/carteira|cartera|backlog/.test(norm(labelLeft(aoa[best.r - k], c)))) { best.cart.push({ c, month: v }); break; }
      }
    });
    best.hasPlan = best.months.some((m) => m.section === 'plan');
    return best;
  }

  /** Elige, por sección y mes, una sola columna (prioriza piezas sobre litros). */
  function pickMonthCols(info, section) {
    const map = new Map();
    info.months.filter((m) => m.section === section).forEach((m) => {
      const prev = map.get(m.key);
      if (!prev || (prev.unit !== 'pz' && m.unit === 'pz')) map.set(m.key, m);
    });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  /** Extrae el tamaño de envase en litros de la descripción ("… 3,6L", "x 20L"). */
  function pacFromDesc(desc) {
    const all = [...String(desc || '').matchAll(/(\d+(?:[.,]\d+)?)\s*L\b/gi)];
    if (!all.length) return null;
    const v = parseFloat(all[all.length - 1][1].replace(',', '.'));
    return v > 0 ? v : null;
  }

  /**
   * Hoja VULOPPS: encabezado con InvoicingCountry | VulOps (OPP/VUL) | % | VulOpsName |
   * OMP GROUP | MRP | SKU | SKU Description | meses como AAAAMM (202610…) en litros.
   */
  function parseVulopps(aoa, fcMonths) {
    const ymKey = (v) => { const n = typeof v === 'number' ? v : /^\d{6}$/.test(String(v || '').trim()) ? +v : NaN; const y = Math.floor(n / 100), m = n % 100; return n > 190000 && n < 210100 && m >= 1 && m <= 12 ? y + '-' + String(m).padStart(2, '0') : null; };
    let hr = -1;
    for (let r = 0; r < Math.min(aoa.length, 40); r++) { const row = (aoa[r] || []).map(norm); if (row.includes('vulops') && row.includes('sku')) { hr = r; break; } }
    if (hr < 0) return [];
    const head = aoa[hr].map(norm), col = (n) => head.indexOf(n);
    const C = { type: col('vulops'), prob: col(''), name: col('vulopsname'), client: col('ompgroup'), sku: col('sku'), desc: col('skudescription') };
    C.prob = aoa[hr].findIndex((v) => String(v || '').trim() === '%');
    const months = []; aoa[hr].forEach((v, c) => { const k = ymKey(v); if (k && fcMonths.includes(k) && !months.some((m) => m.key === k)) months.push({ c, key: k }); });
    const out = [];
    for (let r = hr + 1; r < aoa.length; r++) {
      const row = aoa[r]; if (!row) continue;
      const sku = row[C.sku]; if (sku == null || String(sku).trim() === '' || String(sku).trim() === '0') continue;
      const liters = {}; months.forEach((m) => { const v = toNum(row[m.c]); if (v) liters[m.key] = v; });
      if (!Object.keys(liters).length) continue;
      let prob = toNum(row[C.prob]); if (prob > 0 && prob <= 1) prob *= 100;
      out.push({
        id: 'f' + r, source: 'archivo', type: /vul/i.test(String(row[C.type] || '')) ? 'VUL' : 'OPP',
        name: String(row[C.name] || '').trim() || '(sin nombre)', client: String(row[C.client] || '').trim(),
        sku: String(sku).trim(), desc: String(row[C.desc] || '').trim(), prob: Math.round(prob), liters,
      });
    }
    return out;
  }

  function readRecords(aoa, info) {
    const C = info.cols; const out = [];
    const get = (row, f) => (C[f] != null ? row[C[f]] : null);
    for (let r = info.r + 1; r < aoa.length; r++) {
      const row = aoa[r]; if (!row) continue;
      const client = get(row, 'client'); const sku = get(row, 'sku');
      if ((client == null || client === '') && (sku == null || sku === '')) continue;
      if (/total/i.test(String(client || ''))) continue;
      out.push({ row, get: (f) => get(row, f) });
    }
    return out;
  }

  /**
   * Procesa el archivo y arma state.rows.
   *  - Hoja "Forecast" (si existe): base de filas, historia en piezas, plan anterior (DMR),
   *    estadístico, KAM, PAC, clase y cartera.
   *  - Hoja "Actuals": historia por cliente × producto (litros). Completa meses y agrega
   *    combinaciones con consumo que no estén en la hoja Forecast.
   */
  async function parseFile(file) {
    loading('Leyendo ' + file.name + '…'); await nextTick();
    const u8 = new Uint8Array(await file.arrayBuffer());
    const t0 = performance.now();

    // 1) Solo nombres de hojas (rápido), luego se leen únicamente las hojas candidatas
    const names = XLSX.read(u8, { type: 'array', bookSheets: true }).SheetNames;
    let candidates = names.filter((n) => /actual|^forecast$|hist|consumo/i.test(n.trim()));
    if (!candidates.length) candidates = names;
    else if (names.includes('KAM')) candidates.push('KAM');
    const vulName = names.find((n) => /vul\s*opps|vulopps/i.test(n));
    if (vulName && !candidates.includes(vulName)) candidates.push(vulName);
    loading('Procesando hojas: ' + candidates.join(', ') + '…'); await nextTick();
    let wb = readWorkbook(u8, candidates);

    const sheets = [];
    const scan = (book) => book.SheetNames.forEach((n) => {
      const ws = book.Sheets[n]; if (!ws || !ws['!ref']) return;
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
      const info = analyzeSheet(aoa);
      if (info) sheets.push({ name: n, aoa, info });
    });
    scan(wb);
    if (!sheets.length && candidates !== names) { wb = readWorkbook(u8, names); scan(wb); }
    if (!sheets.length) throw new Error('No se encontró ninguna hoja con columnas de cliente/producto y meses.');

    const fcSheet = sheets.find((s) => s.info.hasPlan) || null;
    const actSheet = sheets.find((s) => s !== fcSheet && /actual/i.test(s.name)) || sheets.find((s) => s !== fcSheet && !s.info.hasPlan) || null;
    loading('Armando modelo de datos…'); await nextTick();

    const rows = []; const byId = new Map();
    let histMonths = []; let fcMonths = []; let unit = 'L';
    const addRow = (r) => {
      let id = r.key || (r.client + '|' + r.sku); let n = 2;
      while (byId.has(id)) id = (r.key || r.client + '|' + r.sku) + '#' + n++;
      r.id = id; byId.set(id, r); rows.push(r);
    };

    if (fcSheet) {
      unit = 'pz';
      const I = fcSheet.info;
      const hc = pickMonthCols(I, 'hist'), pc = pickMonthCols(I, 'plan'), sc = pickMonthCols(I, 'stat');
      histMonths = hc.map((m) => m.key);
      fcMonths = pc.length ? pc.map((m) => m.key) : sc.map((m) => m.key);
      const fcIdx = new Map(fcMonths.map((k, i) => [k, i]));
      const cartMap = I.cart.map((cc) => ({ c: cc.c, i: fcMonths.findIndex((k) => +k.slice(5) === cc.month) })).filter((x) => x.i >= 0);
      readRecords(fcSheet.aoa, I).forEach(({ row, get }) => {
        const pac = toNum(get('pac')) || pacFromDesc(get('desc')) || null;
        const r = {
          key: get('key') ? String(get('key')) : '',
          client: String(get('client') || '').trim(), sku: String(get('sku') ?? '').trim(),
          productId: String(get('productId') || ''), shape: String(get('shape') || ''), desc: String(get('desc') || '').trim(),
          group: String(get('group') || '').trim() || '(sin grupo)', kam: String(get('kam') || '').trim(),
          cls: String(get('cls') || '').trim(), pc: String(get('pc') || ''), type: String(get('type') || ''),
          pac, origin: 'F',
          hist: hc.map((m) => toNum(row[m.c])),
          plan: fcMonths.map(() => 0), stat: fcMonths.map(() => 0), cart: fcMonths.map(() => 0),
        };
        if (r.group === '0') r.group = '(sin grupo)';
        if (r.kam === '0') r.kam = '';
        if (r.cls === '0') r.cls = '';
        pc.forEach((m) => { r.plan[fcIdx.get(m.key)] = toNum(row[m.c]); });
        sc.forEach((m) => { if (fcIdx.has(m.key)) r.stat[fcIdx.get(m.key)] = toNum(row[m.c]); });
        cartMap.forEach((x) => { r.cart[x.i] = toNum(row[x.c]); });
        r.hasPlan = pc.length > 0; r.hasStat = sc.length > 0;
        addRow(r);
      });
    }

    if (actSheet) {
      const I = actSheet.info;
      const ac = pickMonthCols(I, 'hist');
      const actMonths = ac.map((m) => m.key);
      if (!fcSheet) {
        histMonths = actMonths;
        const last = histMonths[histMonths.length - 1];
        fcMonths = Array.from({ length: 12 }, (_, i) => addMonths(last, i + 1));
      } else {
        // unión de meses: la hoja Actuals puede traer meses anteriores
        const fcHist = histMonths;
        histMonths = [...new Set([...actMonths, ...fcHist])].sort();
        const pos = histMonths.map((k) => fcHist.indexOf(k));
        rows.forEach((r) => { const old = r.hist; r.hist = pos.map((j) => (j >= 0 ? old[j] : null)); });
      }
      const hIdx = new Map(histMonths.map((k, i) => [k, i]));
      readRecords(actSheet.aoa, I).forEach(({ row, get }) => {
        const key = get('key') ? String(get('key')) : String(get('client') || '') + String(get('sku') || '');
        const vals = ac.map((m) => toNum(row[m.c]));
        const existing = fcSheet ? byId.get(key) : null;
        if (existing) {
          if (!existing.productId) existing.productId = String(get('productId') || '');
          // completar meses sin dato con Actuals (litros → piezas)
          ac.forEach((m, j) => { const i = hIdx.get(m.key); if (existing.hist[i] == null) existing.hist[i] = existing.pac ? vals[j] / existing.pac : vals[j]; });
          return;
        }
        if (fcSheet && !vals.some((v) => v)) return; // combinación sin consumo y fuera del forecast: se ignora
        const pac = fcSheet ? pacFromDesc(get('desc')) : null;
        const conv = (v) => (fcSheet ? (pac ? v / pac : v) : v);
        const r = {
          key, client: String(get('client') || '').trim(), sku: String(get('sku') ?? '').trim(),
          productId: String(get('productId') || ''), shape: '', desc: String(get('desc') || '').trim(),
          group: String(get('group') || '').trim() || '(sin grupo)', kam: '', cls: '', pc: String(get('pc') || ''), type: '',
          pac: fcSheet ? pac : null, origin: fcSheet ? 'A' : 'F',
          hist: histMonths.map(() => null),
          plan: fcMonths.map(() => 0), stat: fcMonths.map(() => 0), cart: fcMonths.map(() => 0),
          hasPlan: false, hasStat: false,
        };
        ac.forEach((m, j) => { r.hist[hIdx.get(m.key)] = conv(vals[j]); });
        addRow(r);
      });
      if (!fcSheet) unit = 'L';
    }

    // KAM desde hoja auxiliar si no vino en la grilla (hoja "KAM": KAM | Cliente)
    if (rows.some((r) => !r.kam) && wb.Sheets.KAM) {
      const kmap = new Map();
      XLSX.utils.sheet_to_json(wb.Sheets.KAM, { header: 1, raw: true }).forEach((a) => { if (a && a[0] && a[1]) kmap.set(String(a[1]).trim(), String(a[0]).trim()); });
      rows.forEach((r) => { if (!r.kam && kmap.has(r.client)) r.kam = kmap.get(r.client); });
    }

    // Proyectos (oportunidades / vulnerabilidades) desde la hoja VULOPPS
    const projects = vulName && wb.Sheets[vulName] ? parseVulopps(XLSX.utils.sheet_to_json(wb.Sheets[vulName], { header: 1, raw: true, defval: null }), fcMonths) : [];

    const ms = Math.round(performance.now() - t0);
    return {
      projects,
      meta: {
        fileName: file.name, loadedAt: Date.now(), unit, histMonths, fcMonths,
        lastActual: histMonths[histMonths.length - 1],
        sheets: { forecast: fcSheet && fcSheet.name, actuals: actSheet && actSheet.name },
        hasPlan: rows.some((r) => r.hasPlan), hasStat: rows.some((r) => r.hasStat),
        hasPac: unit === 'pz', parseMs: ms,
      },
      rows,
    };
  }

  /* ===================================================================
     4. MOTOR DE ANÁLISIS
     Cada fila tiene dos niveles de cálculo (cálculo incremental):
       r._a = analyze(r)  → depende solo de la historia y las reglas
       r._e = evaluate(r) → depende del forecast; se recalcula por fila al editar
     =================================================================== */

  /** Volumen en litros de un valor de la fila (si la unidad base es piezas usa el PAC). */
  const toL = (r, v) => (state.meta.unit === 'pz' ? v * (r.pac || 0) : v);

  /** Historia sin los meses marcados como proyecto (limpieza de historia). */
  function cleanHist(r) {
    const ex = state.excl[r.id];
    if (!ex || !ex.length) return r.hist;
    return r.hist.map((v, i) => (ex.includes(state.meta.histMonths[i]) ? null : v));
  }

  function linreg(y) {
    const n = y.length; if (n < 2) return { slope: 0, intercept: y[0] || 0 };
    const xm = (n - 1) / 2, ym = mean(y);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xm) * (y[i] - ym); den += (i - xm) ** 2; }
    const slope = den ? num / den : 0;
    return { slope, intercept: ym - slope * xm };
  }
  function pearson(a, b) {
    const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return da && db ? n / Math.sqrt(da * db) : 0;
  }

  function analyze(r) {
    const hist = cleanHist(r); // meses marcados como proyecto quedan fuera (null)
    const S = state.settings, N = S.window, M = state.meta;
    // serie con datos (ignora meses null = sin información)
    const idx = []; const vals = [];
    hist.forEach((v, i) => { if (v != null) { idx.push(i); vals.push(v); } });
    const tail = vals.slice(-N);
    const avgN = mean(tail);
    const prevN = mean(vals.slice(-2 * N, -N));
    const avg3 = mean(vals.slice(-3));
    const last12 = vals.slice(-12), idx12 = idx.slice(-12);
    const avg12 = mean(last12);
    const sum12 = sum(last12);
    const { slope, intercept } = linreg(tail);
    const trendPct = avgN > 0 ? Math.max(-1, (slope * Math.max(tail.length - 1, 1)) / avgN) : 0; // cambio de la recta ajustada a lo largo de la ventana (mín. -100%)

    // Picos anormales: solo en consumidores regulares (≥6 meses con consumo en 12), para no
    // marcar como pico cada pedido de una demanda intermitente. Pico = > N × promedio del resto
    // y > promedio + 3 desvíos.
    const spikes = [];
    if (last12.filter((v) => v > 0).length >= 6) {
      last12.forEach((v, i) => {
        if (v <= 0) return;
        const others = last12.filter((_, j) => j !== i);
        const m = mean(others), sd = std(others);
        if (v > S.spikeFactor * Math.max(m, 1e-9) && v > m + 3 * sd) spikes.push(M.histMonths[idx12[i]]);
      });
    }

    // Estacionalidad básica: correlación con el mismo mes del año anterior + variabilidad
    let seasonal = false, seasR = 0; const sIdx = new Array(12).fill(1);
    const pairsA = [], pairsB = [];
    for (let i = hist.length - 1; i >= 12 && pairsA.length < 12; i--) {
      if (hist[i] != null && hist[i - 12] != null) { pairsA.push(hist[i]); pairsB.push(hist[i - 12]); }
    }
    if (pairsA.length >= 6 && avg12 > 0) {
      seasR = pearson(pairsA, pairsB);
      const cv = std(last12) / (avg12 || 1);
      seasonal = seasR >= 0.6 && cv >= 0.3;
      const allMean = mean(vals);
      if (seasonal && allMean > 0) {
        const byM = Array.from({ length: 12 }, () => []);
        hist.forEach((v, i) => { if (v != null) byM[+M.histMonths[i].slice(5) - 1].push(v); });
        byM.forEach((a, k) => { if (a.length) sIdx[k] = Math.min(3, Math.max(0.2, mean(a) / allMean)); });
      }
    }

    // Forecast sugerido para cada mes del horizonte
    const H = M.fcMonths.length;
    const raw = M.fcMonths.map((k, h) => {
      let v;
      switch (S.method) {
        case 'trend': v = Math.min(intercept + slope * (tail.length - 1 + h + 1), avgN * 3); break;
        case 'growth': v = avgN * (1 + (S.growthPct || 0) / 100); break;
        case 'seasonal': v = avgN * (seasonal ? sIdx[+k.slice(5) - 1] : 1); break;
        default: v = avgN;
      }
      return Math.max(0, v);
    });
    // Redondeo acumulado: 0,3 pz/mes → 0, 1, 0, 0, 1, 0… (conserva el total del horizonte
    // en lugar de redondear cada mes a 0)
    let acc = 0, done = 0;
    const sug = raw.map((v) => { acc += v; const c = Math.round(acc) - done; done += c; return c; });

    // Backtest del método: predice los últimos 3 meses con el promedio de los N anteriores
    let btErr = 0, btAct = 0; const btPred = [], btReal = [];
    if (vals.length >= N + 3) {
      const p = mean(vals.slice(-3 - N, -3));
      vals.slice(-3).forEach((a) => { btErr += Math.abs(a - p); btAct += a; btPred.push(p); btReal.push(a); });
    }

    // Estado: sin movimiento / intermitente (consume menos de 2 de cada 3 meses) / alza / baja / estable
    const nzTail = tail.filter((v) => v > 0).length;
    let status = 'flat';
    if (nzTail === 0) status = 'none';
    else if (nzTail < Math.ceil((tail.length * 2) / 3)) status = 'interm';
    else if (trendPct >= 0.5) status = 'up';
    else if (trendPct <= -0.5) status = 'down';

    return { avgN, prevN, avg3, avg12, sum12, slope, trendPct, spikes, seasonal, seasR, sIdx, sug, btErr, btAct, btPred, btReal, status, H };
  }

  const ALERT_TYPES = {
    DEV: 'Desvío vs histórico',
    NOHIST: 'Forecast sin consumo reciente',
    NOFC: 'Consumo sin forecast',
    SPIKE: 'Pico anormal',
    RISK: 'Riesgo de quiebre',
    PLAN: 'Cambio fuerte vs plan anterior',
  };

  /** Forecast final de una fila = base (estadístico + correcciones) + proyectos incluidos. */
  function finalArr(r) {
    const b = state.fc[r.id], p = state.projRow[r.id];
    return p ? b.map((v, i) => Math.max(0, v + p[i])) : b;
  }

  /**
   * Arma la capa de proyectos: cada proyecto con probabilidad ≥ umbral suma (OPP) o
   * resta (VUL) sus litros convertidos a piezas con el PAC de la fila cliente × SKU.
   * Si la combinación no existe en el forecast, se crea una fila nueva de origen "proyecto".
   */
  function buildProjLayer() {
    const M = state.meta; if (!M) return;
    state.projRow = {};
    const idx = new Map(state.rows.map((r) => [r.client + '|' + r.sku, r]));
    state.projects.forEach((p) => {
      p._incl = p.prob >= state.settings.projThreshold;
      let r = idx.get(p.client + '|' + p.sku);
      if (!r && p.client && p.sku) { r = createProjectRow(p); idx.set(p.client + '|' + p.sku, r); }
      p._row = r ? r.id : null;
      if (!r) return;
      const pac = M.unit === 'pz' ? r.pac || pacFromDesc(r.desc || p.desc) : 1;
      p._noPac = M.unit === 'pz' && !pac;
      if (!p._incl) return;
      const sign = p.type === 'VUL' ? -1 : 1;
      const pcs = cumRound(M.fcMonths.map((k) => (p.liters[k] || 0) / (pac || 1)));
      const arr = state.projRow[r.id] || (state.projRow[r.id] = M.fcMonths.map(() => 0));
      pcs.forEach((v, i) => (arr[i] += sign * v));
    });
  }
  function createProjectRow(p) {
    const M = state.meta, kam = (state.rows.find((x) => x.client === p.client && x.kam) || {}).kam || '';
    const r = {
      id: p.client + p.sku, key: p.client + p.sku, client: p.client, sku: p.sku, productId: '', shape: '', desc: p.desc || '(producto de proyecto)',
      group: (state.rows.find((x) => x.sku === p.sku) || {}).group || '(proyecto)', kam, cls: '', pc: '', type: '',
      pac: (state.rows.find((x) => x.sku === p.sku && x.pac) || {}).pac || pacFromDesc(p.desc), origin: 'P',
      hist: M.histMonths.map(() => 0), plan: M.fcMonths.map(() => 0), stat: M.fcMonths.map(() => 0), cart: M.fcMonths.map(() => 0), hasPlan: false, hasStat: false,
    };
    while (state.byId.has(r.id)) r.id += '#p';
    state.rows.push(r); state.byId.set(r.id, r);
    state.fc[r.id] = M.fcMonths.map(() => 0); state.manual[r.id] = M.fcMonths.map(() => 0);
    r._a = analyze(r);
    return r;
  }
  /** Recalcula la capa de proyectos y la evaluación de todas las filas. */
  function refreshProjects() {
    buildProjLayer();
    state.rows.forEach((r) => { if (!r._a) r._a = analyze(r); r._e = evaluate(r); });
    fillFilterOptions();
    touch(); state.dirty.add('grid'); state.dirty.add('projects');
  }

  function evaluate(r) {
    const a = r._a, S = state.settings, M = state.meta;
    const base = state.fc[r.id], proj = state.projRow[r.id] || null;
    const fc = finalArr(r);
    const H = fc.length, w = Math.min(H, S.window);
    const baseSum = sum(base), projSum = proj ? sum(proj) : 0;
    // el desvío vs histórico se mide sobre la BASE: los proyectos son volumen explicado
    const fcSum = sum(fc), fcAvgW = mean(base.slice(0, w)), fc3 = sum(fc.slice(0, 3));
    const dev = a.avgN > 0 ? fcAvgW / a.avgN - 1 : (fcAvgW > 0 ? Infinity : 0);
    const planSum = sum(r.plan);
    const devPlan = planSum > 0 ? fcSum / planSum - 1 : null;
    const alerts = [];
    const lim = S.alertPct / 100;
    if (a.avgN > 0 && Math.abs(dev) > lim) alerts.push({ t: 'DEV', sev: Math.abs(dev) > 2 * lim ? 'high' : 'med', msg: `Forecast ${fmtPct(dev)} vs promedio ${S.window}m (${fmt1(fcAvgW)} vs ${fmt1(a.avgN)} ${M.unit}/mes)` });
    if (a.avgN === 0 && baseSum > 0) alerts.push({ t: 'NOHIST', sev: /npi/i.test(r.cls) ? 'low' : 'med', msg: `Sin consumo en ${S.window} meses pero con forecast base ${fmt(baseSum)} ${M.unit}` + (/npi/i.test(r.cls) ? ' (NPI)' : '') });
    if (a.avgN > 0 && fc3 === 0) alerts.push({ t: 'NOFC', sev: 'high', msg: `Consume ${fmt1(a.avgN)} ${M.unit}/mes y no tiene forecast en los próximos 3 meses` });
    if (a.spikes.length) alerts.push({ t: 'SPIKE', sev: 'low', msg: 'Pico en ' + a.spikes.map(mLabel).join(', ') + ' (distorsiona el promedio)' });
    let risk = '';
    const cartOver = r.cart.findIndex((c, i) => c > 0 && c > fc[i]);
    if (cartOver >= 0) { risk = 'high'; alerts.push({ t: 'RISK', sev: 'high', msg: `Cartera ${fmt(r.cart[cartOver])} > forecast ${fmt(fc[cartOver])} en ${mLabel(M.fcMonths[cartOver])}` }); }
    else if (a.status !== 'interm' && a.avg3 > 0 && fc[0] < 0.6 * a.avg3) { risk = 'med'; alerts.push({ t: 'RISK', sev: 'med', msg: `Forecast de ${mLabel(M.fcMonths[0])} (${fmt(fc[0])}) < 60% del consumo de los últimos 3 meses (${fmt1(a.avg3)})` }); }
    if (devPlan != null && Math.abs(devPlan) > lim) alerts.push({ t: 'PLAN', sev: 'low', msg: `Total ${fmtPct(devPlan)} vs plan anterior (${fmt(fcSum)} vs ${fmt(planSum)})` });
    const man = state.manual[r.id];
    return {
      fcSum, fcAvgW, fc3, dev, planSum, devPlan, alerts, risk, fin: fc, baseSum, projSum,
      fcL: toL(r, fcSum), avgL: toL(r, a.avgN), projL: toL(r, projSum),
      locked: man ? man.reduce((s, v) => s + (v ? 1 : 0), 0) : 0,
      dead: a.sum12 === 0 && fcSum === 0 && planSum === 0 && !proj,
    };
  }

  function analyzeAll() { state.rows.forEach((r) => { r._a = analyze(r); }); buildProjLayer(); state.rows.forEach((r) => { if (!r._a) r._a = analyze(r); r._e = evaluate(r); }); }
  function evalRow(r) { r._e = evaluate(r); }

  /** Inicializa el forecast de trabajo para filas sin valores (nuevo archivo). */
  function initForecast(keepManual) {
    const S = state.settings;
    const prevFc = state.fc, prevMan = state.manual, prevMonths = keepManual && keepManual.months;
    state.fc = {}; state.manual = {};
    state.rows.forEach((r) => {
      const base = S.initFrom === 'plan' && r.hasPlan && sum(r.plan) > 0 ? r.plan.slice() : r._a.sug.slice();
      state.fc[r.id] = base; state.manual[r.id] = base.map(() => 0);
      // conservar valores manuales de la sesión anterior para los mismos meses
      if (prevMonths && prevMan[r.id]) {
        state.meta.fcMonths.forEach((k, i) => {
          const j = prevMonths.indexOf(k);
          if (j >= 0 && prevMan[r.id][j]) { state.fc[r.id][i] = prevFc[r.id][j]; state.manual[r.id][i] = 1; }
        });
      }
    });
  }

  /** Forecast accuracy: contra el último snapshot exportado (si ya hay reales) o backtest. */
  function accuracy(rows) {
    const M = state.meta;
    const snaps = loadSnaps();
    for (const s of snaps) {
      let err = 0, act = 0, n = 0;
      rows.forEach((r) => {
        const f = s.data[r.id]; if (!f) return;
        Object.entries(f).forEach(([k, fv]) => {
          if (k <= s.lastActual) return;
          const i = M.histMonths.indexOf(k); if (i < 0 || r.hist[i] == null) return;
          const av = toL(r, r.hist[i]); const fl = toL(r, fv);
          err += Math.abs(av - fl); act += av; n++;
        });
      });
      if (n && act > 0) return { value: Math.max(0, 1 - err / act), label: 'vs snapshot ' + new Date(s.createdAt).toLocaleDateString('es-AR'), real: true };
    }
    // Backtest: el promedio de N meses pronostica los últimos 3 meses reales.
    // Nivel fila (cliente × SKU, en litros) y nivel total (suma de la cartera filtrada por mes).
    let e = 0, a = 0; const tp = [0, 0, 0], ta = [0, 0, 0];
    rows.forEach((r) => {
      e += toL(r, r._a.btErr); a += toL(r, r._a.btAct);
      r._a.btPred.forEach((p, j) => { tp[j] += toL(r, p); ta[j] += toL(r, r._a.btReal[j]); });
    });
    const tot = sum(ta) ? Math.max(0, 1 - sum(ta.map((x, j) => Math.abs(x - tp[j]))) / sum(ta)) : null;
    const row = a > 0 ? Math.max(0, 1 - e / a) : null;
    return { value: tot, row, label: `Backtest 3 meses, total cartera · a nivel cliente × SKU: ${row == null ? '–' : nf0.format(row * 100) + '%'}`, real: false };
  }

  /* ===================================================================
     5. OPERACIONES DE FORECAST
     =================================================================== */

  /** Edición manual de una celda: queda bloqueada. Recalcula solo esa fila. */
  function setCell(id, i, value) {
    const r = state.byId.get(id); if (!r) return;
    state.fc[id][i] = Math.max(0, Math.round(value));
    state.manual[id][i] = 1;
    evalRow(r);
    touch();
  }

  function pushUndo(ids, label) {
    const snap = {};
    ids.forEach((id) => (snap[id] = { fc: state.fc[id].slice(), man: state.manual[id].slice() }));
    state.undo.push({ snap, label });
    if (state.undo.length > 20) state.undo.shift();
    $id('btnUndo').disabled = false;
  }
  function undo() {
    const u = state.undo.pop(); if (!u) return;
    Object.entries(u.snap).forEach(([id, s]) => { state.fc[id] = s.fc; state.manual[id] = s.man; evalRow(state.byId.get(id)); });
    $id('btnUndo').disabled = !state.undo.length;
    touch(); refreshGrid(true);
    toast('Deshecho: ' + u.label);
  }

  /**
   * Acción masiva sobre filas y rango de meses. Respeta celdas bloqueadas
   * (excepto bloquear/desbloquear). Devuelve cantidad de celdas modificadas.
   */
  function massApply(rows, action, from, to, param, onlyEmpty) {
    pushUndo(rows.map((r) => r.id), 'acción masiva');
    let n = 0;
    rows.forEach((r) => {
      const fc = state.fc[r.id], man = state.manual[r.id];
      for (let i = from; i <= to; i++) {
        if (action === 'lock') { if (!man[i]) { man[i] = 1; n++; } continue; }
        if (action === 'unlock') { if (man[i]) { man[i] = 0; n++; } continue; }
        if (man[i]) continue;
        if (onlyEmpty && fc[i] !== 0) continue;
        let v = fc[i];
        switch (action) {
          case 'suggested': v = r._a.sug[i]; break;
          case 'plan': v = r.plan[i]; break;
          case 'stat': v = r.stat[i]; break;
          case 'prev': v = i === 0 ? lastActualValue(r) : fc[i - 1]; break;
          case 'pct': v = fc[i] * (1 + param / 100); break;
          case 'value': v = param; break;
          case 'zero': v = 0; break;
        }
        v = Math.max(0, Math.round(v || 0));
        if (v !== fc[i]) { fc[i] = v; n++; }
      }
      evalRow(r);
    });
    touch();
    return n;
  }
  const lastActualValue = (r) => { for (let i = r.hist.length - 1; i >= 0; i--) if (r.hist[i] != null) return r.hist[i]; return 0; };

  /* ===================================================================
     6. FILTROS
     =================================================================== */
  function matchStatus(r, st) {
    const a = r._a, e = r._e;
    switch (st) {
      case 'alert': return e.alerts.length > 0;
      case 'up': case 'down': case 'none': case 'interm': case 'flat': return a.status === st;
      case 'spike': return a.spikes.length > 0;
      case 'seasonal': return a.seasonal;
      case 'risk': return !!e.risk;
      case 'locked': return e.locked > 0;
      case 'proj': return !!e.projSum;
      case 'excl': return !!(state.excl[r.id] && state.excl[r.id].length);
      default: return true;
    }
  }
  function filteredRows() {
    const f = state.filters;
    const words = norm(f.text) ? f.text.split(/\s+/).map(norm).filter(Boolean) : [];
    return state.rows.filter((r) => {
      if (f.client && r.client !== f.client) return false;
      if (f.kam && r.kam !== f.kam) return false;
      if (f.group && r.group !== f.group) return false;
      if (f.cls && (r.cls || '(sin clase)') !== f.cls) return false;
      if (f.hideDead && r._e.dead) return false;
      if (f.status && !matchStatus(r, f.status)) return false;
      if (words.length) {
        const hay = r._s || (r._s = norm(r.desc + ' ' + r.sku + ' ' + r.productId + ' ' + r.shape + ' ' + r.key));
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }

  function fillFilterOptions() {
    const opts = (field, mapFn) => {
      const vals = [...new Set(state.rows.map(mapFn || ((r) => r[field])))].filter((v) => v !== '').sort();
      return '<option value="">Todos</option>' + vals.map((v) => `<option>${esc(v)}</option>`).join('');
    };
    $id('fClient').innerHTML = opts('client');
    $id('fKam').innerHTML = opts('kam');
    $id('fGroup').innerHTML = opts('group');
    $id('fClass').innerHTML = opts('cls', (r) => r.cls || '(sin clase)');
    syncFilterInputs();
  }
  function syncFilterInputs() {
    const f = state.filters;
    $id('fClient').value = f.client; $id('fKam').value = f.kam; $id('fGroup').value = f.group;
    $id('fClass').value = f.cls; $id('fText').value = f.text; $id('fStatus').value = f.status; $id('fHideDead').checked = f.hideDead;
  }
  function onFiltersChanged() {
    ['dashboard', 'grid', 'monthly', 'clients', 'products', 'alerts', 'projects'].forEach((v) => state.dirty.add(v));
    renderView();
  }

  /* ===================================================================
     7. VISTAS
     =================================================================== */
  const VIEW_TITLES = {
    dashboard: ['Dashboard', 'Indicadores y evolución del forecast'],
    grid: ['Forecast', 'Carga y ajuste del forecast por cliente y producto'],
    monthly: ['Vista mensual', 'Un mes de forecast contra todas sus referencias'],
    clients: ['Resumen por cliente', ''],
    products: ['Resumen por producto', ''],
    alerts: ['Alertas', 'Diferencias importantes, riesgos y picos'],
    projects: ['Proyectos', 'Oportunidades y vulnerabilidades (VULOPPS) que se suman al forecast estadístico'],
    settings: ['Configuración', 'Reglas de cálculo, configuración y datos locales'],
  };

  function showView(v) {
    if (!state.meta && v !== 'settings') v = 'empty';
    state.view = v;
    document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + v));
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    const t = VIEW_TITLES[v] || ['Cargar archivo', 'Forecast mensual de consumo'];
    $id('viewTitle').textContent = t[0];
    $id('viewSubtitle').textContent = t[1] || (state.meta ? `Último mes real: ${mLabel(state.meta.lastActual)} · Horizonte: ${mLabel(state.meta.fcMonths[0])} a ${mLabel(state.meta.fcMonths.at(-1))}` : '');
    $id('filters').hidden = !state.meta || v === 'settings' || v === 'projects';
    $id('btnFilters').hidden = $id('filters').hidden;
    $id('sidebar').classList.remove('open');
    state.dirty.add(v);
    renderView();
  }

  function renderView() {
    const v = state.view;
    const rows = state.meta ? filteredRows() : [];
    if (state.meta) $id('fCount').textContent = `${nf0.format(rows.length)} de ${nf0.format(state.rows.length)} combinaciones cliente × producto`;
    if (!state.dirty.has(v)) return;
    state.dirty.delete(v);
    if (v === 'dashboard') renderDashboard(rows);
    else if (v === 'grid') refreshGrid(false, rows);
    else if (v === 'monthly') renderMonthly(rows);
    else if (v === 'clients') renderClients(rows);
    else if (v === 'products') renderProducts(rows);
    else if (v === 'alerts') renderAlerts(rows);
    else if (v === 'settings') renderSettings();
    else if (v === 'projects') renderProjects();
  }

  function updateAlertBadge() {
    const n = state.rows.reduce((s, r) => s + (r._e && r._e.alerts.some((a) => a.sev !== 'low') ? 1 : 0), 0);
    $id('navAlertCount').textContent = nf0.format(n);
    const np = state.projects.filter((p) => p._incl).length;
    $id('navProjCount').textContent = np; $id('navProjCount').hidden = !np;
  }

  /* ---------- 7.1 Dashboard ---------- */
  const charts = {};
  const BRAND = { navy: '#003A70', sky: '#008BC5', purple: '#542C97', ultra: '#000394', fuchsia: '#E0457A', violet: '#A8269A', navyL: '#8CB6D9', skyL: '#A3DDF5', purpleL: '#A290C2', fuchsiaL: '#FFB3D4', grayD: '#868688', grayL: '#B7B9BA' };
  Chart.defaults.font.family = 'Arial, Helvetica, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#4b5563';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;

  function chart(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($id(id), config);
    return charts[id];
  }

  function kpi(label, value, foot, cls) {
    return `<div class="kpi ${cls || ''}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot || ''}</div></div>`;
  }

  function renderDashboard(rows) {
    const M = state.meta, S = state.settings, H = M.fcMonths.length;
    const uL = M.unit === 'pz' ? 'L' : M.unit;
    let next = 0, projH = 0, projRows = 0, avgL = 0, horizon = 0, plan = 0, planHas = false, alerts = 0, alertsMain = 0, alertsHigh = 0, risk = 0, riskHigh = 0, none = 0, lockedRows = 0, lockedCells = 0, active = 0;
    rows.forEach((r) => {
      const a = r._a, e = r._e, fc = e.fin;
      next += toL(r, fc[0]); projH += e.projL; if (e.projSum) projRows++; avgL += e.avgL; horizon += e.fcL; plan += toL(r, e.planSum); if (r.hasPlan) planHas = true;
      if (e.alerts.length) alerts++;
      if (e.alerts.some((x) => x.sev !== 'low')) alertsMain++;
      if (e.alerts.some((x) => x.sev === 'high')) alertsHigh++;
      if (e.risk) { risk++; if (e.risk === 'high') riskHigh++; }
      if (a.status === 'none') none++;
      if (e.locked) { lockedRows++; lockedCells += e.locked; }
      if (a.avgN > 0 || e.fcSum > 0) active++;
    });
    const acc = accuracy(rows);
    $id('kpis').innerHTML = [
      kpi(`Forecast ${mLabel(M.fcMonths[0])}`, fmt(next) + ' ' + uL, `<span class="${pctClass(next / avgL - 1)}">${fmtPct(avgL ? next / avgL - 1 : null)}</span> vs promedio ${S.window} meses`),
      kpi(`Forecast ${H} meses`, fmt(horizon) + ' ' + uL, planHas ? `<span class="${pctClass(horizon / plan - 1)}">${fmtPct(plan ? horizon / plan - 1 : null)}</span> vs plan anterior (${fmt(plan)})` : 'sin plan anterior en el archivo', 'k-sky'),
      kpi(`Promedio ${S.window} meses`, fmt(avgL) + ' ' + uL + '/mes', `Último real ${mLabel(M.lastActual)}: ${fmt(sum(rows.map((r) => toL(r, r.hist.at(-1) || 0))))} ${uL}`, 'k-purple'),
      kpi(`Proyectos VULOPPS ≥${S.projThreshold}%`, (projH >= 0 ? '+' : '') + fmt(projH) + ' ' + uL, `${nf0.format(projRows)} productos con proyecto · ${horizon ? nf0.format((projH / horizon) * 100) : 0}% del forecast`, 'k-violet'),
      kpi('Forecast accuracy', acc.value == null ? '–' : nf0.format(acc.value * 100) + '%', acc.label, 'k-sky'),
      kpi('Alertas a revisar', nf0.format(alertsMain), `${nf0.format(alertsHigh)} de severidad alta · ${nf0.format(alerts - alertsMain)} solo informativas`, 'k-fuchsia'),
      kpi('Riesgo de quiebre', nf0.format(risk), `${nf0.format(riskHigh)} con cartera > forecast`, 'k-violet'),
      kpi('Sin movimiento', nf0.format(none), `de ${nf0.format(rows.length)} combinaciones (${nf0.format(active)} activas)`, 'k-gray'),
      kpi('Valores manuales', nf0.format(lockedCells), `celdas bloqueadas en ${nf0.format(lockedRows)} filas`),
    ].join('');
    $id('trendUnitNote').textContent = `en ${uL === 'L' ? 'litros' : uL} · historia de ${Math.min(12, M.histMonths.length)} meses + horizonte de forecast`;

    // Evolución mensual: real + forecast + plan + estadístico
    const hm = M.histMonths.slice(-12), hOff = M.histMonths.length - hm.length;
    const labels = [...hm, ...M.fcMonths].map(mLabel);
    const real = hm.map((_, j) => sum(rows.map((r) => toL(r, r.hist[hOff + j] || 0))));
    const fcT = M.fcMonths.map((_, i) => sum(rows.map((r) => toL(r, state.fc[r.id][i]))));
    const projT = M.fcMonths.map((_, i) => sum(rows.map((r) => (state.projRow[r.id] ? toL(r, r._e.fin[i] - state.fc[r.id][i]) : 0))));
    const planT = M.fcMonths.map((_, i) => sum(rows.map((r) => toL(r, r.plan[i]))));
    const statT = M.fcMonths.map((_, i) => sum(rows.map((r) => toL(r, r.stat[i]))));
    const pad = hm.map(() => null);
    const avgLine = labels.map(() => avgL);
    const ds = [
      { type: 'bar', label: 'Real', data: [...real, ...M.fcMonths.map(() => null)], backgroundColor: BRAND.navy, borderRadius: 3, order: 3 },
      { type: 'bar', label: 'Forecast base', data: [...pad, ...fcT], backgroundColor: BRAND.sky, borderRadius: 3, order: 3, stack: 'f' },
    ];
    if (projT.some((v) => v)) ds.push({ type: 'bar', label: `Proyectos ≥${S.projThreshold}%`, data: [...pad, ...projT], backgroundColor: BRAND.violet, borderRadius: 3, order: 3, stack: 'f' });
    ds[0].stack = 'r';
    if (M.hasPlan) ds.push({ type: 'line', label: 'Plan anterior (DMR)', data: [...pad, ...planT], borderColor: BRAND.purple, borderDash: [6, 4], pointRadius: 2, borderWidth: 2, order: 1 });
    if (M.hasStat) ds.push({ type: 'line', label: 'Estadístico', data: [...pad, ...statT], borderColor: BRAND.grayD, borderDash: [2, 3], pointRadius: 0, borderWidth: 2, order: 1 });
    ds.push({ type: 'line', label: `Promedio ${S.window}m`, data: avgLine, borderColor: BRAND.fuchsia, borderWidth: 1.5, pointRadius: 0, order: 0 });
    const trendOpts = baseOpts({ tooltipUnit: uL }); trendOpts.scales.x.stacked = true; trendOpts.scales.y.stacked = false;
    chart('chTrend', { data: { labels, datasets: ds }, options: trendOpts });

    // Por cliente: promedio histórico vs forecast promedio 3 meses
    const byCli = groupBy(rows, (r) => r.client);
    const cli = [...byCli.entries()].map(([k, rs]) => ({ k, avg: sum(rs.map((r) => r._e.avgL)), fc: sum(rs.map((r) => toL(r, sum(r._e.fin.slice(0, 3))) / 3)) }))
      .sort((a, b) => b.fc + b.avg - a.fc - a.avg).slice(0, 12);
    chart('chClients', {
      type: 'bar',
      data: { labels: cli.map((c) => c.k.replace(/^M&P ARG /, '')), datasets: [
        { label: `Promedio ${S.window}m`, data: cli.map((c) => c.avg), backgroundColor: BRAND.navyL, borderRadius: 3 },
        { label: 'Forecast próx. 3 meses (prom.)', data: cli.map((c) => c.fc), backgroundColor: BRAND.navy, borderRadius: 3 },
      ] },
      options: { ...baseOpts({ tooltipUnit: uL, horizontal: true }), onClick: (_, el) => { if (el[0]) goFiltered({ client: cli[el[0].index].k }); } },
    });

    // Variaciones por grupo (forecast promedio vs promedio histórico)
    const grp = [...groupBy(rows, (r) => r.group).entries()].map(([k, rs]) => {
      const avg = sum(rs.map((r) => r._e.avgL)), f = sum(rs.map((r) => toL(r, r._e.fcAvgW)));
      return { k, diff: f - avg, pct: avg ? f / avg - 1 : null };
    }).filter((g) => Math.abs(g.diff) > 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10);
    chart('chGroups', {
      type: 'bar',
      data: { labels: grp.map((g) => g.k), datasets: [{ label: `Diferencia ${uL}/mes`, data: grp.map((g) => g.diff), backgroundColor: grp.map((g) => (g.diff >= 0 ? BRAND.sky : BRAND.fuchsia)), borderRadius: 3 }] },
      options: { ...baseOpts({ tooltipUnit: uL, horizontal: true }), plugins: { legend: { display: false }, tooltip: tooltipOpts(uL, (i) => 'Variación: ' + fmtPct(grp[i].pct)) }, onClick: (_, el) => { if (el[0]) goFiltered({ group: grp[el[0].index].k }); } },
    });

    // Alertas por tipo
    const at = {}; rows.forEach((r) => r._e.alerts.forEach((x) => (at[x.t] = (at[x.t] || 0) + 1)));
    const atK = Object.keys(at);
    chart('chAlerts', {
      type: 'doughnut',
      data: { labels: atK.map((k) => ALERT_TYPES[k]), datasets: [{ data: atK.map((k) => at[k]), backgroundColor: [BRAND.fuchsia, BRAND.violet, BRAND.purple, BRAND.sky, BRAND.navy, BRAND.grayL], borderWidth: 1 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' } }, onClick: () => showView('alerts') },
    });

    // Estado de productos
    const st = { up: 0, flat: 0, down: 0, interm: 0, none: 0 }; rows.forEach((r) => st[r._a.status]++);
    const stK = ['up', 'flat', 'down', 'interm', 'none'];
    chart('chStatus', {
      type: 'doughnut',
      data: { labels: ['En alza', 'Estable', 'En baja', 'Intermitente', 'Sin movimiento'], datasets: [{ data: stK.map((k) => st[k]), backgroundColor: [BRAND.sky, BRAND.navyL, BRAND.fuchsia, BRAND.purpleL, BRAND.grayL], borderWidth: 1 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' } }, onClick: (_, el) => { if (el[0]) goFiltered({ status: stK[el[0].index], hideDead: stK[el[0].index] !== 'none' }); } },
    });
  }

  function tooltipOpts(unit, extra) {
    return { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.x != null && c.chart.options.indexAxis === 'y' ? c.parsed.x : c.parsed.y)} ${unit}`, afterLabel: extra ? (c) => extra(c.dataIndex) : undefined } };
  }
  function baseOpts({ tooltipUnit, horizontal }) {
    const val = { grid: { color: '#eef1f5' }, ticks: { callback: (v) => nf0.format(v) } }, cat = { grid: { display: false } };
    return {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      indexAxis: horizontal ? 'y' : 'x',
      plugins: { tooltip: tooltipOpts(tooltipUnit) },
      scales: horizontal ? { x: val, y: cat } : { x: cat, y: val },
    };
  }
  function groupBy(rows, fn) { const m = new Map(); rows.forEach((r) => { const k = fn(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; }
  function goFiltered(patch) {
    Object.assign(state.filters, { client: '', kam: '', group: '', cls: '', text: '', status: '' }, patch);
    syncFilterInputs(); onFiltersChanged(); showView('grid');
  }

  /* ---------- 7.2 Grilla de forecast (DataTables) ---------- */
  let grid = null, gridCols = null;

  function cellClassFc(r, v) {
    const ref = r._a.avgN;
    if (ref === 0) return v > 0 ? 'v-up' : 'v-zero';
    const d = v / ref - 1;
    return d > 0.15 ? 'v-up' : d < -0.15 ? (v === 0 ? 'v-down v-zero' : 'v-down') : '';
  }
  function statusBadges(r) {
    const a = r._a; let h = '';
    if (a.status === 'up') h += '<span class="badge b-up">▲ alza</span>';
    else if (a.status === 'down') h += '<span class="badge b-down">▼ baja</span>';
    else if (a.status === 'none') h += '<span class="badge b-none">sin mov.</span>';
    else if (a.status === 'interm') h += '<span class="badge b-seas" title="Consume menos de 2 de cada 3 meses: el promedio es poco representativo">intermitente</span>';
    if (a.seasonal) h += '<span class="badge b-seas" title="Correlación con el mismo mes del año anterior: ' + a.seasR.toFixed(2) + '">estacional</span>';
    if (a.spikes.length) h += '<span class="badge b-spike" title="Pico en ' + a.spikes.map(mLabel).join(', ') + '">pico</span>';
    if (r.origin === 'A') h += '<span class="badge b-flat" title="Combinación con consumo en Actuals que no está en la hoja Forecast. PAC estimado desde la descripción.">solo Actuals</span>';
    return h;
  }
  function alertBadge(r) {
    const e = r._e; if (!e.alerts.length) return '';
    const sev = e.alerts.some((x) => x.sev === 'high') ? 'b-high' : e.alerts.some((x) => x.sev === 'med') ? 'b-med' : 'b-low';
    return `<span class="badge ${sev}" title="${esc(e.alerts.map((x) => '• ' + x.msg).join('\n'))}">⚠ ${e.alerts.length}</span>` + (e.risk ? '<span class="badge b-risk" title="Riesgo de quiebre">quiebre</span>' : '');
  }

  function buildGridColumns() {
    const M = state.meta, S = state.settings;
    const hv = Math.min(S.histVisible, M.histMonths.length), hOff = M.histMonths.length - hv;
    const cols = [];
    cols.push({ title: '<input type="checkbox" id="selAll" title="Seleccionar filas visibles">', data: null, orderable: false, className: 'stk c-sel', render: (r) => `<input type="checkbox" class="rsel" data-id="${esc(r.id)}"${state.selected.has(r.id) ? ' checked' : ''}>` });
    cols.push({ title: '', data: null, orderable: false, className: 'stk c-edit', render: (r) => `<button class="ico-btn" data-fmrow="${esc(r.id)}" title="Ingresar forecast con la curva histórica (pop-up)">✎</button>` });
    cols.push({ title: 'Cliente', data: 'client', className: 'stk c-cli', render: (v, t) => (t === 'display' ? `<span class="cli-name" title="${esc(v)}">${esc(v.replace(/^M&P ARG /, ''))}</span>` : v) });
    cols.push({ title: 'SKU', data: 'sku', className: 'stk c-sku' });
    cols.push({ title: 'Descripción', data: 'desc', className: 'desc', render: (v, t, r) => (t === 'display' ? `<a class="lnk" data-detail="${esc(r.id)}" title="${esc(v)}">${esc(v)}</a>` : v) });
    cols.push({ title: 'Grupo', data: 'group' });
    cols.push({ title: 'KAM', data: 'kam' });
    if (M.hasPac) cols.push({ title: 'PAC', data: 'pac', className: 'num', render: (v) => (v ? fmt1(v) : '–') });
    for (let j = 0; j < hv; j++) {
      const i = hOff + j, k = M.histMonths[i];
      cols.push({
        title: mLabel(k), data: null, className: 'num hist' + (j === 0 ? ' sep' : ''), orderSequence: ['desc', 'asc'],
        render: (r, t) => {
          const v = r.hist[i];
          if (t !== 'display') return v || 0;
          const ex = state.excl[r.id] && state.excl[r.id].includes(k);
          const cls = ex ? 'v-excl' : v == null ? 'v-zero' : r._a.spikes.includes(k) ? 'v-spike' : v === 0 ? 'v-zero' : '';
          return `<span class="${cls}">${v == null ? '·' : fmt(v)}</span>`;
        },
      });
    }
    cols.push({ title: `Prom ${S.window}m`, data: null, className: 'num sep', orderSequence: ['desc', 'asc'], render: (r, t) => (t === 'display' ? `<b>${fmt1(r._a.avgN)}</b>` : r._a.avgN), _calc: true });
    cols.push({ title: 'Tend.', data: null, className: 'num trend', orderSequence: ['desc', 'asc'], render: (r, t) => {
      const p = r._a.trendPct; if (t !== 'display') return p;
      if (r._a.status === 'none') return '<span class="v-zero">–</span>';
      if (r._a.status === 'interm') return `<span class="muted" title="Demanda intermitente: tendencia poco confiable">${fmtPct(p)}</span>`;
      return `<span class="${pctClass(p)}" title="Variación ajustada en ${S.window} meses">${p > 0.05 ? '▲' : p < -0.05 ? '▼' : '▬'} ${fmtPct(p)}</span>`;
    }, _calc: true });
    cols.push({ title: 'Estado', data: null, orderable: false, render: (r, t) => (t === 'display' ? statusBadges(r) : r._a.status), _calc: true });
    M.fcMonths.forEach((k, i) => {
      cols.push({
        title: mLabel(k), data: null, className: 'num fc fcm' + (i === 0 ? ' sep' : ''), orderSequence: ['desc', 'asc'], _fc: i,
        render: (r, t) => {
          const v = state.fc[r.id][i];
          if (t !== 'display') return v;
          const man = state.manual[r.id][i];
          const tip = `Sugerido: ${fmt(r._a.sug[i])}` + (r.hasPlan ? ` · Plan anterior: ${fmt(r.plan[i])}` : '') + (r.hasStat ? ` · Estadístico: ${fmt(r.stat[i])}` : '') + (r.cart[i] ? ` · Cartera: ${fmt(r.cart[i])}` : '') + (man ? ' · 🔒 bloqueado' : '');
          const pj = state.projRow[r.id] && state.projRow[r.id][i];
          const pjTag = pj ? `<span class="pj ${pj < 0 ? 'neg' : ''}" title="Proyectos VULOPPS incluidos en este mes. Forecast final = ${fmt(Math.max(0, v + pj))}">${pj > 0 ? '+' : ''}${fmt(pj)}</span>` : '';
          return `<input class="fc-in ${cellClassFc(r, v)}${man ? ' manual' : ''}" data-id="${esc(r.id)}" data-m="${i}" value="${fmt(v)}" title="${esc(tip + ' · Base (sin proyectos)')}" inputmode="decimal">${pjTag}`;
        },
      });
    });
    if (state.projects.length) cols.push({ title: 'Proy.', data: null, className: 'num sep', orderSequence: ['desc', 'asc'], render: (r, t) => (t === 'display' ? (r._e.projSum ? `<span class="pj ${r._e.projSum < 0 ? 'neg' : ''}">${r._e.projSum > 0 ? '+' : ''}${fmt(r._e.projSum)}</span>` : '') : r._e.projSum), _calc: true });
    cols.push({ title: state.projects.length ? 'Total final' : 'Total', data: null, className: 'num' + (state.projects.length ? '' : ' sep'), orderSequence: ['desc', 'asc'], render: (r, t) => (t === 'display' ? `<b>${fmt(r._e.fcSum)}</b>` : r._e.fcSum), _calc: true });
    if (M.hasPac) cols.push({ title: 'Total L', data: null, className: 'num', orderSequence: ['desc', 'asc'], render: (r, t) => (t === 'display' ? fmt(r._e.fcL) : r._e.fcL), _calc: true });
    cols.push({ title: 'Var. vs prom', data: null, className: 'num', orderSequence: ['desc', 'asc'], render: (r, t) => {
      const d = r._e.dev; if (t !== 'display') return isFinite(d) ? d : 999;
      return `<span class="${pctClass(d)}">${isFinite(d) ? fmtPct(d) : 'nuevo'}</span>`;
    }, _calc: true });
    if (M.hasPlan) cols.push({ title: 'Var. vs plan', data: null, className: 'num', orderSequence: ['desc', 'asc'], render: (r, t) => {
      const d = r._e.devPlan; if (t !== 'display') return d == null ? -999 : d;
      return `<span class="${pctClass(d)}">${fmtPct(d)}</span>`;
    }, _calc: true });
    cols.push({ title: 'Alertas', data: null, orderSequence: ['desc', 'asc'], render: (r, t) => (t === 'display' ? alertBadge(r) : r._e.alerts.length * 10 + (r._e.risk ? 5 : 0)), _calc: true });
    return cols;
  }

  /** Crea o refresca la grilla. rebuild=true fuerza reconstruir columnas. */
  function refreshGrid(rebuild, rows) {
    if (state.view !== 'grid') { state.dirty.add('grid'); return; }
    rows = rows || filteredRows();
    if (rebuild && grid) { grid.destroy(); $('#tblGrid').empty(); grid = null; }
    if (!grid) {
      gridCols = buildGridColumns();
      const totalLIdx = gridCols.findIndex((c) => c.title === 'Total L');
      grid = $('#tblGrid').DataTable({
        data: rows, columns: gridCols, deferRender: true, pageLength: 50, lengthMenu: [25, 50, 100, 250, 500],
        order: [[2, 'asc'], [totalLIdx > 0 ? totalLIdx : gridCols.findIndex((c) => /^Total/.test(c.title)), 'desc']],
        rowId: (r) => 'row-' + r.id, autoWidth: false,
        language: dtLang(),
        dom: 'rtip<"dt-bottom"l>',
      });
      fillMonthSelectors();
    } else {
      grid.clear(); grid.rows.add(rows); grid.draw(false);
    }
  }

  /** Re-renderiza solo las celdas calculadas de una fila (y la celda editada). */
  function refreshGridRow(id, editedM) {
    if (!grid) return;
    const row = grid.row('#row-' + id);
    if (!row.any()) return;
    gridCols.forEach((c, ci) => { if (c._calc || (editedM != null && c._fc === editedM)) grid.cell(row.index(), ci).invalidate('data'); });
  }

  function dtLang() {
    return {
      emptyTable: 'Sin datos para los filtros elegidos', info: '_START_–_END_ de _TOTAL_', infoEmpty: '0 filas', infoFiltered: '',
      lengthMenu: 'Mostrar _MENU_ filas', paginate: { first: '«', last: '»', next: '›', previous: '‹' }, zeroRecords: 'Sin resultados',
    };
  }

  function fillMonthSelectors() {
    const o = state.meta.fcMonths.map((k, i) => `<option value="${i}">${mLabel(k)}</option>`).join('');
    $id('mFrom').innerHTML = o; $id('mTo').innerHTML = o;
    $id('mFrom').value = 0; $id('mTo').value = state.meta.fcMonths.length - 1;
    $id('monthSel').innerHTML = o;
  }

  /** Commit de una celda editada en grilla o vista mensual. */
  function commitInput(inp) {
    const id = inp.dataset.id, i = +inp.dataset.m;
    const r = state.byId.get(id); if (!r) return;
    const v = parseNum(inp.value);
    if (isNaN(v) || v < 0) { inp.value = fmt(state.fc[id][i]); toast('Valor inválido: se esperaba un número ≥ 0', true); return; }
    if (Math.round(v) === state.fc[id][i] && state.manual[id][i]) { inp.value = fmt(state.fc[id][i]); return; }
    pushUndo([id], 'edición');
    setCell(id, i, v);
    // refresco incremental: solo la fila editada
    inp.value = fmt(state.fc[id][i]);
    inp.className = 'fc-in ' + cellClassFc(r, state.fc[id][i]) + ' manual';
    if (inp.closest('#tblGrid')) refreshGridRow(id, null);
    else { state.dirty.add('grid'); refreshMonthRow(id); }
  }

  /* ---------- 7.3 Vista mensual ---------- */
  let monthTbl = null;
  function renderMonthly(rows) {
    const M = state.meta, S = state.settings;
    if (!$id('monthSel').options.length) fillMonthSelectors();
    const i = +$id('monthSel').value || 0, k = M.fcMonths[i];
    const ly = M.histMonths.indexOf(addMonths(k, -12));
    const n = (fn) => (r, t) => { const v = fn(r); return t === 'display' ? fmt(v) : v; };
    const cols = [
      { title: 'Cliente', data: 'client', render: (v, t) => (t === 'display' ? esc(v.replace(/^M&P ARG /, '')) : v) },
      { title: 'SKU', data: 'sku' },
      { title: 'Descripción', data: 'desc', className: 'desc', render: (v, t, r) => (t === 'display' ? `<a class="lnk" data-detail="${esc(r.id)}">${esc(v)}</a>` : v) },
      { title: 'Grupo', data: 'group' },
      { title: ly >= 0 ? `Real ${mLabel(M.histMonths[ly])}` : 'Año anterior', data: null, className: 'num hist', render: n((r) => (ly >= 0 && r.hist[ly] != null ? r.hist[ly] : 0)) },
      { title: `Prom ${S.window}m`, data: null, className: 'num', render: (r, t) => (t === 'display' ? fmt1(r._a.avgN) : r._a.avgN) },
      { title: 'Sugerido', data: null, className: 'num', render: n((r) => r._a.sug[i]) },
    ];
    if (M.hasPlan) cols.push({ title: 'Plan anterior', data: null, className: 'num', render: n((r) => r.plan[i]) });
    if (M.hasStat) cols.push({ title: 'Estadístico', data: null, className: 'num', render: n((r) => r.stat[i]) });
    if (rows.some((r) => r.cart[i])) cols.push({ title: 'Cartera', data: null, className: 'num', render: n((r) => r.cart[i]) });
    cols.push({ title: 'Forecast ' + mLabel(k), data: null, className: 'num fc fcm sep', _fc: true, orderSequence: ['desc', 'asc'], render: (r, t) => {
      const v = state.fc[r.id][i]; if (t !== 'display') return v;
      return `<input class="fc-in ${cellClassFc(r, v)}${state.manual[r.id][i] ? ' manual' : ''}" data-id="${esc(r.id)}" data-m="${i}" value="${fmt(v)}" inputmode="decimal">`;
    } });
    if (state.projects.length) {
      cols.push({ title: 'Proyectos', data: null, className: 'num', _calc: true, render: (r, t) => { const v = state.projRow[r.id] ? state.projRow[r.id][i] : 0; return t === 'display' ? (v ? `<span class="pj ${v < 0 ? 'neg' : ''}">${v > 0 ? '+' : ''}${fmt(v)}</span>` : '') : v; } });
      cols.push({ title: 'Final', data: null, className: 'num', _calc: true, render: (r, t) => (t === 'display' ? `<b>${fmt(r._e.fin[i])}</b>` : r._e.fin[i]) });
    }
    cols.push({ title: 'Var. vs prom', data: null, className: 'num', _calc: true, render: (r, t) => { const d = r._a.avgN ? state.fc[r.id][i] / r._a.avgN - 1 : null; return t === 'display' ? `<span class="${pctClass(d)}">${fmtPct(d)}</span>` : d ?? -999; } });
    if (M.hasPlan) cols.push({ title: 'Var. vs plan', data: null, className: 'num', _calc: true, render: (r, t) => { const d = r.plan[i] ? r._e.fin[i] / r.plan[i] - 1 : null; return t === 'display' ? `<span class="${pctClass(d)}">${fmtPct(d)}</span>` : d ?? -999; } });
    if (monthTbl) { monthTbl.destroy(); $('#tblMonth').empty(); }
    monthTbl = $('#tblMonth').DataTable({ data: rows, columns: cols, deferRender: true, pageLength: 50, order: [[cols.findIndex((c) => c._fc), 'desc']], rowId: (r) => 'mrow-' + r.id, language: dtLang(), dom: 'rtip<"dt-bottom"l>', autoWidth: false });
    monthTbl._cols = cols;

    // KPIs del mes
    const fcT = sum(rows.map((r) => toL(r, r._e.fin[i])));
    const avgT = sum(rows.map((r) => r._e.avgL));
    const planT = sum(rows.map((r) => toL(r, r.plan[i])));
    const lyT = ly >= 0 ? sum(rows.map((r) => toL(r, r.hist[ly] || 0))) : null;
    const u = M.unit === 'pz' ? 'L' : M.unit;
    $id('monthKpis').innerHTML = [
      kpi('Forecast ' + mLabel(k), fmt(fcT) + ' ' + u, ''),
      kpi('vs promedio', `<span class="${pctClass(fcT / avgT - 1)}">${fmtPct(avgT ? fcT / avgT - 1 : null)}</span>`, fmt(avgT) + ' ' + u, 'k-purple'),
      M.hasPlan ? kpi('vs plan anterior', `<span class="${pctClass(fcT / planT - 1)}">${fmtPct(planT ? fcT / planT - 1 : null)}</span>`, fmt(planT) + ' ' + u, 'k-sky') : '',
      lyT != null ? kpi('vs mismo mes año ant.', `<span class="${pctClass(fcT / lyT - 1)}">${fmtPct(lyT ? fcT / lyT - 1 : null)}</span>`, fmt(lyT) + ' ' + u, 'k-gray') : '',
    ].join('');
  }
  function refreshMonthRow(id) {
    if (!monthTbl) return;
    const row = monthTbl.row('#mrow-' + id); if (!row.any()) return;
    monthTbl._cols.forEach((c, ci) => { if (c._calc) monthTbl.cell(row.index(), ci).invalidate('data'); });
  }

  /* ---------- 7.4 Resúmenes ---------- */
  let cliTbl = null, prodTbl = null, alertTbl = null;
  function numCol(title, fn, opts) {
    return { title, data: null, className: 'num' + (opts && opts.cls ? ' ' + opts.cls : ''), orderSequence: ['desc', 'asc'], render: (r, t) => { const v = fn(r); return t === 'display' ? (opts && opts.pct ? `<span class="${pctClass(v)}">${fmtPct(v)}</span>` : fmt(v)) : (v == null || !isFinite(v) ? -1e12 : v); } };
  }
  function summarize(rows, keyFn, extra) {
    const M = state.meta;
    return [...groupBy(rows, keyFn).entries()].map(([k, rs]) => {
      const o = { k, rows: rs, n: rs.length, active: rs.filter((r) => r._a.avgN > 0 || r._e.fcSum > 0).length };
      o.realL = sum(rs.map((r) => toL(r, sum(r.hist.slice(-state.settings.window)))));
      o.avgL = sum(rs.map((r) => r._e.avgL));
      o.avgU = sum(rs.map((r) => r._a.avgN));
      o.fc3L = sum(rs.map((r) => toL(r, sum(r._e.fin.slice(0, 3))))) / 3;
      o.projL = sum(rs.map((r) => r._e.projL));
      o.fcL = sum(rs.map((r) => r._e.fcL));
      o.fcU = sum(rs.map((r) => r._e.fcSum));
      o.planL = sum(rs.map((r) => toL(r, r._e.planSum)));
      o.monthsL = M.fcMonths.map((_, i) => sum(rs.map((r) => toL(r, r._e.fin[i]))));
      o.monthsU = M.fcMonths.map((_, i) => sum(rs.map((r) => r._e.fin[i])));
      o.var = o.avgL ? o.fc3L / o.avgL - 1 : null;
      o.varPlan = o.planL ? o.fcL / o.planL - 1 : null;
      o.alerts = rs.filter((r) => r._e.alerts.length).length;
      if (extra) extra(o, rs);
      return o;
    });
  }
  function renderClients(rows) {
    const M = state.meta;
    const data = summarize(rows, (r) => r.client, (o, rs) => { o.kam = [...new Set(rs.map((r) => r.kam).filter(Boolean))].join(', '); });
    const cols = [
      { title: 'Cliente', data: 'k', render: (v, t) => (t === 'display' ? `<a class="lnk" data-client="${esc(v)}">${esc(v)}</a>` : v) },
      { title: '', data: 'k', orderable: false, render: (v) => `<button class="btn btn-ghost btn-xs" data-fmclient="${esc(v)}">Prever</button>` },
      { title: 'KAM', data: 'kam' },
      numCol('Combinaciones activas', (o) => o.active),
      numCol(`Prom ${state.settings.window}m (L/mes)`, (o) => o.avgL, { cls: 'sep' }),
      numCol('FC próx. 3m (L/mes)', (o) => o.fc3L),
      numCol('Var. vs prom', (o) => o.var, { pct: true }),
      numCol(`FC ${M.fcMonths.length}m (L)`, (o) => o.fcL, { cls: 'sep' }),
    ];
    if (state.projects.length) cols.push(numCol('de los cuales proyectos (L)', (o) => o.projL));
    if (M.hasPlan) cols.push(numCol('Plan anterior (L)', (o) => o.planL), numCol('Var. vs plan', (o) => o.varPlan, { pct: true }));
    cols.push(numCol('Filas con alertas', (o) => o.alerts));
    if (cliTbl) { cliTbl.destroy(); $('#tblClients').empty(); }
    cliTbl = $('#tblClients').DataTable({ data, columns: cols, paging: false, order: [[7, 'desc']], language: dtLang(), dom: 'rti' });
  }
  function renderProducts(rows) {
    const M = state.meta;
    const data = summarize(rows, (r) => r.sku, (o, rs) => { o.desc = rs[0].desc; o.group = rs[0].group; o.pac = rs[0].pac; o.clients = new Set(rs.map((r) => r.client)).size; });
    const cols = [
      { title: 'SKU', data: 'k', render: (v, t) => (t === 'display' ? `<a class="lnk" data-sku="${esc(v)}">${esc(v)}</a>` : v) },
      { title: 'Descripción', data: 'desc', className: 'desc' },
      { title: 'Grupo', data: 'group' },
      numCol('Clientes', (o) => o.clients),
      numCol(`Prom ${state.settings.window}m (${M.unit})`, (o) => o.avgU, { cls: 'sep' }),
      numCol(`FC ${M.fcMonths.length}m (${M.unit})`, (o) => o.fcU),
      numCol(`FC ${M.fcMonths.length}m (L)`, (o) => o.fcL),
      numCol('Var. vs prom', (o) => o.var, { pct: true }),
    ];
    if (M.hasPlan) cols.push(numCol('Plan anterior (L)', (o) => o.planL), numCol('Var. vs plan', (o) => o.varPlan, { pct: true }));
    cols.push(numCol('Filas con alertas', (o) => o.alerts));
    if (prodTbl) { prodTbl.destroy(); $('#tblProducts').empty(); }
    prodTbl = $('#tblProducts').DataTable({ data, columns: cols, deferRender: true, pageLength: 50, order: [[6, 'desc']], language: dtLang(), dom: 'rtip<"dt-bottom"l>' });
  }

  /* ---------- 7.5 Alertas ---------- */
  const SEV = { high: ['Alta', 'b-high', 3], med: ['Media', 'b-med', 2], low: ['Baja', 'b-low', 1] };
  function allAlerts(rows) {
    const out = [];
    rows.forEach((r) => r._e.alerts.forEach((a) => out.push({ r, ...a })));
    return out;
  }
  function renderAlerts(rows) {
    const data = allAlerts(rows);
    const cols = [
      { title: 'Severidad', data: 'sev', render: (v, t) => (t === 'display' ? `<span class="badge ${SEV[v][1]}">${SEV[v][0]}</span>` : SEV[v][2]) },
      { title: 'Tipo', data: 't', render: (v) => ALERT_TYPES[v] },
      { title: 'Cliente', data: 'r.client' },
      { title: 'SKU', data: 'r.sku' },
      { title: 'Descripción', data: 'r.desc', className: 'desc', render: (v, t, a) => (t === 'display' ? `<a class="lnk" data-detail="${esc(a.r.id)}">${esc(v)}</a>` : v) },
      { title: 'Detalle', data: 'msg' },
      { title: 'Volumen (L/mes)', data: null, className: 'num', render: (a, t) => (t === 'display' ? fmt(Math.max(a.r._e.avgL, toL(a.r, a.r._e.fcAvgW))) : Math.max(a.r._e.avgL, toL(a.r, a.r._e.fcAvgW))) },
    ];
    if (alertTbl) { alertTbl.destroy(); $('#tblAlerts').empty(); }
    alertTbl = $('#tblAlerts').DataTable({ data, columns: cols, deferRender: true, pageLength: 50, order: [[0, 'desc'], [6, 'desc']], language: dtLang(), dom: 'rtip<"dt-bottom"l>' });
  }

  /* ---------- 7.6 Detalle de producto (drawer) ---------- */
  let drawerId = null;
  function openDrawer(id) {
    const r = state.byId.get(id); if (!r) return;
    drawerId = id;
    const M = state.meta, a = r._a, e = r._e, S = state.settings;
    $id('dwTitle').textContent = r.desc;
    $id('dwSub').textContent = `${r.client} · SKU ${r.sku}${r.productId ? ' · ' + r.productId : ''} · ${r.group}${r.kam ? ' · KAM ' + r.kam : ''}`;
    const hm = M.histMonths.slice(-18), off = M.histMonths.length - hm.length;
    const labels = [...hm, ...M.fcMonths].map(mLabel), pad = hm.map(() => null);
    const ds = [
      { type: 'bar', label: 'Real', data: [...hm.map((_, j) => r.hist[off + j]), ...M.fcMonths.map(() => null)], backgroundColor: hm.map((k) => ((state.excl[id] || []).includes(k) ? BRAND.grayL : a.spikes.includes(k) ? BRAND.violet : BRAND.navy)), borderRadius: 3, stack: 'r' },
      { type: 'bar', label: 'Forecast base', data: [...pad, ...state.fc[id]], backgroundColor: BRAND.sky, borderRadius: 3, stack: 'f' },
      ...(state.projRow[id] ? [{ type: 'bar', label: 'Proyectos', data: [...pad, ...state.projRow[id]], backgroundColor: BRAND.violet, borderRadius: 3, stack: 'f' }] : []),
      { type: 'line', label: 'Sugerido', data: [...pad, ...a.sug], borderColor: BRAND.fuchsia, borderDash: [3, 3], pointRadius: 0, borderWidth: 1.5 },
    ];
    if (r.hasPlan) ds.push({ type: 'line', label: 'Plan anterior', data: [...pad, ...r.plan], borderColor: BRAND.purple, borderDash: [6, 4], pointRadius: 2, borderWidth: 2 });
    if (r.hasStat) ds.push({ type: 'line', label: 'Estadístico', data: [...pad, ...r.stat], borderColor: BRAND.grayD, borderDash: [2, 3], pointRadius: 0, borderWidth: 1.5 });
    const rowOpts = baseOpts({ tooltipUnit: M.unit }); rowOpts.scales.x.stacked = true;
    chart('chRow', { data: { labels, datasets: ds }, options: rowOpts });
    // Limpieza de historia: chips de los últimos 12 meses; los marcados no cuentan para la estadística
    const ex = state.excl[id] || [];
    $id('dwClean').innerHTML = M.histMonths.slice(-12).map((k) => {
      const v = r.hist[M.histMonths.indexOf(k)];
      return `<button class="chip${ex.includes(k) ? ' on' : ''}${a.spikes.includes(k) ? ' sug' : ''}" data-excl="${k}" title="${ex.includes(k) ? 'Excluido como proyecto: clic para volver a contarlo' : 'Clic para marcar como mes de proyecto (no cuenta para la estadística)'}">${mLabel(k)}<b>${v == null ? '·' : fmt(v)}</b></button>`;
    }).join('');
    const myProj = state.projects.filter((p) => p._row === id);
    $id('dwProj').innerHTML = myProj.length ? myProj.map((p) => `<div class="dw-alert" style="border-left-color:${p.type === 'VUL' ? BRAND.fuchsia : BRAND.violet}"><b>${p.type === 'VUL' ? 'Vulnerabilidad' : 'Oportunidad'} · ${esc(p.name)}</b> · ${p.prob}% · ${fmt(sum(Object.values(p.liters)))} L ${p._incl ? '' : `<span class="muted">(no incluido: &lt; ${state.settings.projThreshold}%)</span>`}</div>`).join('') : '<p class="muted small">Sin proyectos para este producto.</p>';
    const m = (l, v) => `<div class="dw-metric"><span>${l}</span><b>${v}</b></div>`;
    $id('dwMetrics').innerHTML = [
      m(`Promedio ${S.window}m`, fmt1(a.avgN) + ' ' + M.unit),
      m('Promedio 3m', fmt1(a.avg3)),
      m('Promedio 12m', fmt1(a.avg12)),
      m('Tendencia', `<span class="${pctClass(a.trendPct)}">${fmtPct(a.trendPct)}</span>`),
      m('Estacionalidad', a.seasonal ? 'Sí (r=' + a.seasR.toFixed(2) + ')' : 'No' + (a.seasR ? ' (r=' + a.seasR.toFixed(2) + ')' : '')),
      m('Picos', a.spikes.length ? a.spikes.map(mLabel).join(', ') : 'No'),
      m('Forecast total', fmt(e.fcSum) + ' ' + M.unit + (M.hasPac ? ` · ${fmt(e.fcL)} L` : '')),
      m('Var. vs promedio', isFinite(e.dev) ? `<span class="${pctClass(e.dev)}">${fmtPct(e.dev)}</span>` : 'nuevo'),
      m('Backtest error', a.btAct ? nf0.format((a.btErr / a.btAct) * 100) + '%' : '–'),
      M.hasPac ? m('PAC', r.pac ? fmt1(r.pac) + ' L' : 'sin dato') : '',
      m('Clase', r.cls || '–'),
      m('Cartera', sum(r.cart) ? r.cart.map((c, i) => (c ? mLabel(M.fcMonths[i]) + ': ' + fmt(c) : '')).filter(Boolean).join(' · ') : '–'),
    ].join('');
    $id('dwAlerts').innerHTML = e.alerts.length ? e.alerts.map((x) => `<div class="dw-alert"><b>${ALERT_TYPES[x.t]}</b> · ${esc(x.msg)}</div>`).join('') : '<p class="muted">Sin alertas.</p>';
    $id('drawer').classList.add('open'); $id('backdrop').classList.add('show');
  }
  function closeDrawer() { $id('drawer').classList.remove('open'); $id('backdrop').classList.remove('show'); drawerId = null; }

  /* ---------- 7.8 Pop-up de previsión por curva histórica ----------
     Dos modos:
       'client' → proyecta la curva agregada del cliente (en litros) y la reparte
                  entre sus productos según el mix histórico, respetando bloqueos.
       'row'    → proyecta la curva de un producto puntual (en su unidad base).
     Métodos: promedio N meses · tendencia lineal 12m · curva del año anterior
     ajustada al nivel actual · índice estacional · plan anterior. Todos admiten
     un ajuste % final, y cada mes se puede corregir a mano antes de aplicar. */
  const CURVE_METHODS = {
    ly: { name: 'Curva año anterior', help: 'Repite la forma del mismo mes del año anterior, escalada al nivel actual (promedio de los últimos N meses ÷ promedio de los mismos N meses un año antes). Respeta la estacionalidad del cliente.' },
    seasonal: { name: 'Índice estacional', help: 'Promedio desestacionalizado de los últimos N meses × índice de cada mes calendario, calculado con toda la historia (promedio del mes ÷ promedio general).' },
    trend: { name: 'Tendencia lineal', help: 'Recta de mínimos cuadrados sobre los últimos 12 meses, prolongada hacia adelante (con tope de 3× el promedio). Útil cuando el cliente crece o cae de forma sostenida.' },
    avg: { name: 'Promedio N meses', help: 'Valor plano igual al promedio de los últimos N meses. La opción más estable para demanda irregular.' },
    plan: { name: 'Plan anterior', help: 'Parte del plan anterior (DMR) cargado en el archivo, para ajustarlo con el % o mes a mes.' },
  };
  const modal = { mode: null, client: '', group: '', rowId: null, method: 'ly', window: 6, adj: 0, values: [], edited: [], rows: [], hist: [], plan: [], unit: 'L' };

  /** Proyecta una serie histórica (array alineado a histMonths, null = sin dato) al horizonte. */
  function projectCurve(hist, method, N, plan) {
    const M = state.meta, H = M.fcMonths.length;
    const keys = [], vals = [];
    hist.forEach((v, i) => { if (v != null) { keys.push(M.histMonths[i]); vals.push(v); } });
    const byKey = new Map(keys.map((k, j) => [k, vals[j]]));
    const avgN = mean(vals.slice(-N));
    if (method === 'plan') return plan.slice();
    if (method === 'avg' || !vals.length) return M.fcMonths.map(() => avgN);
    if (method === 'trend') {
      const y = vals.slice(-12), { slope, intercept } = linreg(y), cap = mean(y) * 3;
      return M.fcMonths.map((_, h) => Math.min(cap, Math.max(0, intercept + slope * (y.length + h))));
    }
    if (method === 'seasonal') {
      const all = mean(vals), byM = Array.from({ length: 12 }, () => []);
      keys.forEach((k, j) => byM[+k.slice(5) - 1].push(vals[j]));
      const idx = byM.map((a) => (a.length && all > 0 ? Math.min(3, Math.max(0.3, mean(a) / all)) : 1));
      const lastK = keys.slice(-N), lastV = vals.slice(-N);
      const base = mean(lastV.map((v, j) => v / idx[+lastK[j].slice(5) - 1]));
      return M.fcMonths.map((k) => base * idx[+k.slice(5) - 1]);
    }
    // 'ly': mismo mes del año anterior (o de dos años antes si el anterior también es futuro) × nivel
    const lastK = keys.slice(-N);
    const prevYear = lastK.map((k) => byKey.get(addMonths(k, -12))).filter((v) => v != null);
    const level = prevYear.length === lastK.length && sum(prevYear) > 0 ? avgN / mean(prevYear) : 1;
    return M.fcMonths.map((k) => {
      const ly = byKey.has(addMonths(k, -12)) ? byKey.get(addMonths(k, -12)) : byKey.get(addMonths(k, -24));
      return ly == null ? avgN : ly * Math.min(3, Math.max(0.2, level));
    });
  }
  /** Redondeo acumulado de una serie (conserva el total). */
  const cumRound = (arr) => { let acc = 0, done = 0; return arr.map((v) => { acc += Math.max(0, v); const c = Math.round(acc) - done; done += c; return c; }); };

  function openForecastModal(mode, ref) {
    const M = state.meta; if (!M) return;
    modal.mode = mode; modal.window = state.settings.window; modal.adj = 0;
    modal.method = M.histMonths.length >= 13 ? 'ly' : 'avg';
    if (mode === 'row') {
      modal.rowId = ref;
      // en demanda intermitente la curva del año anterior amplifica pedidos esporádicos: arrancar con promedio
      const st = state.byId.get(ref)._a.status;
      if (st === 'interm' || st === 'none') modal.method = 'avg';
    }
    else {
      modal.client = ref || state.filters.client || [...new Set(state.rows.map((r) => r.client))].sort()[0];
      modal.group = state.filters.group || '';
    }
    $id('fmClientWrap').hidden = mode !== 'client';
    $id('fmDistWrap').hidden = mode !== 'client';
    $id('fmLockApplied').checked = mode === 'row';
    $id('fmClient').innerHTML = [...new Set(state.rows.map((r) => r.client))].sort().map((c) => `<option>${esc(c)}</option>`).join('');
    $id('fmMethod').innerHTML = Object.entries(CURVE_METHODS).filter(([k]) => k !== 'plan' || M.hasPlan).map(([k, m]) => `<button type="button" class="seg" data-method="${k}">${m.name}</button>`).join('');
    $id('fmWindow').value = modal.window; $id('fmAdj').value = 0;
    loadModalScope();
    $id('fcModal').hidden = false; document.body.classList.add('modal-open');
  }
  function closeForecastModal() { $id('fcModal').hidden = true; document.body.classList.remove('modal-open'); }

  /** Arma la serie histórica del alcance (fila o cliente agregado en litros). */
  function loadModalScope() {
    const M = state.meta;
    if (modal.mode === 'row') {
      const r = state.byId.get(modal.rowId);
      modal.rows = [r]; modal.unit = M.unit; modal.hist = cleanHist(r).slice(); modal.plan = r.plan.slice();
      $id('fmTitle').textContent = 'Ingresar forecast · ' + r.desc;
      $id('fmSub').textContent = `${r.client} · SKU ${r.sku} · ${r.group} · valores en ${M.unit === 'pz' ? 'piezas' : M.unit}` + (r.pac ? ` (PAC ${fmt1(r.pac)} L)` : '');
    } else {
      $id('fmClient').value = modal.client;
      const groups = [...new Set(state.rows.filter((r) => r.client === modal.client).map((r) => r.group))].sort();
      if (modal.group && !groups.includes(modal.group)) modal.group = '';
      $id('fmGroup').innerHTML = '<option value="">Todos los grupos</option>' + groups.map((g) => `<option>${esc(g)}</option>`).join('');
      $id('fmGroup').value = modal.group;
      modal.rows = state.rows.filter((r) => r.client === modal.client && (!modal.group || r.group === modal.group));
      modal.unit = M.unit === 'pz' ? 'L' : M.unit;
      // curva agregada con la historia limpia (sin meses marcados como proyecto)
      const ch = new Map(modal.rows.map((r) => [r.id, cleanHist(r)]));
      modal.hist = M.histMonths.map((_, i) => { let s = 0, any = false; modal.rows.forEach((r) => { const v = ch.get(r.id)[i]; if (v != null) { any = true; s += toL(r, v); } }); return any ? s : null; });
      modal.plan = M.fcMonths.map((_, i) => sum(modal.rows.map((r) => toL(r, r.plan[i]))));
      $id('fmTitle').textContent = 'Previsión por cliente · ' + modal.client.replace(/^M&P ARG /, '');
      $id('fmSub').textContent = `${modal.rows.length} productos${modal.group ? ' del grupo ' + modal.group : ''} · curva agregada en litros, repartida por producto según su mix`;
    }
    recalcModal();
  }

  function recalcModal() {
    const raw = projectCurve(modal.hist, modal.method, modal.window, modal.plan).map((v) => v * (1 + modal.adj / 100));
    modal.values = modal.mode === 'row' ? cumRound(raw) : raw.map((v) => Math.round(v));
    modal.edited = modal.values.map(() => false);
    document.querySelectorAll('#fmMethod .seg').forEach((b) => b.classList.toggle('active', b.dataset.method === modal.method));
    $id('fmHelp').textContent = CURVE_METHODS[modal.method].help;
    renderModalTable(); renderModalChart(); renderModalDist();
  }

  /** Valor del mes de referencia "año anterior" de la serie del alcance. */
  function modalLY(k) { const i = state.meta.histMonths.indexOf(addMonths(k, -12)); return i >= 0 ? modal.hist[i] : null; }
  function modalCurrent() {
    // forecast vigente del alcance (para comparar antes de aplicar)
    return state.meta.fcMonths.map((_, i) => sum(modal.rows.map((r) => (modal.mode === 'row' ? state.fc[r.id][i] : toL(r, state.fc[r.id][i])))));
  }

  function renderModalTable() {
    const M = state.meta, cur = modalCurrent(), u = modal.unit;
    let h = `<table class="fm-table"><thead><tr><th>Mes</th><th class="num">Año ant.</th>${M.hasPlan ? '<th class="num">Plan ant.</th>' : ''}<th class="num">Actual</th><th class="num">Propuesto (${u})</th><th class="num">vs año ant.</th></tr></thead><tbody>`;
    M.fcMonths.forEach((k, i) => {
      const ly = modalLY(k), v = modal.values[i], d = ly ? v / ly - 1 : null;
      h += `<tr><td>${mLabel(k)}</td><td class="num muted">${ly == null ? '–' : fmt(ly)}</td>${M.hasPlan ? `<td class="num muted">${fmt(modal.plan[i])}</td>` : ''}<td class="num muted">${fmt(cur[i])}</td>`
        + `<td class="num"><input class="fm-in${modal.edited[i] ? ' edited' : ''}" data-fm="${i}" value="${fmt(v)}" inputmode="decimal"></td><td class="num"><span class="${pctClass(d)}">${fmtPct(d)}</span></td></tr>`;
    });
    const tLy = sum(M.fcMonths.map((k) => modalLY(k) || 0)), tV = sum(modal.values);
    // la variación total se compara solo en los meses que tienen dato del año anterior
    const tVcmp = sum(M.fcMonths.map((k, i) => (modalLY(k) != null ? modal.values[i] : 0))), dT = tLy ? tVcmp / tLy - 1 : null;
    h += `</tbody><tfoot><tr><td>Total</td><td class="num">${fmt(tLy)}</td>${M.hasPlan ? `<td class="num">${fmt(sum(modal.plan))}</td>` : ''}<td class="num">${fmt(sum(cur))}</td><td class="num"><b>${fmt(tV)}</b></td><td class="num"><span class="${pctClass(dT)}" title="Solo meses con dato del año anterior">${fmtPct(dT)}</span></td></tr></tfoot></table>`;
    $id('fmTable').innerHTML = h;
  }

  function renderModalChart() {
    const M = state.meta, hm = M.histMonths, pad = hm.map(() => null);
    const labels = [...hm, ...M.fcMonths].map(mLabel);
    const lyLine = M.fcMonths.map((k) => modalLY(k));
    const ds = [
      { type: 'bar', label: 'Real', data: [...modal.hist, ...M.fcMonths.map(() => null)], backgroundColor: BRAND.navy, borderRadius: 3, order: 3 },
      { type: 'line', label: 'Propuesto', data: [...pad.slice(0, -1), modal.hist.at(-1), ...modal.values], borderColor: BRAND.sky, backgroundColor: 'rgba(0,139,197,.15)', fill: false, borderWidth: 3, pointRadius: 3, order: 1 },
      { type: 'line', label: 'Mismo mes año anterior', data: [...pad, ...lyLine], borderColor: BRAND.grayD, borderDash: [2, 3], pointRadius: 0, borderWidth: 1.5, order: 2 },
    ];
    if (M.hasPlan) ds.push({ type: 'line', label: 'Plan anterior', data: [...pad, ...modal.plan], borderColor: BRAND.purple, borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5, order: 2 });
    const pjm = M.fcMonths.map((_, i) => sum(modal.rows.map((r) => (state.projRow[r.id] ? (modal.mode === 'row' ? state.projRow[r.id][i] : toL(r, state.projRow[r.id][i])) : 0))));
    if (pjm.some((v) => v)) ds.push({ type: 'line', label: 'Propuesto + proyectos', data: [...pad, ...modal.values.map((v, i) => Math.max(0, v + pjm[i]))], borderColor: BRAND.violet, borderDash: [4, 3], pointRadius: 2, borderWidth: 2, order: 1 });
    chart('chModal', { data: { labels, datasets: ds }, options: baseOpts({ tooltipUnit: modal.unit }) });
  }

  /**
   * Reparte el total mensual del cliente entre sus productos (modo cliente).
   * Peso de cada producto = litros de los últimos N meses. Las celdas bloqueadas
   * se respetan: su volumen se descuenta y el resto se reparte entre las libres.
   */
  function distribute() {
    const N = modal.window, respect = $id('fmRespect').checked, H = state.meta.fcMonths.length;
    const conv = state.meta.unit === 'pz';
    const rows = modal.rows.filter((r) => !conv || r.pac > 0);
    const w = new Map(rows.map((r) => [r.id, toL(r, sum(cleanHist(r).filter((v) => v != null).slice(-N)))]));
    let base = rows.filter((r) => w.get(r.id) > 0);
    if (!base.length) { base = rows; base.forEach((r) => w.set(r.id, 1)); }
    const out = new Map(base.map((r) => [r.id, new Array(H).fill(0)]));
    for (let i = 0; i < H; i++) {
      const locked = respect ? base.filter((r) => state.manual[r.id][i]) : [];
      const lockedL = sum(locked.map((r) => toL(r, state.fc[r.id][i])));
      const free = base.filter((r) => !locked.includes(r));
      const tw = sum(free.map((r) => w.get(r.id))), rem = Math.max(0, modal.values[i] - lockedL);
      free.forEach((r) => { out.get(r.id)[i] = tw ? (rem * w.get(r.id)) / tw / (conv ? r.pac : 1) : 0; });
      locked.forEach((r) => { out.get(r.id)[i] = null; }); // null = no tocar
    }
    out.forEach((arr, id) => {
      const vals = arr.map((v) => v || 0), rounded = cumRound(vals);
      out.set(id, arr.map((v, i) => (v === null ? null : rounded[i])));
    });
    const skipped = modal.rows.length - base.length;
    return { out, w, base, skipped };
  }

  function renderModalDist() {
    if (modal.mode !== 'client') return;
    const { w, base, skipped } = distribute(), tw = sum(base.map((r) => w.get(r.id)));
    const top = base.slice().sort((a, b) => w.get(b.id) - w.get(a.id)).slice(0, 8);
    $id('fmDist').innerHTML = `<p class="muted small">El total de cada mes se reparte entre <b>${base.length}</b> productos según su peso en los últimos ${modal.window} meses${skipped ? ` · ${skipped} productos sin consumo${state.meta.unit === 'pz' ? ' o sin PAC' : ''} quedan como están` : ''}.</p>`
      + '<table class="fm-table small"><thead><tr><th>Producto</th><th class="num">Mix</th></tr></thead><tbody>'
      + top.map((r) => `<tr><td>${esc(r.desc)}</td><td class="num">${tw ? nf1.format((w.get(r.id) / tw) * 100) + '%' : '–'}</td></tr>`).join('')
      + (base.length > top.length ? `<tr><td class="muted">+ ${base.length - top.length} productos más</td><td></td></tr>` : '') + '</tbody></table>';
  }

  function applyModal() {
    const lockApplied = $id('fmLockApplied').checked, respect = $id('fmRespect').checked;
    let n = 0;
    if (modal.mode === 'row') {
      const r = modal.rows[0];
      pushUndo([r.id], 'pop-up de previsión');
      modal.values.forEach((v, i) => {
        if (respect && state.manual[r.id][i] && !lockApplied) return;
        if (state.fc[r.id][i] !== v) n++;
        state.fc[r.id][i] = Math.max(0, Math.round(v));
        if (lockApplied) state.manual[r.id][i] = 1;
      });
      evalRow(r);
    } else {
      const { out } = distribute();
      pushUndo([...out.keys()], 'previsión por cliente');
      out.forEach((arr, id) => {
        arr.forEach((v, i) => {
          if (v === null) return;
          if (!respect && state.manual[id][i] && !lockApplied) state.manual[id][i] = 0;
          if (state.fc[id][i] !== v) n++;
          state.fc[id][i] = v;
          if (lockApplied) state.manual[id][i] = 1;
        });
        evalRow(state.byId.get(id));
      });
    }
    touch(); closeForecastModal();
    if (state.view === 'grid') refreshGrid(); else state.dirty.add('grid');
    if (drawerId) openDrawer(drawerId);
    renderView();
    toast(`${nf0.format(n)} celdas actualizadas` + (lockApplied ? ' y bloqueadas' : ''));
  }

  function bindModalEvents() {
    $id('fmClose').addEventListener('click', closeForecastModal);
    $id('fmCancel').addEventListener('click', closeForecastModal);
    $id('fcModal').addEventListener('click', (e) => { if (e.target.id === 'fcModal') closeForecastModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$id('fcModal').hidden) closeForecastModal(); });
    $id('fmMethod').addEventListener('click', (e) => { const b = e.target.closest('[data-method]'); if (b) { modal.method = b.dataset.method; recalcModal(); } });
    $id('fmWindow').addEventListener('change', (e) => { modal.window = Math.min(12, Math.max(3, +e.target.value || 6)); e.target.value = modal.window; recalcModal(); });
    $id('fmAdj').addEventListener('change', (e) => { modal.adj = parseNum(e.target.value) || 0; recalcModal(); });
    $id('fmClient').addEventListener('change', (e) => { modal.client = e.target.value; modal.group = ''; loadModalScope(); });
    $id('fmGroup').addEventListener('change', (e) => { modal.group = e.target.value; loadModalScope(); });
    $id('fmRespect').addEventListener('change', renderModalDist);
    $id('fmTable').addEventListener('change', (e) => {
      if (!e.target.classList.contains('fm-in')) return;
      const i = +e.target.dataset.fm, v = parseNum(e.target.value);
      if (isNaN(v) || v < 0) { toast('Valor inválido', true); renderModalTable(); return; }
      modal.values[i] = Math.round(v); modal.edited[i] = true;
      renderModalTable(); renderModalChart();
    });
    $id('fmTable').addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('fm-in') || !['Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const i = +e.target.dataset.fm + (e.key === 'ArrowUp' ? -1 : 1);
      e.target.blur();
      const nx = $id('fmTable').querySelector(`[data-fm="${i}"]`); if (nx) { nx.focus(); nx.select(); }
    });
    $id('fmTable').addEventListener('focusin', (e) => { if (e.target.classList.contains('fm-in')) e.target.select(); });
    $id('fmApply').addEventListener('click', applyModal);
    $id('btnClientWizard').addEventListener('click', () => openForecastModal('client'));
  }

  /* ---------- 7.9 Proyectos (VULOPPS) ----------
     Registro de oportunidades (OPP, suman) y vulnerabilidades (VUL, restan) en litros.
     Se importan de la hoja VULOPPS y se pueden cargar/editar a mano con un pop-up.
     Solo entran al forecast final los que tienen probabilidad ≥ umbral (70% por defecto). */
  let projTbl = null, projEditing = null;

  function renderProjects() {
    const S = state.settings, M = state.meta;
    $id('pjThreshold').value = S.projThreshold;
    const P = state.projects, inc = P.filter((p) => p._incl);
    const tot = (arr, t) => sum(arr.filter((p) => !t || p.type === t).map((p) => sum(Object.values(p.liters))));
    $id('pjKpis').innerHTML = [
      kpi('Incluidos en el forecast', nf0.format(inc.length), `de ${nf0.format(P.length)} proyectos · probabilidad ≥ ${S.projThreshold}%`),
      kpi('Oportunidades incluidas', '+' + fmt(tot(inc, 'OPP')) + ' L', `${inc.filter((p) => p.type === 'OPP').length} OPP`, 'k-violet'),
      kpi('Vulnerabilidades incluidas', '−' + fmt(tot(inc, 'VUL')) + ' L', `${inc.filter((p) => p.type === 'VUL').length} VUL`, 'k-fuchsia'),
      kpi('Fuera por probabilidad', nf0.format(P.length - inc.length), fmt(tot(P.filter((p) => !p._incl))) + ' L no considerados', 'k-gray'),
    ].join('');
    const span = (p) => { const ks = Object.keys(p.liters).filter((k) => p.liters[k]).sort(); return ks.length ? mLabel(ks[0]) + (ks.length > 1 ? ' → ' + mLabel(ks.at(-1)) : '') : '–'; };
    const cols = [
      { title: 'Incluido', data: null, render: (p, t) => (t === 'display' ? (p._incl ? '<span class="badge b-up">✓ sí</span>' : `<span class="badge b-none">no (&lt;${S.projThreshold}%)</span>`) : (p._incl ? 1 : 0)) },
      { title: 'Tipo', data: 'type', render: (v, t) => (t === 'display' ? (v === 'VUL' ? '<span class="badge b-down">VUL</span>' : '<span class="badge b-spike">OPP</span>') : v) },
      { title: 'Proyecto', data: 'name', render: (v, t, p) => (t === 'display' ? `<a class="lnk" data-pjedit="${esc(p.id)}">${esc(v)}</a>` : v) },
      { title: 'Cliente', data: 'client', render: (v) => esc(String(v).replace(/^M&P ARG /, '')) },
      { title: 'SKU', data: 'sku' },
      { title: 'Descripción', data: 'desc', className: 'desc' },
      { title: 'Prob.', data: 'prob', className: 'num', render: (v, t) => (t === 'display' ? v + '%' : v) },
      { title: 'Total L', data: null, className: 'num', render: (p, t) => { const v = sum(Object.values(p.liters)); return t === 'display' ? fmt(v) : v; } },
      { title: 'Meses', data: null, render: (p) => span(p) },
      { title: 'Origen', data: 'source', render: (v, t, p) => (t === 'display' ? (v === 'manual' ? 'Carga manual' : 'VULOPPS') + (p._noPac ? ' <span class="badge b-med" title="El producto no tiene PAC: no se puede convertir a piezas">sin PAC</span>' : '') : v) },
      { title: '', data: null, orderable: false, render: (p) => `<button class="btn btn-ghost btn-xs" data-pjedit="${esc(p.id)}">Editar</button>` },
    ];
    if (projTbl) { projTbl.destroy(); $('#tblProjects').empty(); }
    projTbl = $('#tblProjects').DataTable({ data: P, columns: cols, deferRender: true, pageLength: 50, order: [[0, 'desc'], [7, 'desc']], language: { ...dtLang(), emptyTable: 'No hay proyectos: la hoja VULOPPS del archivo está vacía. Cargalos con “+ Nuevo proyecto”.' }, dom: 'rtip<"dt-bottom"l>' });
    $id('pjNote').textContent = M ? `Horizonte ${mLabel(M.fcMonths[0])} a ${mLabel(M.fcMonths.at(-1))}. Los litros se convierten a piezas con el PAC de cada producto.` : '';
  }

  /** Pop-up de alta/edición de un proyecto. */
  function openProjectModal(id) {
    const M = state.meta; if (!M) return;
    const p = id ? state.projects.find((x) => x.id === id) : null;
    projEditing = p ? p.id : null;
    $id('pmTitle').textContent = p ? 'Editar proyecto' : 'Nuevo proyecto';
    $id('pmDelete').hidden = !p;
    $id('pmType').value = p ? p.type : 'OPP';
    $id('pmName').value = p ? p.name : '';
    $id('pmClient').innerHTML = [...new Set(state.rows.map((r) => r.client))].sort().map((c) => `<option>${esc(c)}</option>`).join('');
    $id('pmClient').value = p ? p.client : state.filters.client || $id('pmClient').options[0].value;
    // catálogo de productos (SKU — descripción) para el buscador
    const seen = new Set();
    $id('pmSkuList').innerHTML = state.rows.filter((r) => !seen.has(r.sku) && seen.add(r.sku)).map((r) => `<option value="${esc(r.sku + ' — ' + r.desc)}">`).join('');
    $id('pmSku').value = p ? p.sku + ' — ' + p.desc : '';
    $id('pmProb').value = p ? p.prob : 70;
    $id('pmTotal').value = ''; $id('pmFrom').innerHTML = $id('pmTo').innerHTML = M.fcMonths.map((k, i) => `<option value="${i}">${mLabel(k)}</option>`).join('');
    $id('pmFrom').value = 0; $id('pmTo').value = Math.min(2, M.fcMonths.length - 1);
    $id('pmMonths').innerHTML = M.fcMonths.map((k) => `<label class="pm-m">${mLabel(k)}<input data-pm="${k}" inputmode="decimal" value="${p && p.liters[k] ? fmt(p.liters[k]) : ''}"></label>`).join('');
    updatePmTotal();
    $id('projModal').hidden = false; document.body.classList.add('modal-open');
    setTimeout(() => $id('pmName').focus(), 50);
  }
  function closeProjectModal() { $id('projModal').hidden = true; document.body.classList.remove('modal-open'); }
  function pmLiters() { const o = {}; document.querySelectorAll('#pmMonths [data-pm]').forEach((i) => { const v = parseNum(i.value); if (v > 0) o[i.dataset.pm] = v; }); return o; }
  function updatePmTotal() {
    const L = sum(Object.values(pmLiters())), prob = +$id('pmProb').value || 0;
    $id('pmSum').innerHTML = `Total: <b>${fmt(L)} L</b> · ${prob >= state.settings.projThreshold ? `<span class="pos">entra al forecast</span> (≥ ${state.settings.projThreshold}%)` : `<span class="neg">no entra al forecast</span> (&lt; ${state.settings.projThreshold}%)`}`;
  }
  function saveProject() {
    const name = $id('pmName').value.trim(), client = $id('pmClient').value;
    const skuTxt = $id('pmSku').value.trim(), sku = skuTxt.split('—')[0].trim();
    const known = state.rows.find((r) => r.sku === sku);
    const desc = skuTxt.includes('—') ? skuTxt.split('—').slice(1).join('—').trim() : known ? known.desc : '';
    const prob = Math.max(0, Math.min(100, Math.round(parseNum($id('pmProb').value) || 0)));
    const liters = pmLiters();
    if (!name) { toast('Poné un nombre al proyecto', true); return; }
    if (!sku) { toast('Elegí el producto (SKU)', true); return; }
    if (!Object.keys(liters).length) { toast('Cargá los litros de al menos un mes', true); return; }
    const data = { type: $id('pmType').value, name, client, sku, desc, prob, liters };
    if (projEditing) Object.assign(state.projects.find((x) => x.id === projEditing), data);
    else state.projects.push({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), source: 'manual', ...data });
    closeProjectModal(); refreshProjects(); rebuildGridIfOpen(); renderView();
    toast(`Proyecto guardado${prob >= state.settings.projThreshold ? ' e incluido en el forecast' : ' (no entra al forecast: probabilidad < ' + state.settings.projThreshold + '%)'}`);
  }
  function deleteProject() {
    if (!projEditing || !confirm('¿Eliminar este proyecto?')) return;
    state.projects = state.projects.filter((x) => x.id !== projEditing);
    closeProjectModal(); refreshProjects(); rebuildGridIfOpen(); renderView();
    toast('Proyecto eliminado');
  }
  function rebuildGridIfOpen() { if (grid) { grid.destroy(); $('#tblGrid').empty(); grid = null; } state.dirty.add('grid'); }

  /** Marca/desmarca un mes de historia como proyecto (limpieza) y recalcula la fila. */
  function toggleExcl(id, k) {
    const r = state.byId.get(id); const before = r._a.avgN;
    const ex = state.excl[id] || (state.excl[id] = []);
    const j = ex.indexOf(k); if (j >= 0) ex.splice(j, 1); else ex.push(k);
    if (!ex.length) delete state.excl[id];
    r._a = analyze(r); evalRow(r); touch(); state.dirty.add('grid');
    openDrawer(id);
    toast(`Promedio ${state.settings.window}m: ${fmt1(before)} → ${fmt1(r._a.avgN)}. Usá “Aplicar sugerido” para actualizar el forecast base.`);
  }

  function bindProjectEvents() {
    $id('btnNewProject').addEventListener('click', () => openProjectModal(null));
    $id('pmClose').addEventListener('click', closeProjectModal);
    $id('pmCancel').addEventListener('click', closeProjectModal);
    $id('projModal').addEventListener('click', (e) => { if (e.target.id === 'projModal') closeProjectModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$id('projModal').hidden) closeProjectModal(); });
    $id('pmSave').addEventListener('click', saveProject);
    $id('pmDelete').addEventListener('click', deleteProject);
    $id('pmMonths').addEventListener('input', updatePmTotal);
    $id('pmProb').addEventListener('input', updatePmTotal);
    $id('pmSpread').addEventListener('click', () => {
      const T = parseNum($id('pmTotal').value); let a = +$id('pmFrom').value, b = +$id('pmTo').value; if (a > b) [a, b] = [b, a];
      if (!(T > 0)) { toast('Ingresá el total en litros a repartir', true); return; }
      const parts = cumRound(Array.from({ length: b - a + 1 }, () => T / (b - a + 1)));
      document.querySelectorAll('#pmMonths [data-pm]').forEach((inp, i) => { inp.value = i >= a && i <= b ? fmt(parts[i - a]) : ''; });
      updatePmTotal();
    });
    $id('pjThreshold').addEventListener('change', (e) => {
      state.settings.projThreshold = Math.max(0, Math.min(100, +e.target.value || 0));
      refreshProjects(); rebuildGridIfOpen(); renderView();
      toast(`Umbral de proyectos: ≥ ${state.settings.projThreshold}%`);
    });
    document.addEventListener('click', (e) => {
      const pe = e.target.closest('[data-pjedit]'); if (pe) { openProjectModal(pe.dataset.pjedit); return; }
      const ex = e.target.closest('[data-excl]'); if (ex && drawerId) toggleExcl(drawerId, ex.dataset.excl);
    });
  }

  /* ---------- 7.7 Configuración ---------- */
  function renderSettings() {
    const f = $id('settingsForm');
    Object.entries(state.settings).forEach(([k, v]) => { if (f.elements[k]) f.elements[k].value = v; });
    const snaps = loadSnaps();
    $id('snapList').innerHTML = snaps.length
      ? snaps.map((s) => `<div class="snap">📸 ${new Date(s.createdAt).toLocaleString('es-AR')} · ${esc(s.fileName)} · último real ${mLabel(s.lastActual)} <button class="btn btn-ghost" data-delsnap="${s.id}">Borrar</button></div>`).join('')
      : '<p class="muted small">Todavía no hay snapshots.</p>';
  }

  /* ===================================================================
     8. EXPORTACIÓN A EXCEL
     =================================================================== */
  const F_INT = '#,##0', F_DEC = '#,##0.0', F_PCT = '0.0%';

  /** Hoja con título, fecha de generación, encabezado con autofiltro y formatos numéricos. */
  function buildSheet(title, headers, data, formats, widths, stamp) {
    const aoa = [[title], [stamp], [], headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const R0 = 4; // primera fila de datos (0-based)
    data.forEach((row, ri) => row.forEach((v, ci) => {
      const z = formats[ci]; if (!z || typeof v !== 'number') return;
      const cell = ws[XLSX.utils.encode_cell({ r: R0 + ri, c: ci })]; if (cell) cell.z = z;
    }));
    ws['!cols'] = headers.map((h, i) => ({ wch: widths[i] || Math.max(10, String(h).length + 2) }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + data.length, c: headers.length - 1 } }) };
    return ws;
  }

  function exportExcel() {
    const M = state.meta, S = state.settings;
    const rows = state.rows;
    const now = new Date();
    const stamp = 'Generado: ' + now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' · Archivo origen: ' + M.fileName;
    const ml = M.fcMonths.map(mLabel);
    const U = M.unit === 'pz' ? 'piezas' : M.unit;
    const wb = XLSX.utils.book_new();

    // 1) Forecast Final
    const h1 = ['Key', 'Cliente', 'KAM', 'SKU', 'ProductId', 'Code shape', 'Descripción', 'Grupo', 'PC', 'PAC (L)', 'Clase', `Prom ${S.window}m`, 'Tendencia', ...ml, `Total (${U})`, 'Total (L)', 'Var. vs prom', 'Var. vs plan', 'Celdas bloqueadas', 'Alertas'];
    const d1 = rows.map((r) => [r.key, r.client, r.kam, isNaN(+r.sku) ? r.sku : +r.sku, r.productId, r.shape || '', r.desc, r.group, r.pc, r.pac || null, r.cls, r._a.avgN, r._a.trendPct, ...r._e.fin, r._e.fcSum, r._e.fcL, isFinite(r._e.dev) ? r._e.dev : null, r._e.devPlan, r._e.locked, r._e.alerts.map((a) => ALERT_TYPES[a.t]).join('; ')]);
    const f1 = [null, null, null, null, null, null, null, null, null, F_DEC, null, F_DEC, F_PCT, ...ml.map(() => F_INT), F_INT, F_INT, F_PCT, F_PCT, F_INT, null];
    const w1 = [30, 24, 10, 10, 14, 13, 44, 20, 9, 8, 7, 10, 10, ...ml.map(() => 9), 11, 11, 11, 11, 10, 40];
    XLSX.utils.book_append_sheet(wb, buildSheet(`Forecast final (${U}) = base estadística/corregida + proyectos VULOPPS ≥${S.projThreshold}%`, h1, d1, f1, w1, stamp), 'Forecast Final');
    if (state.projects.length) {
      // Base sin proyectos y capa de proyectos por separado
      const hb = ['Key', 'Cliente', 'SKU', 'Descripción', ...ml.map((m) => 'Base ' + m), 'Total base', ...ml.map((m) => 'Proy. ' + m), 'Total proyectos'];
      const db = rows.filter((r) => r._e.fcSum || r._e.projSum).map((r) => { const pj = state.projRow[r.id] || ml.map(() => 0); return [r.key, r.client, isNaN(+r.sku) ? r.sku : +r.sku, r.desc, ...state.fc[r.id], r._e.baseSum, ...pj, r._e.projSum]; });
      XLSX.utils.book_append_sheet(wb, buildSheet(`Forecast base vs proyectos (${U})`, hb, db, [null, null, null, null, ...ml.map(() => F_INT), F_INT, ...ml.map(() => F_INT), F_INT], [30, 24, 10, 44], stamp), 'Base vs Proyectos');
    }

    // 2) Resumen por Producto
    const sp = summarize(rows, (r) => r.sku, (o, rs) => { o.desc = rs[0].desc; o.group = rs[0].group; o.pac = rs[0].pac; o.clients = new Set(rs.map((r) => r.client)).size; })
      .sort((a, b) => b.fcL - a.fcL);
    const h2 = ['SKU', 'Descripción', 'Grupo', 'PAC (L)', 'Clientes', `Prom ${S.window}m (${U})`, ...ml, `Total (${U})`, 'Total (L)', 'Plan anterior (L)', 'Var. vs prom', 'Var. vs plan', 'Filas con alertas'];
    const d2 = sp.map((o) => [isNaN(+o.k) ? o.k : +o.k, o.desc, o.group, o.pac || null, o.clients, o.avgU, ...o.monthsU, o.fcU, o.fcL, o.planL, o.var, o.varPlan, o.alerts]);
    const f2 = [null, null, null, F_DEC, F_INT, F_DEC, ...ml.map(() => F_INT), F_INT, F_INT, F_INT, F_PCT, F_PCT, F_INT];
    XLSX.utils.book_append_sheet(wb, buildSheet('Resumen por producto', h2, d2, f2, [10, 44, 20, 8, 9, 12, ...ml.map(() => 9), 11, 11, 13, 11, 11, 10], stamp), 'Resumen por Producto');

    // 3) Resumen por Cliente (litros)
    const sc = summarize(rows, (r) => r.client, (o, rs) => { o.kam = [...new Set(rs.map((r) => r.kam).filter(Boolean))].join(', '); }).sort((a, b) => b.fcL - a.fcL);
    const h3 = ['Cliente', 'KAM', 'Combinaciones activas', `Prom ${S.window}m (L/mes)`, ...ml.map((m) => m + ' (L)'), 'Total (L)', 'Plan anterior (L)', 'Var. vs prom', 'Var. vs plan', 'Filas con alertas'];
    const d3 = sc.map((o) => [o.k, o.kam, o.active, o.avgL, ...o.monthsL, o.fcL, o.planL, o.var, o.varPlan, o.alerts]);
    const tAvg = sum(sc.map((o) => o.avgL)), tFc = sum(sc.map((o) => o.fcL)), tPlan = sum(sc.map((o) => o.planL)), tFc3 = sum(sc.map((o) => o.fc3L));
    d3.push(['TOTAL', '', sum(sc.map((o) => o.active)), tAvg, ...ml.map((_, i) => sum(sc.map((o) => o.monthsL[i]))), tFc, tPlan, tAvg ? tFc3 / tAvg - 1 : null, tPlan ? tFc / tPlan - 1 : null, sum(sc.map((o) => o.alerts))]);
    const f3 = [null, null, F_INT, F_INT, ...ml.map(() => F_INT), F_INT, F_INT, F_PCT, F_PCT, F_INT];
    XLSX.utils.book_append_sheet(wb, buildSheet('Resumen por cliente (litros)', h3, d3, f3, [26, 14, 12, 13, ...ml.map(() => 11), 12, 13, 11, 11, 10], stamp), 'Resumen por Cliente');

    // 4) Alertas
    const al = allAlerts(rows).sort((a, b) => SEV[b.sev][2] - SEV[a.sev][2] || b.r._e.avgL - a.r._e.avgL);
    const h4 = ['Severidad', 'Tipo', 'Cliente', 'KAM', 'SKU', 'Descripción', 'Detalle', `Prom ${S.window}m (${U})`, `Forecast total (${U})`];
    const d4 = al.map((a) => [SEV[a.sev][0], ALERT_TYPES[a.t], a.r.client, a.r.kam, isNaN(+a.r.sku) ? a.r.sku : +a.r.sku, a.r.desc, a.msg, a.r._a.avgN, a.r._e.fcSum]);
    XLSX.utils.book_append_sheet(wb, buildSheet('Alertas', h4, d4, [null, null, null, null, null, null, null, F_DEC, F_INT], [10, 28, 24, 10, 10, 44, 70, 12, 14], stamp), 'Alertas');

    // 5) Proyectos con el formato de la hoja VULOPPS (para pegar en el archivo)
    if (state.projects.length) {
      const yms = M.fcMonths.map((k) => +k.replace('-', ''));
      const hp = ['InvoicingCountry', 'VulOps', '%', 'VulOpsName', 'OMP GROUP', 'MRP', 'SKU', 'SKU Description', ...yms, 'Total YTG', 'Incluido en forecast', 'Origen'];
      const dp = state.projects.map((p) => ['ARGENTINA', p.type, p.prob / 100, p.name, p.client, '', isNaN(+p.sku) ? p.sku : +p.sku, p.desc, ...M.fcMonths.map((k) => p.liters[k] || 0), sum(Object.values(p.liters)), p._incl ? 'Sí' : 'No (< ' + S.projThreshold + '%)', p.source]);
      XLSX.utils.book_append_sheet(wb, buildSheet('Proyectos (formato VULOPPS, litros)', hp, dp, [null, null, F_PCT, null, null, null, null, null, ...yms.map(() => F_INT), F_INT, null, null], [14, 8, 7, 30, 24, 6, 10, 40], stamp), 'Proyectos');
    }

    // 6) Parámetros
    const methodName = { avg: 'Promedio últimos N meses', trend: 'Tendencia lineal', growth: `Promedio + ${S.growthPct}%`, seasonal: 'Promedio × índice estacional' }[S.method];
    const info = [
      ['Parámetro', 'Valor'],
      ['Fecha de generación', now.toLocaleString('es-AR')], ['Archivo origen', M.fileName],
      ['Hojas usadas', [M.sheets.forecast, M.sheets.actuals].filter(Boolean).join(' + ')],
      ['Unidad base', U], ['Último mes real', mLabel(M.lastActual)], ['Horizonte', ml[0] + ' a ' + ml.at(-1)],
      ['Ventana de análisis', S.window + ' meses'], ['Umbral de proyectos VULOPPS', '≥ ' + S.projThreshold + '% de probabilidad'],
      ['Meses de historia excluidos (proyectos)', sum(Object.values(state.excl).map((a) => a.length))], ['Método sugerido', methodName], ['Umbral de alerta', S.alertPct + '%'],
      ['Combinaciones exportadas', rows.length], ['Celdas bloqueadas (manuales)', sum(rows.map((r) => r._e.locked))],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(info); wsI['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsI, 'Parámetros');

    const base = M.fileName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
    const fname = `Forecast_Final_${base}_${now.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1_')}.xlsx`;
    XLSX.writeFile(wb, fname, { compression: true });
    saveSnapshot();
    toast('Excel generado: ' + fname);
  }

  /* ===================================================================
     9. CONFIGURACIÓN Y SNAPSHOTS
     =================================================================== */
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportConfig() {
    const overrides = {};
    state.rows.forEach((r) => {
      const man = state.manual[r.id]; if (!man || !man.some(Boolean)) return;
      overrides[r.id] = {};
      man.forEach((v, i) => { if (v) overrides[r.id][state.meta.fcMonths[i]] = state.fc[r.id][i]; });
    });
    download('forecast-config_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ type: 'forecast-config', v: 1, exportedAt: new Date().toISOString(), sourceFile: state.meta && state.meta.fileName, settings: state.settings, overrides, excl: state.excl, projects: state.projects.filter((p) => p.source === 'manual').map(({ _row, _incl, _noPac, ...pj }) => pj) }, null, 1));
    toast('Configuración exportada (' + Object.keys(overrides).length + ' filas con valores manuales)');
  }
  function importConfig(text) {
    const c = JSON.parse(text);
    if (c.type !== 'forecast-config') throw new Error('El archivo no es una configuración de esta herramienta');
    state.settings = { ...DEFAULT_SETTINGS, ...(c.settings || {}) };
    let n = 0, miss = 0;
    if (state.meta) {
      analyzeAll();
      Object.entries(c.overrides || {}).forEach(([id, months]) => {
        if (!state.byId.has(id)) { miss++; return; }
        Object.entries(months).forEach(([k, v]) => {
          const i = state.meta.fcMonths.indexOf(k);
          if (i >= 0) { state.fc[id][i] = v; state.manual[id][i] = 1; n++; }
        });
      });
      if (c.excl) Object.assign(state.excl, c.excl);
      (c.projects || []).forEach((pj) => { if (!state.projects.some((x) => x.id === pj.id)) state.projects.push(pj); });
      analyzeAll(); touch(); refreshGrid(true);
    }
    toast(`Configuración importada: reglas + ${n} valores manuales` + (miss ? ` (${miss} filas no existen en este archivo)` : ''));
    state.dirty.add('settings'); renderView();
  }
  function loadSnaps() { try { return JSON.parse(localStorage.getItem(LS_SNAPS) || '[]'); } catch (e) { return []; } }
  function saveSnapshot() {
    const data = {};
    state.rows.forEach((r) => {
      const o = {}; r._e.fin.forEach((v, i) => { if (v) o[state.meta.fcMonths[i]] = v; });
      if (Object.keys(o).length) data[r.id] = o;
    });
    const snaps = loadSnaps().filter((s) => s.lastActual !== state.meta.lastActual); // una foto por ciclo
    snaps.unshift({ id: Date.now(), createdAt: Date.now(), fileName: state.meta.fileName, lastActual: state.meta.lastActual, data });
    try { localStorage.setItem(LS_SNAPS, JSON.stringify(snaps.slice(0, 6))); } catch (e) { toast('No se pudo guardar el snapshot (espacio local lleno)', true); }
    state.dirty.add('settings');
  }

  /* ===================================================================
     10. INICIALIZACIÓN Y EVENTOS
     =================================================================== */
  function indexRows() { state.byId = new Map(state.rows.map((r) => [r.id, r])); }

  function afterDataReady() {
    indexRows();
    analyzeAll();
    fillFilterOptions();
    const M = state.meta;
    $id('fileInfo').innerHTML = `<b>${esc(M.fileName)}</b><br>${nf0.format(state.rows.length)} combinaciones · ${M.histMonths.length} meses de historia<br>Hojas: ${esc([M.sheets.forecast, M.sheets.actuals].filter(Boolean).join(' + '))} · unidad ${M.unit === 'pz' ? 'piezas' : M.unit}`;
    $id('btnExport').disabled = false;
    document.querySelectorAll('.nav-item').forEach((b) => (b.disabled = false));
    if (grid) { grid.destroy(); $('#tblGrid').empty(); grid = null; }
    $id('monthSel').innerHTML = '';
    state.undo = []; $id('btnUndo').disabled = true;
    touch();
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/\.(xlsx|xlsb|xlsm|xls)$/i.test(file.name)) { toast('Formato no soportado: usá .xlsx o .xlsb', true); return; }
    try {
      const prev = state.meta && Object.values(state.manual).some((m) => m.some(Boolean)) ? { months: state.meta.fcMonths } : null;
      const { meta, rows, projects } = await parseFile(file);
      if (!rows.length) throw new Error('El archivo no tiene filas de datos reconocibles.');
      const keep = prev && confirm('Hay valores editados a mano de la sesión anterior.\n¿Conservarlos en este archivo para los meses que coincidan?') ? prev : null;
      loading('Calculando análisis y forecast sugerido…'); await nextTick();
      state.meta = meta; state.rows = rows; state.selected.clear();
      // proyectos: los de VULOPPS del archivo nuevo + los cargados a mano en la app
      state.projects = [...projects, ...state.projects.filter((p) => p.source === 'manual')];
      indexRows();
      state.rows.forEach((r) => { r._a = analyze(r); }); // el sugerido se necesita antes de inicializar el forecast
      initForecast(keep);
      buildProjLayer(); // puede crear filas nuevas para proyectos de productos sin historia
      afterDataReady();
      showView('dashboard');
      const nInc = state.projects.filter((p) => p._incl).length;
      toast(`Archivo cargado en ${(meta.parseMs / 1000).toFixed(1)} s: ${nf0.format(rows.length)} combinaciones · VULOPPS: ${state.projects.length} proyectos (${nInc} ≥ ${state.settings.projThreshold}%)`);
    } catch (e) {
      console.error(e);
      toast('No se pudo leer el archivo: ' + e.message, true);
    } finally { loading(null); }
  }

  function bindEvents() {
    // navegación
    document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
    $id('btnMenu').addEventListener('click', () => $id('sidebar').classList.toggle('open'));
    $id('btnFilters').addEventListener('click', () => $id('filters').classList.toggle('open'));

    // carga de archivo (botón + drag & drop)
    const pick = () => $id('fileInput').click();
    $id('btnLoad').addEventListener('click', pick); $id('btnLoad2').addEventListener('click', pick);
    $id('fileInput').addEventListener('change', (e) => { handleFile(e.target.files[0]); e.target.value = ''; });
    const dz = $id('dropzone');
    ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' || e.target === dz) dz.classList.remove('over'); }));
    document.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) handleFile(f); });

    $id('btnExport').addEventListener('click', () => { try { exportExcel(); } catch (e) { console.error(e); toast('Error al exportar: ' + e.message, true); } });

    // filtros
    const fmap = { fClient: 'client', fKam: 'kam', fGroup: 'group', fClass: 'cls', fStatus: 'status' };
    Object.entries(fmap).forEach(([id, k]) => $id(id).addEventListener('change', (e) => { state.filters[k] = e.target.value; onFiltersChanged(); }));
    $id('fText').addEventListener('input', debounce((e) => { state.filters.text = e.target.value; onFiltersChanged(); }, 250));
    $id('fHideDead').addEventListener('change', (e) => { state.filters.hideDead = e.target.checked; onFiltersChanged(); });
    $id('btnClearFilters').addEventListener('click', () => { Object.assign(state.filters, { client: '', kam: '', group: '', cls: '', text: '', status: '', hideDead: true }); syncFilterInputs(); onFiltersChanged(); });

    // edición de celdas (grilla y vista mensual)
    const tables = document.querySelectorAll('#tblGrid, #tblMonth');
    tables.forEach((t) => {
      t.addEventListener('change', (e) => { if (e.target.classList.contains('fc-in')) commitInput(e.target); });
      t.addEventListener('focusin', (e) => { if (e.target.classList.contains('fc-in')) e.target.select(); });
      t.addEventListener('keydown', (e) => {
        const inp = e.target; if (!inp.classList.contains('fc-in')) return;
        if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const tr = inp.closest('tr'); const m = inp.dataset.m;
          const target = e.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling;
          inp.blur(); // dispara change → commit
          const nxt = target && target.querySelector(`.fc-in[data-m="${m}"]`);
          if (nxt) nxt.focus();
        } else if (e.key === 'Escape') {
          inp.value = fmt(state.fc[inp.dataset.id][+inp.dataset.m]); inp.blur();
        }
      });
    });

    // selección de filas
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('rsel')) { e.target.checked ? state.selected.add(e.target.dataset.id) : state.selected.delete(e.target.dataset.id); updateScopeLabel(); }
      if (e.target.id === 'selAll') {
        const rows = grid ? grid.rows({ page: 'current' }).data().toArray() : [];
        rows.forEach((r) => (e.target.checked ? state.selected.add(r.id) : state.selected.delete(r.id)));
        document.querySelectorAll('#tblGrid .rsel').forEach((c) => (c.checked = e.target.checked));
        updateScopeLabel();
      }
    });

    // links: detalle, cliente, sku, borrar snapshot
    document.addEventListener('click', (e) => {
      const fr = e.target.closest('[data-fmrow]'); if (fr) { openForecastModal('row', fr.dataset.fmrow); return; }
      const fc = e.target.closest('[data-fmclient]'); if (fc) { openForecastModal('client', fc.dataset.fmclient); return; }
      const d = e.target.closest('[data-detail]'); if (d) { openDrawer(d.dataset.detail); return; }
      const c = e.target.closest('[data-client]'); if (c) { goFiltered({ client: c.dataset.client }); return; }
      const s = e.target.closest('[data-sku]'); if (s) { goFiltered({ text: s.dataset.sku }); return; }
      const ds = e.target.closest('[data-delsnap]');
      if (ds) { localStorage.setItem(LS_SNAPS, JSON.stringify(loadSnaps().filter((x) => String(x.id) !== ds.dataset.delsnap))); renderSettings(); touch(); }
    });

    // acciones masivas
    $id('mAction').addEventListener('change', updateParamField);
    $id('btnApply').addEventListener('click', () => {
      const action = $id('mAction').value;
      let from = +$id('mFrom').value, to = +$id('mTo').value; if (from > to) [from, to] = [to, from];
      const scope = $id('mScope').value;
      const rows = scope === 'selected' ? state.rows.filter((r) => state.selected.has(r.id)) : filteredRows();
      if (!rows.length) { toast(scope === 'selected' ? 'No hay filas seleccionadas' : 'No hay filas con los filtros actuales', true); return; }
      let param = 0;
      if (action === 'pct' || action === 'value') {
        param = parseNum($id('mParam').value);
        if (isNaN(param) || $id('mParam').value === '') { toast('Ingresá un valor', true); return; }
      }
      if (action === 'cleanspikes' || action === 'restorehist') {
        let n = 0;
        rows.forEach((r) => {
          if (action === 'restorehist') { if (state.excl[r.id]) { n += state.excl[r.id].length; delete state.excl[r.id]; } }
          else if (r._a.spikes.length) { const ex = state.excl[r.id] || (state.excl[r.id] = []); r._a.spikes.forEach((k) => { if (!ex.includes(k)) { ex.push(k); n++; } }); }
          r._a = analyze(r); evalRow(r);
        });
        touch(); refreshGrid();
        toast(action === 'restorehist' ? `${n} meses vuelven a contar en la estadística` : `${n} meses marcados como proyecto. Los promedios se recalcularon: usá “Completar con sugerido” para actualizar el forecast base.`);
        return;
      }
      if (rows.length > 200 && !confirm(`La acción se aplicará a ${nf0.format(rows.length)} filas (meses ${mLabel(state.meta.fcMonths[from])} a ${mLabel(state.meta.fcMonths[to])}). ¿Continuar?`)) return;
      const n = massApply(rows, action, from, to, param, $id('mOnlyEmpty').checked);
      refreshGrid();
      toast(`${nf0.format(n)} celdas actualizadas en ${nf0.format(rows.length)} filas` + (['lock', 'unlock'].includes(action) ? '' : ' (las bloqueadas no se tocan)'));
    });
    $id('btnUndo').addEventListener('click', undo);
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.matches('input, textarea')) { e.preventDefault(); undo(); } });

    // vista mensual
    $id('monthSel').addEventListener('change', () => { state.dirty.add('monthly'); renderView(); });

    // drawer
    $id('dwClose').addEventListener('click', closeDrawer);
    $id('backdrop').addEventListener('click', closeDrawer);
    document.querySelectorAll('[data-rowact]').forEach((b) => b.addEventListener('click', () => {
      if (!drawerId) return;
      if (b.dataset.rowact === 'modal') { openForecastModal('row', drawerId); return; }
      const r = state.byId.get(drawerId), act = b.dataset.rowact, H = state.meta.fcMonths.length - 1;
      const n = massApply([r], act, 0, H, 0, false);
      refreshGridRowFull(r.id); openDrawer(r.id);
      toast(`${n} celdas actualizadas`);
    }));

    // configuración
    $id('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const nv = {
        window: Math.min(12, Math.max(3, +f.window.value || 6)), method: f.method.value, growthPct: parseNum(f.growthPct.value) || 0,
        alertPct: Math.max(5, +f.alertPct.value || 50), spikeFactor: Math.max(1.5, +f.spikeFactor.value || 3),
        histVisible: Math.min(24, Math.max(0, +f.histVisible.value)), initFrom: f.initFrom.value,
      };
      state.settings = nv;
      if (state.meta) { analyzeAll(); touch(); if (grid) { grid.destroy(); $('#tblGrid').empty(); grid = null; } }
      saveSession(); renderSettings();
      toast('Reglas guardadas y recalculadas');
    });
    $id('btnCfgExport').addEventListener('click', exportConfig);
    $id('btnCfgImport').addEventListener('click', () => $id('cfgInput').click());
    $id('cfgInput').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { importConfig(await f.text()); } catch (err) { toast('No se pudo importar: ' + err.message, true); }
    });
    $id('btnReset').addEventListener('click', () => {
      if (!confirm('Se borran los datos cargados, las ediciones y la configuración guardada en este navegador. ¿Continuar?')) return;
      localStorage.removeItem(LS_SESSION); localStorage.removeItem(LS_SNAPS); location.reload();
    });
  }

  function refreshGridRowFull(id) {
    if (!grid || state.view !== 'grid') { state.dirty.add('grid'); return; }
    const row = grid.row('#row-' + id); if (row.any()) row.invalidate('data');
  }

  function updateParamField() {
    const a = $id('mAction').value;
    $id('mParamWrap').hidden = !(a === 'pct' || a === 'value');
    $id('mFrom').disabled = $id('mTo').disabled = $id('mOnlyEmpty').disabled = a === 'cleanspikes' || a === 'restorehist';
    $id('mParamLabel').textContent = a === 'pct' ? '% (ej. 10 o -15)' : 'Valor';
  }
  function updateScopeLabel() {
    const o = $id('mScope').options[1];
    o.textContent = `Filas seleccionadas (${state.selected.size})`;
    if (state.selected.size) $id('mScope').value = 'selected';
  }

  function init() {
    bindEvents();
    bindModalEvents();
    bindProjectEvents();
    updateParamField();
    document.querySelectorAll('.nav-item').forEach((b) => (b.disabled = b.dataset.view !== 'settings'));
    if (loadSession()) {
      indexRows();
      // validar que la sesión tenga forecast para todas las filas
      state.rows.forEach((r) => { if (!state.fc[r.id]) { state.fc[r.id] = state.meta.fcMonths.map(() => 0); state.manual[r.id] = state.meta.fcMonths.map(() => 0); } });
      afterDataReady();
      showView('dashboard');
      $id('saveState').textContent = 'Sesión restaurada';
      toast('Sesión anterior restaurada: ' + state.meta.fileName);
    } else {
      showView('empty');
    }
  }

  // Exponer para depuración en consola
  window.FC = { state, analyzeAll, exportExcel, openForecastModal, projectCurve };
  document.addEventListener('DOMContentLoaded', init);
})();

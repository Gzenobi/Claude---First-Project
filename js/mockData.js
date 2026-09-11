/* ==========================================================================
   mockData.js — Domain constants + realistic seed data generator for
   industrial coatings (mining, oil & gas, energy, infrastructure,
   manufacturing). Exposes window.CRM.Constants and window.CRM.MockData.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var SEGMENTS = ['Minería', 'Oil & Gas', 'Energía', 'Infraestructura', 'Manufactura'];

  var PROJECT_STAGES = [
    { key: 'Prospecto', color: 'gray', probability: 10 },
    { key: 'Calificación', color: 'navy', probability: 25 },
    { key: 'Cotización', color: 'sky', probability: 45 },
    { key: 'Prueba Técnica', color: 'ultramarine', probability: 60 },
    { key: 'Negociación', color: 'violet', probability: 75 },
    { key: 'Ganado', color: 'purple', probability: 100 },
    { key: 'Perdido', color: 'fuchsia', probability: 0 }
  ];

  var ACTIVITY_TYPES = ['Visita', 'Llamada', 'Email', 'Reunión', 'Inspección Técnica', 'Demo', 'Seguimiento'];

  var COATING_SYSTEMS = [
    'Interzinc 22 + Intergard 269 + Interthane 990',
    'Interseal 670HS + Interthane 990',
    'Intertherm 228HS (alta temperatura)',
    'Interzinc 315 + Interfine 629HS',
    'Interline 850 (revestimiento interior tanques)',
    'Intergard 251HS + Interfine 878',
    'Chartek 2218 (protección pasiva contra fuego)',
    'Interseal 6100HS (splash zone)'
  ];

  var COMPETITORS = ['Sherwin-Williams', 'Jotun', 'PPG Protective & Marine', 'Hempel', 'Sika', 'Ninguno identificado'];

  var MATERIAL_CATEGORIES = ['Imprimante (Primer)', 'Intermedio', 'Acabado (Topcoat)', 'Diluyente / Thinner', 'Protección pasiva contra fuego', 'Accesorios', 'Otro'];
  var MATERIAL_UNITS = ['Litro', 'Galón (3.785 L)', 'Kg', 'Balde 20 L', 'Tambor 200 L', 'Unidad'];
  var MATERIAL_CATALOG = [
    { codigo: 'IZ-22', nombre: 'Interzinc 22', categoria: 'Imprimante (Primer)', unidad: 'Balde 20 L', precioUnitario: 8.9 },
    { codigo: 'IZ-315', nombre: 'Interzinc 315', categoria: 'Imprimante (Primer)', unidad: 'Balde 20 L', precioUnitario: 9.4 },
    { codigo: 'IG-269', nombre: 'Intergard 269', categoria: 'Intermedio', unidad: 'Balde 20 L', precioUnitario: 7.1 },
    { codigo: 'IG-251HS', nombre: 'Intergard 251HS', categoria: 'Intermedio', unidad: 'Balde 20 L', precioUnitario: 7.6 },
    { codigo: 'IS-670HS', nombre: 'Interseal 670HS', categoria: 'Intermedio', unidad: 'Balde 20 L', precioUnitario: 8.2 },
    { codigo: 'IS-6100HS', nombre: 'Interseal 6100HS', categoria: 'Intermedio', unidad: 'Balde 20 L', precioUnitario: 9.8 },
    { codigo: 'IT-990', nombre: 'Interthane 990', categoria: 'Acabado (Topcoat)', unidad: 'Balde 20 L', precioUnitario: 11.3 },
    { codigo: 'IF-629HS', nombre: 'Interfine 629HS', categoria: 'Acabado (Topcoat)', unidad: 'Balde 20 L', precioUnitario: 12.1 },
    { codigo: 'IF-878', nombre: 'Interfine 878', categoria: 'Acabado (Topcoat)', unidad: 'Balde 20 L', precioUnitario: 12.8 },
    { codigo: 'ITH-228HS', nombre: 'Intertherm 228HS', categoria: 'Acabado (Topcoat)', unidad: 'Balde 20 L', precioUnitario: 14.5 },
    { codigo: 'IL-850', nombre: 'Interline 850', categoria: 'Acabado (Topcoat)', unidad: 'Tambor 200 L', precioUnitario: 10.6 },
    { codigo: 'CH-2218', nombre: 'Chartek 2218', categoria: 'Protección pasiva contra fuego', unidad: 'Balde 20 L', precioUnitario: 22.4 },
    { codigo: 'THIN-01', nombre: 'Diluyente GTA220', categoria: 'Diluyente / Thinner', unidad: 'Balde 20 L', precioUnitario: 4.2 },
    { codigo: 'THIN-08', nombre: 'Diluyente GTA015', categoria: 'Diluyente / Thinner', unidad: 'Balde 20 L', precioUnitario: 4.6 },
    { codigo: 'ACC-ROD', nombre: 'Rodillo antipelusa 9"', categoria: 'Accesorios', unidad: 'Unidad', precioUnitario: 3.5 },
    { codigo: 'ACC-BROC', nombre: 'Brocha profesional 4"', categoria: 'Accesorios', unidad: 'Unidad', precioUnitario: 5.1 }
  ];
  var SUPPLIERS = ['AkzoNobel Cono Sur', 'Distribuidor autorizado Norte', 'Distribuidor autorizado Centro', 'Importación directa'];

  var CITIES = [
    { ciudad: 'Antofagasta', pais: 'Chile' },
    { ciudad: 'Calama', pais: 'Chile' },
    { ciudad: 'Concepción', pais: 'Chile' },
    { ciudad: 'Buenos Aires', pais: 'Argentina' },
    { ciudad: 'Bahía Blanca', pais: 'Argentina' },
    { ciudad: 'Neuquén', pais: 'Argentina' },
    { ciudad: 'Lima', pais: 'Perú' },
    { ciudad: 'Ilo', pais: 'Perú' },
    { ciudad: 'Montevideo', pais: 'Uruguay' },
    { ciudad: 'Santa Cruz', pais: 'Bolivia' }
  ];

  var CLIENT_NAMES = [
    { nombre: 'Minera Los Andes S.A.', segmento: 'Minería', planta: 'Planta Concentradora Norte' },
    { nombre: 'Compañía Minera del Pacífico', segmento: 'Minería', planta: 'Puerto de Embarque' },
    { nombre: 'Cobre Austral Ltda.', segmento: 'Minería', planta: 'Planta de Chancado' },
    { nombre: 'PetroSur Oil & Gas', segmento: 'Oil & Gas', planta: 'Refinería Costa Norte' },
    { nombre: 'Refinería Bahía Central', segmento: 'Oil & Gas', planta: 'Unidad de Destilación' },
    { nombre: 'Gasoducto Andino S.A.', segmento: 'Oil & Gas', planta: 'Estación de Compresión' },
    { nombre: 'Central Térmica del Sur', segmento: 'Energía', planta: 'Central Ciclo Combinado' },
    { nombre: 'Eólica Patagonia Energy', segmento: 'Energía', planta: 'Parque Eólico Punta Alta' },
    { nombre: 'Hidroeléctrica Río Claro', segmento: 'Energía', planta: 'Casa de Máquinas' },
    { nombre: 'Puerto Central Infraestructura', segmento: 'Infraestructura', planta: 'Terminal Portuario' },
    { nombre: 'Constructora Vial Andes', segmento: 'Infraestructura', planta: 'Puente Río Grande' },
    { nombre: 'Metro Regional S.A.', segmento: 'Infraestructura', planta: 'Depósito de Trenes' },
    { nombre: 'Acería del Pacífico', segmento: 'Manufactura', planta: 'Planta Laminación' },
    { nombre: 'Industrias Metalúrgicas Sur', segmento: 'Manufactura', planta: 'Taller de Estructuras' },
    { nombre: 'Astilleros Australes', segmento: 'Manufactura', planta: 'Dique de Reparaciones' },
    { nombre: 'Minera Altiplano', segmento: 'Minería', planta: 'Depósito de Relaves' },
    { nombre: 'Oleoducto Trasandino', segmento: 'Oil & Gas', planta: 'Estación de Bombeo 4' },
    { nombre: 'Parque Solar Desierto Azul', segmento: 'Energía', planta: 'Subestación Eléctrica' },
    { nombre: 'Aeropuerto Internacional Sur', segmento: 'Infraestructura', planta: 'Terminal de Carga' },
    { nombre: 'Papelera del Bío Bío', segmento: 'Manufactura', planta: 'Planta de Celulosa' }
  ];

  var FIRST_NAMES = ['Javier', 'María', 'Carlos', 'Fernanda', 'Andrés', 'Camila', 'Rodrigo', 'Valentina', 'Sebastián', 'Daniela'];
  var LAST_NAMES = ['Muñoz', 'Rojas', 'Fernández', 'Silva', 'Vargas', 'Torres', 'Contreras', 'Peña', 'Reyes', 'Espinoza'];
  var SALES_REPS = ['Gabriel Zenobi', 'Lucía Fernández', 'Martín Suárez', 'Paula Cabrera'];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randDateWithinDays(daysBack, daysFwd) {
    var now = Date.now();
    var offset = randInt(-daysBack, daysFwd) * 86400000;
    return new Date(now + offset);
  }
  function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 10); }

  function generateClients() {
    return CLIENT_NAMES.map(function (base, idx) {
      var loc = rand(CITIES);
      var fn = rand(FIRST_NAMES), ln = rand(LAST_NAMES);
      var now = new Date().toISOString();
      return {
        id: uid('cli'),
        nombre: base.nombre,
        segmento: base.segmento,
        planta: base.planta,
        ciudad: loc.ciudad,
        pais: loc.pais,
        contacto: fn + ' ' + ln,
        email: (fn + '.' + ln).toLowerCase().replace(/\s/g, '') + '@' + base.nombre.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') + '.com',
        telefono: '+56 9 ' + randInt(6000, 9999) + ' ' + randInt(1000, 9999),
        competidor: rand(COMPETITORS),
        potencialAnual: randInt(40000, 950000),
        observaciones: 'Cliente clasificado como cuenta ' + (idx % 3 === 0 ? 'estratégica' : 'activa') + ' del segmento ' + base.segmento.toLowerCase() + '.',
        createdAt: now,
        updatedAt: now
      };
    });
  }

  function generateProjects(clients) {
    var projectNames = [
      'Recubrimiento estructuras metálicas', 'Protección contra corrosión tanques', 'Pintura de tuberías de proceso',
      'Recubrimiento piso industrial', 'Protección pasiva contra fuego', 'Repintado casco y cubierta',
      'Recubrimiento interior estanques', 'Sistema anticorrosivo puente grúa', 'Protección splash zone muelle',
      'Recubrimiento silos de almacenamiento', 'Pintura de mantenimiento correctivo', 'Recubrimiento chimenea industrial'
    ];
    var projects = [];
    clients.forEach(function (client, idx) {
      var numProjects = randInt(1, 3);
      for (var i = 0; i < numProjects; i++) {
        var stage = rand(PROJECT_STAGES);
        var now = new Date().toISOString();
        var isClosed = stage.key === 'Ganado' || stage.key === 'Perdido';
        var valor = randInt(15000, 480000);
        projects.push({
          id: uid('prj'),
          clienteId: client.id,
          nombreProyecto: rand(projectNames) + ' — ' + client.planta,
          segmento: client.segmento,
          coatingSystem: rand(COATING_SYSTEMS),
          estado: stage.key,
          valor: valor,
          volumenLitros: Math.round(valor / randInt(35, 65)),
          probabilidad: stage.probability,
          fechaCierre: randDateWithinDays(isClosed ? 60 : 10, isClosed ? -1 : 120).toISOString(),
          responsable: rand(SALES_REPS),
          competidor: client.competidor,
          notasTecnicas: 'Sistema evaluado según condiciones ambientales de ' + client.ciudad + ', categoría de corrosividad estimada C4-C5.',
          createdAt: now,
          updatedAt: now
        });
      }
    });
    return projects;
  }

  function generateActivities(clients, projects) {
    var activities = [];
    var titles = {
      'Visita': 'Visita técnica a planta',
      'Llamada': 'Llamada de seguimiento comercial',
      'Email': 'Envío de propuesta técnica por email',
      'Reunión': 'Reunión de revisión de proyecto',
      'Inspección Técnica': 'Inspección de condiciones de superficie',
      'Demo': 'Demostración de producto en terreno',
      'Seguimiento': 'Seguimiento post-cotización'
    };
    for (var i = 0; i < 45; i++) {
      var client = rand(clients);
      var clientProjects = projects.filter(function (p) { return p.clienteId === client.id; });
      var project = clientProjects.length ? rand(clientProjects) : null;
      var tipo = rand(ACTIVITY_TYPES);
      var fecha = randDateWithinDays(20, 15);
      var isPast = fecha.getTime() < Date.now();
      var estado = isPast ? (Math.random() > 0.25 ? 'Completada' : 'Vencida') : 'Pendiente';
      var now = new Date().toISOString();
      activities.push({
        id: uid('act'),
        tipo: tipo,
        clienteId: client.id,
        proyectoId: project ? project.id : null,
        titulo: titles[tipo] + ' — ' + client.nombre,
        descripcion: 'Actividad comercial registrada para ' + client.nombre + (project ? (' en el proyecto "' + project.nombreProyecto + '"') : '') + '.',
        fecha: fecha.toISOString(),
        responsable: rand(SALES_REPS),
        estado: estado,
        createdAt: now,
        updatedAt: now
      });
    }
    return activities.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
  }

  function generateMaterials() {
    var now = new Date().toISOString();
    return MATERIAL_CATALOG.map(function (item) {
      return Object.assign({}, item, {
        id: uid('mat'),
        stock: randInt(0, 400),
        proveedor: rand(SUPPLIERS),
        notas: '',
        createdAt: now,
        updatedAt: now
      });
    });
  }

  function generateAll() {
    var clients = generateClients();
    var projects = generateProjects(clients);
    var activities = generateActivities(clients, projects);
    var materials = generateMaterials();
    return { clients: clients, projects: projects, activities: activities, materials: materials };
  }

  CRM.Constants = {
    SEGMENTS: SEGMENTS,
    PROJECT_STAGES: PROJECT_STAGES,
    PROJECT_STAGE_KEYS: PROJECT_STAGES.map(function (s) { return s.key; }),
    ACTIVITY_TYPES: ACTIVITY_TYPES,
    COATING_SYSTEMS: COATING_SYSTEMS,
    COMPETITORS: COMPETITORS,
    SALES_REPS: SALES_REPS,
    ACTIVITY_STATES: ['Pendiente', 'Completada', 'Vencida'],
    MATERIAL_CATEGORIES: MATERIAL_CATEGORIES,
    MATERIAL_UNITS: MATERIAL_UNITS
  };

  CRM.MockData = { generateAll: generateAll };

})(window);

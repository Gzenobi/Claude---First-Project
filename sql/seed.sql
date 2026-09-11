-- ============================================================================
-- Mock data for local development / demo.
-- Run AFTER schema.sql. Safe to re-run (idempotent via ON CONFLICT / deletes).
-- Demo password for every seeded user: Akzo2024!
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Demo auth users (Supabase auth.users). Profiles are created automatically
-- by the on_auth_user_created trigger, reading role from raw_user_meta_data.
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'admin@akzonobel-demo.com', crypt('Akzo2024!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Gerencia Comercial","role":"admin"}',
    now(), now(), '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'vendedor1@akzonobel-demo.com', crypt('Akzo2024!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Martina Ferreyra","role":"sales_user"}',
    now(), now(), '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'vendedor2@akzonobel-demo.com', crypt('Akzo2024!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Bruno Castellano","role":"sales_user"}',
    now(), now(), '', ''
  )
on conflict (email) do nothing;

-- Mirror identities row (required by Supabase Auth for email/password login)
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', now(), now(), now()
from auth.users u
where u.email in ('admin@akzonobel-demo.com', 'vendedor1@akzonobel-demo.com', 'vendedor2@akzonobel-demo.com')
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- ----------------------------------------------------------------------------
-- Mock clients
-- ----------------------------------------------------------------------------
with sales1 as (select id from public.profiles where email = 'vendedor1@akzonobel-demo.com'),
     sales2 as (select id from public.profiles where email = 'vendedor2@akzonobel-demo.com')
insert into public.clients (
  owner_id, name, industry_segment, plant_name, city, country,
  contact_name, contact_position, contact_phone, contact_email,
  current_competitor, annual_potential_usd, notes
)
select owner_id, name, industry_segment, plant_name, city, country,
       contact_name, contact_position, contact_phone, contact_email,
       current_competitor, annual_potential_usd, notes
from (
  values
    ((select id from sales1), 'YPF Refinería La Plata', 'Oil & Gas', 'Complejo Industrial La Plata', 'La Plata', 'Argentina', 'Diego Roman', 'Jefe de Mantenimiento', '+54 221 555 0142', 'droman@ypf-demo.com', 'Sherwin-Williams', 850000::numeric, 'Proyecto de repintado de tanques de almacenamiento, alta prioridad.'),
    ((select id from sales1), 'Vale Base Metals', 'Minería', 'Planta Salta Norte', 'Salta', 'Argentina', 'Carla Núñez', 'Compras Técnicas', '+54 387 555 0198', 'cnunez@vale-demo.com', 'Jotun', 420000::numeric, 'Interesados en sistema epoxi de alto espesor para pisos.'),
    ((select id from sales1), 'Loma Negra Cementos', 'Cemento', 'Planta Olavarría', 'Olavarría', 'Argentina', 'Pablo Ibarra', 'Ingeniero de Planta', '+54 2284 555 0110', 'pibarra@lomanegra-demo.com', null, 260000::numeric, 'Requiere recubrimiento resistente a altas temperaturas.'),
    ((select id from sales2), 'TGS Transportadora de Gas', 'Oil & Gas', 'Terminal Bahía Blanca', 'Bahía Blanca', 'Argentina', 'Laura Sosa', 'Gerente Técnico', '+54 291 555 0177', 'lsosa@tgs-demo.com', 'PPG', 610000::numeric, 'Evaluando proveedor único regional para pipelines.'),
    ((select id from sales2), 'Aluar Aluminio Argentino', 'Metalurgia', 'Planta Puerto Madryn', 'Puerto Madryn', 'Argentina', 'Nicolás Vega', 'Jefe de Compras', '+54 280 555 0133', 'nvega@aluar-demo.com', 'Hempel', 380000::numeric, 'Piso industrial en área de fundición, alto tránsito.'),
    ((select id from sales2), 'Central Puerto Energía', 'Energía', 'Central Térmica Costanera', 'Buenos Aires', 'Argentina', 'Florencia Paz', 'Ingeniera de Confiabilidad', '+54 11 555 0199', 'fpaz@centralpuerto-demo.com', null, 190000::numeric, 'Repintado de estructuras metálicas expuestas a intemperie.')
) as t(owner_id, name, industry_segment, plant_name, city, country, contact_name, contact_position, contact_phone, contact_email, current_competitor, annual_potential_usd, notes);

-- ----------------------------------------------------------------------------
-- Mock projects
-- ----------------------------------------------------------------------------
insert into public.projects (
  owner_id, client_id, name, industry_segment, coating_type, status,
  estimated_value, currency, win_probability, estimated_close_date, competitor, technical_notes
)
select c.owner_id, c.id, p.name, c.industry_segment, p.coating_type, p.status,
       p.estimated_value, 'USD', p.win_probability, p.estimated_close_date, p.competitor, p.technical_notes
from public.clients c
join (
  values
    ('YPF Refinería La Plata', 'Recubrimiento de tanques', 'Interzinc + Intergard', 'negociacion', 320000::numeric, 70, current_date + interval '25 days', 'Sherwin-Williams', 'Preparación SA 2.5, espesor 250 micrones.'),
    ('Vale Base Metals', 'Piso epoxi planta Salta', 'Sistema epoxi autonivelante', 'cotizacion', 180000::numeric, 45, current_date + interval '40 days', 'Jotun', 'Resistencia química a ácidos sulfúricos diluidos.'),
    ('Loma Negra Cementos', 'Protección contra altas temperaturas', 'Interchar intumescente', 'prueba_tecnica', 95000::numeric, 55, current_date + interval '60 days', null, 'Ensayo de resistencia a 400°C en curso.'),
    ('TGS Transportadora de Gas', 'Recubrimiento de pipelines', 'Interline 3-capas', 'calificacion', 410000::numeric, 30, current_date + interval '75 days', 'PPG', 'Definición de especificación técnica con cliente.'),
    ('Aluar Aluminio Argentino', 'Piso industrial fundición', 'Interzone HB', 'prospecto', 150000::numeric, 15, current_date + interval '90 days', 'Hempel', 'Primer contacto, pendiente relevamiento técnico.'),
    ('Central Puerto Energía', 'Repintado estructuras metálicas', 'Interthane acabado PU', 'ganado', 120000::numeric, 100, current_date - interval '10 days', null, 'Orden de compra recibida, inicio de obra próximo mes.'),
    ('YPF Refinería La Plata', 'Mantenimiento correctivo tuberías', 'Interseal 670HS', 'perdido', 60000::numeric, 0, current_date - interval '20 days', 'Sherwin-Williams', 'Cliente eligió proveedor incumbente por precio.')
) as p(client_name, name, coating_type, status, estimated_value, win_probability, estimated_close_date, competitor, technical_notes)
  on p.client_name = c.name;

-- ----------------------------------------------------------------------------
-- Mock activities
-- ----------------------------------------------------------------------------
insert into public.activities (
  owner_id, client_id, project_id, activity_type, activity_date, result, next_action, next_action_date, comments
)
select c.owner_id, c.id, pr.id, a.activity_type::activity_type, a.activity_date, a.result, a.next_action, a.next_action_date, a.comments
from public.clients c
join public.projects pr on pr.client_id = c.id
join (
  values
    ('YPF Refinería La Plata', 'Recubrimiento de tanques', 'visita', current_date - interval '5 days', 'Reunión técnica positiva', 'Enviar cotización formal', current_date + interval '3 days', 'Cliente solicitó referencias de proyectos similares.'),
    ('Vale Base Metals', 'Piso epoxi planta Salta', 'inspeccion_tecnica', current_date - interval '8 days', 'Relevamiento de superficie completado', 'Preparar propuesta técnica', current_date + interval '5 days', 'Sustrato con humedad residual, requiere primer especial.'),
    ('TGS Transportadora de Gas', 'Recubrimiento de pipelines', 'reunion', current_date - interval '2 days', 'Alineación de especificaciones', 'Coordinar prueba de laboratorio', current_date + interval '10 days', null),
    ('Central Puerto Energía', 'Repintado estructuras metálicas', 'seguimiento', current_date - interval '1 days', 'Confirmación de orden de compra', 'Planificar inicio de obra', current_date + interval '15 days', 'Coordinar con logística fecha de entrega de materiales.'),
    ('Aluar Aluminio Argentino', 'Piso industrial fundición', 'llamada', current_date - interval '15 days', 'Primer contacto realizado', 'Agendar visita técnica', current_date - interval '2 days', 'Actividad vencida, requiere reprogramación urgente.')
) as a(client_name, project_name, activity_type, activity_date, result, next_action, next_action_date, comments)
  on a.client_name = c.name and a.project_name = pr.name;

-- ============================================================================
-- AkzoNobel Industrial Coatings CRM — PostgreSQL schema (Supabase)
-- Run in Supabase SQL editor, in order: schema.sql -> seed.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'sales_user');

create type project_status as enum (
  'prospecto',
  'calificacion',
  'cotizacion',
  'prueba_tecnica',
  'negociacion',
  'ganado',
  'perdido'
);

create type activity_type as enum (
  'visita',
  'llamada',
  'email',
  'reunion',
  'inspeccion_tecnica',
  'demo',
  'seguimiento'
);

create type import_status as enum ('pending', 'processed', 'failed');
create type export_format as enum ('xlsx', 'csv', 'json');

-- ----------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'sales_user',
  region text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ----------------------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  industry_segment text not null,
  plant_name text,
  city text,
  country text,
  contact_name text,
  contact_position text,
  contact_phone text,
  contact_email text,
  current_competitor text,
  annual_potential_usd numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_owner_id_idx on public.clients (owner_id);
create index clients_industry_segment_idx on public.clients (industry_segment);
create index clients_country_idx on public.clients (country);
create index clients_name_idx on public.clients using gin (to_tsvector('simple', name));

-- ----------------------------------------------------------------------------
-- PROJECTS
-- ----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  industry_segment text not null,
  coating_type text not null,
  status project_status not null default 'prospecto',
  estimated_value numeric(14, 2) not null default 0,
  currency text not null default 'USD',
  win_probability smallint not null default 10 check (win_probability between 0 and 100),
  estimated_close_date date,
  competitor text,
  technical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects (owner_id);
create index projects_client_id_idx on public.projects (client_id);
create index projects_status_idx on public.projects (status);
create index projects_estimated_close_date_idx on public.projects (estimated_close_date);

-- ----------------------------------------------------------------------------
-- ACTIVITIES
-- ----------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  activity_type activity_type not null,
  activity_date date not null default current_date,
  result text,
  next_action text,
  next_action_date date,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_owner_id_idx on public.activities (owner_id);
create index activities_client_id_idx on public.activities (client_id);
create index activities_project_id_idx on public.activities (project_id);
create index activities_next_action_date_idx on public.activities (next_action_date);

-- ----------------------------------------------------------------------------
-- EXPORTS (audit trail of user exports)
-- ----------------------------------------------------------------------------
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  format export_format not null,
  entity text not null,
  record_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index exports_owner_id_idx on public.exports (owner_id);

-- ----------------------------------------------------------------------------
-- IMPORTS (admin consolidation / ETL audit trail)
-- ----------------------------------------------------------------------------
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  entity text not null,
  status import_status not null default 'pending',
  total_rows integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  skipped_rows integer not null default 0,
  error_log text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index imports_imported_by_idx on public.imports (imported_by);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- New auth.users -> profiles bootstrap
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'sales_user')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Helper: current user role (avoids recursive RLS lookups)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.current_user_role() = 'admin';
$$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.activities enable row level security;
alter table public.exports enable row level security;
alter table public.imports enable row level security;

-- PROFILES: everyone can read profiles (needed for "responsable" lookups);
-- users can update only their own row; admins can update any.
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- CLIENTS: sales_user sees/edits only their own records; admin sees all.
create policy "clients_select_own_or_admin" on public.clients
  for select using (owner_id = auth.uid() or public.is_admin());

create policy "clients_insert_own" on public.clients
  for insert with check (owner_id = auth.uid() or public.is_admin());

create policy "clients_update_own_or_admin" on public.clients
  for update using (owner_id = auth.uid() or public.is_admin());

create policy "clients_delete_own_or_admin" on public.clients
  for delete using (owner_id = auth.uid() or public.is_admin());

-- PROJECTS
create policy "projects_select_own_or_admin" on public.projects
  for select using (owner_id = auth.uid() or public.is_admin());

create policy "projects_insert_own" on public.projects
  for insert with check (owner_id = auth.uid() or public.is_admin());

create policy "projects_update_own_or_admin" on public.projects
  for update using (owner_id = auth.uid() or public.is_admin());

create policy "projects_delete_own_or_admin" on public.projects
  for delete using (owner_id = auth.uid() or public.is_admin());

-- ACTIVITIES
create policy "activities_select_own_or_admin" on public.activities
  for select using (owner_id = auth.uid() or public.is_admin());

create policy "activities_insert_own" on public.activities
  for insert with check (owner_id = auth.uid() or public.is_admin());

create policy "activities_update_own_or_admin" on public.activities
  for update using (owner_id = auth.uid() or public.is_admin());

create policy "activities_delete_own_or_admin" on public.activities
  for delete using (owner_id = auth.uid() or public.is_admin());

-- EXPORTS: users see their own export history; admin sees all.
create policy "exports_select_own_or_admin" on public.exports
  for select using (owner_id = auth.uid() or public.is_admin());

create policy "exports_insert_own" on public.exports
  for insert with check (owner_id = auth.uid());

-- IMPORTS: admin-only feature.
create policy "imports_select_admin" on public.imports
  for select using (public.is_admin());

create policy "imports_insert_admin" on public.imports
  for insert with check (public.is_admin());

create policy "imports_update_admin" on public.imports
  for update using (public.is_admin());

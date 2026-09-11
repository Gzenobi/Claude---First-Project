# AkzoNobel Industrial Coatings — CRM Comercial

MVP de una plataforma CRM simple, moderna y corporativa para la gestión comercial del
negocio Industrial Coatings de AkzoNobel. Pensada para vendedores técnico-comerciales de
pintura industrial y para la gerencia comercial que consolida y supervisa el pipeline.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript |
| UI | TailwindCSS + shadcn/ui (Radix) + Lucide React |
| Formularios | React Hook Form + Zod |
| Tablas | TanStack Table |
| Gráficos | Recharts |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Exportación | SheetJS (xlsx), PapaParse (csv), JSON nativo |
| Deploy | Vercel |

## Arquitectura de carpetas

```
app/                        Rutas (App Router)
  login/                     Login público
  auth/callback/             Callback de Supabase Auth
  (protected)/                Rutas protegidas por middleware + layout con sidebar/topbar
    dashboard/                 Dashboard personal del vendedor
    clients/                   CRUD de clientes
    projects/                  CRUD de proyectos + Kanban de pipeline
    activities/                 Timeline de actividades comerciales
    admin/                      Dashboard ejecutivo consolidado (solo admin)
    admin/import/                Importación / consolidación ETL (solo admin)

components/                 Componentes compartidos (sidebar, topbar, kpi-card, data-table...)
components/ui/               Primitivas shadcn/ui (button, card, dialog, select, table...)

features/                   Lógica de negocio por dominio (UI + server actions + schemas)
  auth/                       Login/logout (server actions), formulario
  clients/                    CRUD de clientes
  projects/                   CRUD de proyectos + Kanban
  activities/                 CRUD de actividades + timeline
  dashboard/                   Cálculo de KPIs/métricas + gráficos + dashboard ejecutivo
  export/                      Exportación a XLSX/CSV/JSON
  import/                      Parseo e importación/consolidación (ETL) — solo admin
  admin/                       Acciones exclusivas de administración

lib/                        Utilidades transversales
  supabase/                   Clientes de Supabase (browser, server, middleware)
  auth.ts                     Helpers de sesión y roles
  constants.ts                 Catálogos (segmentos, estados, tipos de actividad) y branding
  utils.ts                     Helpers (cn, formatCurrency, formatDate...)

types/                      Tipos TypeScript (Database + dominio)
sql/                         schema.sql (DDL + RLS) y seed.sql (datos mock)
```

## Roles

- **sales_user (Usuario comercial):** gestiona sus propios clientes, proyectos y
  actividades; visualiza únicamente su información (aplicado vía Row Level Security);
  exporta sus datos.
- **admin (Administrador / Gerencia):** visualiza toda la información del equipo,
  importa y consolida datasets exportados por los vendedores, accede al dashboard
  ejecutivo con filtros por vendedor/segmento/estado.

## Puesta en marcha local

### 1. Cloná el repo e instalá dependencias

```bash
npm install
```

### 2. Creá un proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un nuevo proyecto.
2. En **Project Settings → API** copiá la `Project URL` y la `anon public key`.
3. Copiá `.env.example` a `.env.local` y completá las credenciales:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Ejecutá el schema SQL

En el **SQL Editor** de Supabase, ejecutá en orden:

1. `sql/schema.sql` — crea tablas, enums, índices, triggers y políticas RLS.
2. `sql/seed.sql` — crea usuarios demo y datos mock (clientes, proyectos, actividades).

Usuarios demo creados por el seed (contraseña `Akzo2024!`):

| Email | Rol |
| --- | --- |
| admin@akzonobel-demo.com | admin |
| vendedor1@akzonobel-demo.com | sales_user |
| vendedor2@akzonobel-demo.com | sales_user |

### 4. Levantá el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) e iniciá sesión con alguno de los
usuarios demo.

## Modelo de datos

Tablas principales (ver `sql/schema.sql` para el detalle completo):

- **profiles** — extiende `auth.users`, guarda rol (`admin` / `sales_user`) y región.
- **clients** — cuentas y contactos, con `owner_id` (vendedor responsable).
- **projects** — oportunidades comerciales vinculadas a un cliente, con estado de
  pipeline (`prospecto` → `calificacion` → `cotizacion` → `prueba_tecnica` →
  `negociacion` → `ganado` / `perdido`).
- **activities** — visitas, llamadas, reuniones, inspecciones técnicas, etc.,
  vinculadas opcionalmente a cliente y/o proyecto.
- **exports** — auditoría de exportaciones realizadas por cada usuario.
- **imports** — auditoría de importaciones/consolidaciones realizadas por admins.

La seguridad se aplica con **Row Level Security**: un `sales_user` solo puede
leer/escribir filas donde `owner_id = auth.uid()`; un `admin` (verificado con la
función `is_admin()`) tiene acceso completo a todas las filas.

## Exportación e importación (ETL)

- Cada usuario puede exportar sus clientes, proyectos y actividades a **XLSX**,
  **CSV** o **JSON** desde el botón "Exportar" de cada módulo.
- El administrador puede subir esos archivos en **Importar datos** (`/admin/import`).
  El proceso:
  1. Parsea el archivo (xlsx / csv / json) en el navegador.
  2. Envía las filas a un server action que compara contra los registros existentes:
     - Si la fila trae un `id` que ya existe, **actualiza** ese registro.
     - Si no hay `id` pero el nombre (+ segmento o + cliente) coincide con un
       registro existente, también lo **actualiza** (detección de duplicados).
     - En caso contrario, **inserta** un registro nuevo.
  3. Registra un resumen (filas totales, nuevas, actualizadas, omitidas) en la
     tabla `imports` para trazabilidad.

## Despliegue en Vercel

1. Subí el repositorio a GitHub/GitLab/Bitbucket.
2. En [vercel.com](https://vercel.com), importá el repositorio.
3. Configurá las variables de entorno del proyecto en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel detecta Next.js automáticamente (build command `next build`).
5. En Supabase, agregá la URL de producción a **Authentication → URL Configuration**
   (Site URL y Redirect URLs) para que el login funcione correctamente.

## Scripts disponibles

```bash
npm run dev         # servidor de desarrollo
npm run build        # build de producción
npm run start        # levanta el build de producción
npm run lint         # ESLint
npm run typecheck    # chequeo de tipos con tsc --noEmit
```

## Notas de diseño

- Paleta corporativa AkzoNobel: azul `#005EB8`, azul oscuro `#003B75`, gris claro
  `#F5F7FA`, gris medio `#D9E2EC` (ver `tailwind.config.ts` y `app/globals.css`).
- Layout: sidebar fija + topbar + cards KPI + tablas + gráficos, inspirado en
  Hubspot / Monday / Power BI, con bordes redondeados y espaciado amplio.
- El sistema de componentes sigue la convención de shadcn/ui, por lo que es
  fácilmente extensible con más componentes del mismo ecosistema.

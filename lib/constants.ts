import type { ActivityType, ProjectStatus } from "@/types";

export const BRAND = {
  blue: "#005EB8",
  blueDark: "#003B75",
  grayLight: "#F5F7FA",
  grayMedium: "#D9E2EC",
};

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "prospecto", label: "Prospecto" },
  { value: "calificacion", label: "Calificación" },
  { value: "cotizacion", label: "Cotización" },
  { value: "prueba_tecnica", label: "Prueba técnica" },
  { value: "negociacion", label: "Negociación" },
  { value: "ganado", label: "Ganado" },
  { value: "perdido", label: "Perdido" },
];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> =
  PROJECT_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s.value]: s.label }),
    {} as Record<ProjectStatus, string>,
  );

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  prospecto: "bg-slate-100 text-slate-700 border-slate-200",
  calificacion: "bg-sky-100 text-sky-700 border-sky-200",
  cotizacion: "bg-indigo-100 text-indigo-700 border-indigo-200",
  prueba_tecnica: "bg-amber-100 text-amber-700 border-amber-200",
  negociacion: "bg-orange-100 text-orange-700 border-orange-200",
  ganado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  perdido: "bg-rose-100 text-rose-700 border-rose-200",
};

export const OPEN_PROJECT_STATUSES: ProjectStatus[] = [
  "prospecto",
  "calificacion",
  "cotizacion",
  "prueba_tecnica",
  "negociacion",
];

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "visita", label: "Visita" },
  { value: "llamada", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "reunion", label: "Reunión" },
  { value: "inspeccion_tecnica", label: "Inspección técnica" },
  { value: "demo", label: "Demo" },
  { value: "seguimiento", label: "Seguimiento" },
];

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> =
  ACTIVITY_TYPES.reduce(
    (acc, a) => ({ ...acc, [a.value]: a.label }),
    {} as Record<ActivityType, string>,
  );

export const INDUSTRY_SEGMENTS = [
  "Oil & Gas",
  "Minería",
  "Energía",
  "Cemento",
  "Metalurgia",
  "Infraestructura",
  "Naval / Marino",
  "Alimentos y Bebidas",
  "Petroquímica",
  "Otro",
];

export const COATING_TYPES = [
  "Interzinc",
  "Intergard",
  "Interseal",
  "Interzone",
  "Interthane",
  "Interline",
  "Interchar",
  "Sistema epoxi",
  "Sistema poliuretánico",
  "Otro",
];

export const CURRENCIES = ["USD", "ARS", "EUR"];

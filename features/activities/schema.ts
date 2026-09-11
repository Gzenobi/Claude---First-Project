import { z } from "zod";

export const activitySchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
  activityType: z.enum([
    "visita",
    "llamada",
    "email",
    "reunion",
    "inspeccion_tecnica",
    "demo",
    "seguimiento",
  ]),
  activityDate: z.string().min(1, "La fecha es requerida"),
  result: z.string().optional().or(z.literal("")),
  nextAction: z.string().optional().or(z.literal("")),
  nextActionDate: z.string().optional().or(z.literal("")),
  comments: z.string().optional().or(z.literal("")),
});

export type ActivityInput = z.infer<typeof activitySchema>;

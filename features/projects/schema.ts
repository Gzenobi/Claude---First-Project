import { z } from "zod";

export const projectSchema = z.object({
  clientId: z.string().uuid("Seleccioná un cliente"),
  name: z.string().min(2, "El nombre del proyecto es requerido"),
  industrySegment: z.string().min(1, "Seleccioná un segmento industrial"),
  coatingType: z.string().min(1, "Seleccioná un tipo de recubrimiento"),
  status: z.enum([
    "prospecto",
    "calificacion",
    "cotizacion",
    "prueba_tecnica",
    "negociacion",
    "ganado",
    "perdido",
  ]),
  estimatedValue: z.coerce.number().min(0, "Debe ser un valor positivo"),
  currency: z.string().min(1),
  winProbability: z.coerce.number().min(0).max(100),
  estimatedCloseDate: z.string().optional().or(z.literal("")),
  competitor: z.string().optional().or(z.literal("")),
  technicalNotes: z.string().optional().or(z.literal("")),
});

export type ProjectInput = z.infer<typeof projectSchema>;

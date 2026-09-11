import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "El nombre del cliente es requerido"),
  industrySegment: z.string().min(1, "Seleccioná un segmento industrial"),
  plantName: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  contactPosition: z.string().optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  contactEmail: z
    .string()
    .email("Email de contacto inválido")
    .optional()
    .or(z.literal("")),
  currentCompetitor: z.string().optional().or(z.literal("")),
  annualPotentialUsd: z.coerce.number().min(0, "Debe ser un valor positivo"),
  notes: z.string().optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;

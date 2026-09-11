"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, Client } from "@/types";
import type { Database } from "@/types/database";

import { clientSchema, type ClientInput } from "./schema";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    industrySegment: row.industry_segment,
    plantName: row.plant_name,
    city: row.city,
    country: row.country,
    contactName: row.contact_name,
    contactPosition: row.contact_position,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    currentCompetitor: row.current_competitor,
    annualPotentialUsd: Number(row.annual_potential_usd),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getClients(): Promise<Client[]> {
  await requireProfile();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapClient);
}

export async function getClientOptions(): Promise<{ id: string; name: string }[]> {
  await requireProfile();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

function toRow(input: ClientInput) {
  return {
    name: input.name,
    industry_segment: input.industrySegment,
    plant_name: input.plantName || null,
    city: input.city || null,
    country: input.country || null,
    contact_name: input.contactName || null,
    contact_position: input.contactPosition || null,
    contact_phone: input.contactPhone || null,
    contact_email: input.contactEmail || null,
    current_competitor: input.currentCompetitor || null,
    annual_potential_usd: input.annualPotentialUsd,
    notes: input.notes || null,
  };
}

export async function createClientAction(input: ClientInput): Promise<ActionResult<Client>> {
  const profile = await requireProfile();
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...toRow(parsed.data), owner_id: profile.id })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "No se pudo crear el cliente" };

  revalidatePath("/clients");
  return { success: true, data: mapClient(data) };
}

export async function updateClientAction(
  id: string,
  input: ClientInput,
): Promise<ActionResult<Client>> {
  await requireProfile();
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "No se pudo actualizar el cliente" };

  revalidatePath("/clients");
  return { success: true, data: mapClient(data) };
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/clients");
  return { success: true, data: undefined };
}

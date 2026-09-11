"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, ProjectStatus, ProjectWithClient } from "@/types";
import type { Database } from "@/types/database";

import { projectSchema, type ProjectInput } from "./schema";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

function mapProject(row: ProjectRow & { clients?: { name: string } | null }): ProjectWithClient {
  return {
    id: row.id,
    ownerId: row.owner_id,
    clientId: row.client_id,
    name: row.name,
    industrySegment: row.industry_segment,
    coatingType: row.coating_type,
    status: row.status,
    estimatedValue: Number(row.estimated_value),
    currency: row.currency,
    winProbability: row.win_probability,
    estimatedCloseDate: row.estimated_close_date,
    competitor: row.competitor,
    technicalNotes: row.technical_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientName: row.clients?.name ?? "—",
  };
}

export async function getProjects(): Promise<ProjectWithClient[]> {
  await requireProfile();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProject);
}

export async function getProjectOptions(): Promise<{ id: string; name: string }[]> {
  await requireProfile();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

function toRow(input: ProjectInput) {
  return {
    client_id: input.clientId,
    name: input.name,
    industry_segment: input.industrySegment,
    coating_type: input.coatingType,
    status: input.status,
    estimated_value: input.estimatedValue,
    currency: input.currency,
    win_probability: input.winProbability,
    estimated_close_date: input.estimatedCloseDate || null,
    competitor: input.competitor || null,
    technical_notes: input.technicalNotes || null,
  };
}

export async function createProjectAction(input: ProjectInput): Promise<ActionResult> {
  const profile = await requireProfile();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("projects")
    .insert({ ...toRow(parsed.data), owner_id: profile.id });

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateProjectAction(
  id: string,
  input: ProjectInput,
): Promise<ActionResult> {
  await requireProfile();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase.from("projects").update(toRow(parsed.data)).eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateProjectStatusAction(
  id: string,
  status: ProjectStatus,
): Promise<ActionResult> {
  await requireProfile();
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

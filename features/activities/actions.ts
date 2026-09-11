"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, ActivityWithRelations } from "@/types";
import type { Database } from "@/types/database";

import { activitySchema, type ActivityInput } from "./schema";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ActivityJoined = ActivityRow & {
  clients?: { name: string } | null;
  projects?: { name: string } | null;
  profiles?: { full_name: string } | null;
};

function mapActivity(row: ActivityJoined): ActivityWithRelations {
  return {
    id: row.id,
    ownerId: row.owner_id,
    clientId: row.client_id,
    projectId: row.project_id,
    activityType: row.activity_type,
    activityDate: row.activity_date,
    result: row.result,
    nextAction: row.next_action,
    nextActionDate: row.next_action_date,
    comments: row.comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientName: row.clients?.name ?? null,
    projectName: row.projects?.name ?? null,
    ownerName: row.profiles?.full_name ?? "—",
  };
}

export async function getActivities(): Promise<ActivityWithRelations[]> {
  await requireProfile();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("activities")
    .select("*, clients(name), projects(name), profiles(full_name)")
    .order("activity_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapActivity);
}

function toRow(input: ActivityInput) {
  return {
    client_id: input.clientId || null,
    project_id: input.projectId || null,
    activity_type: input.activityType,
    activity_date: input.activityDate,
    result: input.result || null,
    next_action: input.nextAction || null,
    next_action_date: input.nextActionDate || null,
    comments: input.comments || null,
  };
}

export async function createActivityAction(input: ActivityInput): Promise<ActionResult> {
  const profile = await requireProfile();
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("activities")
    .insert({ ...toRow(parsed.data), owner_id: profile.id });

  if (error) return { success: false, error: error.message };

  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateActivityAction(
  id: string,
  input: ActivityInput,
): Promise<ActionResult> {
  await requireProfile();
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase.from("activities").update(toRow(parsed.data)).eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function deleteActivityAction(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("activities").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, ExportFormat } from "@/types";

export async function recordExportAction(
  entity: string,
  format: ExportFormat,
  recordCount: number,
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("exports")
    .insert({ owner_id: profile.id, entity, format, record_count: recordCount });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  return { success: true, data: undefined };
}

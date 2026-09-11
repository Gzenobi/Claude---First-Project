"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export async function getSalesProfiles(): Promise<Profile[]> {
  await requireAdmin();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, region, is_active")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    region: row.region,
    isActive: row.is_active,
  }));
}

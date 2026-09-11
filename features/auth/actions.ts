"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

import { loginSchema } from "./schema";

export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: "Email o contraseña incorrectos." };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

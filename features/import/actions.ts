"use server";

import { revalidatePath } from "next/cache";

import { PROJECT_STATUSES } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, ImportRecord, ProjectStatus } from "@/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = new Set(PROJECT_STATUSES.map((s) => s.value));

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function toProjectStatus(value: unknown): ProjectStatus {
  const s = str(value);
  return s && VALID_STATUSES.has(s as ProjectStatus) ? (s as ProjectStatus) : "prospecto";
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface ImportSummary {
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errors: string[];
}

export async function importClientsAction(
  fileName: string,
  rows: Record<string, unknown>[],
): Promise<ActionResult<ImportSummary>> {
  const admin = await requireAdmin();
  const supabase = createSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("clients")
    .select("id, name, industry_segment");
  if (fetchError) return { success: false, error: fetchError.message };

  const byId = new Map((existing ?? []).map((c) => [c.id, c]));
  const byNameSegment = new Map(
    (existing ?? []).map((c) => [`${c.name.toLowerCase()}|${c.industry_segment.toLowerCase()}`, c.id]),
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = str(row.name);
    const industrySegment = str(row.industrySegment ?? row.industry_segment);

    if (!name || !industrySegment) {
      skipped += 1;
      errors.push(`Fila omitida: falta nombre o segmento industrial (${JSON.stringify(row).slice(0, 80)})`);
      continue;
    }

    const payload = {
      name,
      industry_segment: industrySegment,
      plant_name: str(row.plantName ?? row.plant_name),
      city: str(row.city),
      country: str(row.country),
      contact_name: str(row.contactName ?? row.contact_name),
      contact_position: str(row.contactPosition ?? row.contact_position),
      contact_phone: str(row.contactPhone ?? row.contact_phone),
      contact_email: str(row.contactEmail ?? row.contact_email),
      current_competitor: str(row.currentCompetitor ?? row.current_competitor),
      annual_potential_usd: num(row.annualPotentialUsd ?? row.annual_potential_usd),
      notes: str(row.notes),
    };

    const rowId = row.id;
    const rowOwnerId = row.ownerId ?? row.owner_id;
    const ownerId = isUuid(rowOwnerId) ? rowOwnerId : admin.id;

    const existingId = isUuid(rowId) && byId.has(rowId)
      ? rowId
      : byNameSegment.get(`${name.toLowerCase()}|${industrySegment.toLowerCase()}`);

    if (existingId) {
      const { error } = await supabase.from("clients").update(payload).eq("id", existingId);
      if (error) {
        skipped += 1;
        errors.push(`Error actualizando "${name}": ${error.message}`);
      } else {
        updated += 1;
      }
    } else {
      const insertPayload = isUuid(rowId)
        ? { ...payload, id: rowId, owner_id: ownerId }
        : { ...payload, owner_id: ownerId };
      const { error } = await supabase.from("clients").insert(insertPayload);
      if (error) {
        skipped += 1;
        errors.push(`Error creando "${name}": ${error.message}`);
      } else {
        inserted += 1;
      }
    }
  }

  const summary: ImportSummary = {
    totalRows: rows.length,
    insertedRows: inserted,
    updatedRows: updated,
    skippedRows: skipped,
    errors,
  };

  await logImport(admin.id, fileName, "clients", summary);

  revalidatePath("/clients");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, data: summary };
}

export async function importProjectsAction(
  fileName: string,
  rows: Record<string, unknown>[],
): Promise<ActionResult<ImportSummary>> {
  const admin = await requireAdmin();
  const supabase = createSupabaseClient();

  const [{ data: existingProjects, error: fetchProjectsError }, { data: existingClients, error: fetchClientsError }] =
    await Promise.all([
      supabase.from("projects").select("id, name, client_id"),
      supabase.from("clients").select("id, name"),
    ]);

  if (fetchProjectsError) return { success: false, error: fetchProjectsError.message };
  if (fetchClientsError) return { success: false, error: fetchClientsError.message };

  const byId = new Map((existingProjects ?? []).map((p) => [p.id, p]));
  const byNameClient = new Map(
    (existingProjects ?? []).map((p) => [`${p.name.toLowerCase()}|${p.client_id}`, p.id]),
  );
  const clientIdByName = new Map(
    (existingClients ?? []).map((c) => [c.name.toLowerCase(), c.id]),
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = str(row.name);
    const rawClientId = row.clientId ?? row.client_id;
    const clientName = str(row.clientName ?? row.client_name);
    const resolvedClientId = isUuid(rawClientId)
      ? rawClientId
      : clientName
        ? clientIdByName.get(clientName.toLowerCase())
        : undefined;

    if (!name || !resolvedClientId) {
      skipped += 1;
      errors.push(`Fila omitida: falta nombre o cliente válido (${JSON.stringify(row).slice(0, 80)})`);
      continue;
    }

    const payload = {
      name,
      client_id: resolvedClientId,
      industry_segment: str(row.industrySegment ?? row.industry_segment) ?? "Otro",
      coating_type: str(row.coatingType ?? row.coating_type) ?? "Otro",
      status: toProjectStatus(row.status),
      estimated_value: num(row.estimatedValue ?? row.estimated_value),
      currency: str(row.currency) ?? "USD",
      win_probability: num(row.winProbability ?? row.win_probability, 10),
      estimated_close_date: str(row.estimatedCloseDate ?? row.estimated_close_date),
      competitor: str(row.competitor),
      technical_notes: str(row.technicalNotes ?? row.technical_notes),
    };

    const rowId = row.id;
    const rowOwnerId = row.ownerId ?? row.owner_id;
    const ownerId = isUuid(rowOwnerId) ? rowOwnerId : admin.id;

    const existingId = isUuid(rowId) && byId.has(rowId)
      ? rowId
      : byNameClient.get(`${name.toLowerCase()}|${resolvedClientId}`);

    if (existingId) {
      const { error } = await supabase.from("projects").update(payload).eq("id", existingId);
      if (error) {
        skipped += 1;
        errors.push(`Error actualizando "${name}": ${error.message}`);
      } else {
        updated += 1;
      }
    } else {
      const insertPayload = isUuid(rowId)
        ? { ...payload, id: rowId, owner_id: ownerId }
        : { ...payload, owner_id: ownerId };
      const { error } = await supabase.from("projects").insert(insertPayload);
      if (error) {
        skipped += 1;
        errors.push(`Error creando "${name}": ${error.message}`);
      } else {
        inserted += 1;
      }
    }
  }

  const summary: ImportSummary = {
    totalRows: rows.length,
    insertedRows: inserted,
    updatedRows: updated,
    skippedRows: skipped,
    errors,
  };

  await logImport(admin.id, fileName, "projects", summary);

  revalidatePath("/projects");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, data: summary };
}

async function logImport(
  importedBy: string,
  fileName: string,
  entity: string,
  summary: ImportSummary,
): Promise<void> {
  const supabase = createSupabaseClient();
  await supabase.from("imports").insert({
    imported_by: importedBy,
    file_name: fileName,
    entity,
    status: "processed",
    total_rows: summary.totalRows,
    inserted_rows: summary.insertedRows,
    updated_rows: summary.updatedRows,
    skipped_rows: summary.skippedRows,
    error_log: summary.errors.length ? summary.errors.join("\n") : null,
    processed_at: new Date().toISOString(),
  });
}

export async function getImportHistory(): Promise<ImportRecord[]> {
  await requireAdmin();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    importedBy: row.imported_by,
    fileName: row.file_name,
    entity: row.entity,
    status: row.status,
    totalRows: row.total_rows,
    insertedRows: row.inserted_rows,
    updatedRows: row.updated_rows,
    skippedRows: row.skipped_rows,
    errorLog: row.error_log,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  }));
}

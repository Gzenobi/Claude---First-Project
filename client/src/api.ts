const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Product {
  id: string;
  code: string;
  name: string;
  kind: "ONE_K" | "TWO_K";
  kindLocked: boolean;
  isDemo: boolean;
  colorCount: number;
}
export interface ColorSummary {
  id: string;
  code: string;
  name: string | null;
  standard: string | null;
  formulaCount: number;
}
export interface FormulaSummary {
  id: string;
  version: string | null;
  batchVolume: string;
  batchVolumeUnit: string;
  commercialVolume: string;
  commercialVolumeUnit: string;
  baseQuantityBasis: string;
  sourceFileName: string | null;
}
export interface LineResult {
  componentId: string;
  code: string;
  description: string;
  role: "BASE" | "CONCENTRATE" | "PART_B";
  quantity: string;
  unit: string;
  unitCost: string | null;
  appliedCost: string;
  currency: string | null;
  ok: boolean;
  error?: string;
}
export interface Breakdown {
  formulaId: string;
  productId: string;
  productKind: "ONE_K" | "TWO_K";
  colorId: string;
  currency: string;
  baseCost: string;
  concentrateCost: string;
  partBCost: string;
  totalCostPerSet: string;
  costPerLiter: string | null;
  setSizeLiters: string | null;
  isIncomplete: boolean;
  incompleteReason: string | null;
  baseQuantityBasis: string;
  formulaWarnings: string[];
  lines: LineResult[];
}
export interface Pricing {
  costPerLiter: string;
  costPerSet: string;
  contributionPct: string;
  sellingPricePerLiter: string;
  sellingPricePerSet: string;
  profitPerLiter: string;
  profitPerSet: string;
}
export interface Scenario {
  contributionPct: string;
  sellingPrice: string;
  profit: string;
}
export interface PricingResponse {
  breakdown: Breakdown;
  pricing: Pricing | null;
  scenarios: Scenario[];
}
export interface Calculation {
  id: string;
  product: { id: string; code: string; name: string; kind: string };
  color: { id: string; code: string; name: string | null };
  setSize: string;
  baseCost: string;
  concentrateCost: string;
  partBCost: string;
  totalCostPerSet: string;
  costPerLiter: string | null;
  contributionPct: string;
  sellingPricePerLiter: string | null;
  sellingPricePerSet: string;
  currency: string;
  isIncomplete: boolean;
  incompleteReason: string | null;
  createdAt: string;
}
export interface ComponentRow {
  id: string;
  code: string;
  description: string;
  type: "BASE" | "CONCENTRATE" | "PART_B";
  baseUnit: string;
  density: string | null;
  isDemo: boolean;
  currentCost: {
    amount: string;
    currency: string;
    costBasis: string;
    packageSize: string | null;
    packageUnit: string | null;
    effectiveDate: string | null;
  } | null;
}
export interface DashboardData {
  productCount: number;
  colorCount: number;
  formulaCount: number;
  baseCount: number;
  concentrateCount: number;
  twoKCount: number;
  lastCostUpdate: string | null;
  formulasWithErrors: number;
  topMissingCostComponents: { code: string; description: string; formulasBlocked: number }[];
}
export interface DashboardTimelinePoint {
  day: string;
  colors: number;
  formulas: number;
}
export interface SearchResults {
  products: { id: string; code: string; name: string; kind: string }[];
  colors: { id: string; code: string; name: string | null; standard: string | null; product: { id: string; code: string; name: string } }[];
  components: { id: string; code: string; description: string; type: string }[];
}
export interface Settings {
  defaultContributionPct: string;
  qtyDecimals: number;
  unitCostDecimals: number;
  totalDecimals: number;
  maxFileSizeMb: number;
}

export const api = {
  products: {
    list: () => req<Product[]>("/products"),
    create: (data: { code: string; name: string; kind: string }) => req<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; kind?: string }) => req<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => req<void>(`/products/${id}`, { method: "DELETE" }),
    colors: (id: string) => req<ColorSummary[]>(`/products/${id}/colors`),
    merge: (data: { sourceProductId: string; targetProductId: string; targetName?: string }) =>
      req<Product>("/products/merge", { method: "POST", body: JSON.stringify(data) }),
  },
  colors: {
    formulas: (id: string) => req<FormulaSummary[]>(`/colors/${id}/formulas`),
    create: (data: { productId: string; code: string; name?: string; standard?: string }) =>
      req<{ id: string }>(`/colors`, { method: "POST", body: JSON.stringify(data) }),
  },
  formulas: {
    pricing: (id: string, contribution?: string) => req<PricingResponse>(`/formulas/${id}/pricing${contribution ? `?contribution=${contribution}` : ""}`),
    remove: (id: string) => req<void>(`/formulas/${id}`, { method: "DELETE" }),
    create: (data: {
      colorId: string;
      baseComponentId: string;
      baseQuantity: string;
      baseUnit: string;
      commercialVolume: string;
      commercialVolumeUnit: string;
      concentrates: { componentId: string; quantity: string; unit: string }[];
      version?: string;
      baseQuantityBasis?: "EXPLICIT" | "FILL_TO_VOLUME";
    }) => req(`/formulas`, { method: "POST", body: JSON.stringify(data) }),
  },
  components: {
    list: (type?: string) => req<ComponentRow[]>(`/components${type ? `?type=${type}` : ""}`),
    create: (data: { code: string; description: string; type: string; baseUnit: string; density?: string }) =>
      req<ComponentRow>("/components", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { description?: string; density?: string }) => req(`/components/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    setCost: (id: string, data: Record<string, string>) => req(`/components/${id}/cost`, { method: "POST", body: JSON.stringify(data) }),
  },
  calculations: {
    list: () => req<Calculation[]>("/calculations"),
    create: (data: { formulaId: string; contributionPct: string }) => req<Calculation>("/calculations", { method: "POST", body: JSON.stringify(data) }),
    setContribution: (id: string, contributionPct: string) =>
      req<Calculation>(`/calculations/${id}/contribution`, { method: "PUT", body: JSON.stringify({ contributionPct }) }),
    duplicate: (id: string, useCurrentCosts: boolean) =>
      req<Calculation>(`/calculations/${id}/duplicate`, { method: "POST", body: JSON.stringify({ useCurrentCosts }) }),
    remove: (id: string) => req<void>(`/calculations/${id}`, { method: "DELETE" }),
    compareCurrent: (id: string) =>
      req<{ original: { totalCostPerSet: string; costPerLiter: string | null }; current: { totalCostPerSet: string; costPerLiter: string | null; isIncomplete: boolean; incompleteReason: string | null }; variancePct: string }>(
        `/calculations/${id}/compare-current`
      ),
    exportUrl: (format: "xlsx" | "csv") => `${BASE}/calculations/export/${format}`,
  },
  imports: {
    previewFormulas: (files: File[], templates: Record<string, unknown>, defaultTemplate?: unknown) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("templates", JSON.stringify(templates));
      if (defaultTemplate) fd.append("defaultTemplate", JSON.stringify(defaultTemplate));
      return req<{
        batchId: string;
        files: {
          fileName: string;
          classification: "OK" | "NEEDS_MAPPING" | "FAILED";
          suggestedHeaders?: { headerRow: number; headers: string[] };
          formulaCount: number;
          colorCodes: string[];
          errors: { message: string; rowRef?: string }[];
          warnings: { message: string; rowRef?: string }[];
        }[];
        totals: { files: number; formulas: number; errors: number; warnings: number };
      }>("/imports/formulas/preview", { method: "POST", body: fd });
    },
    commitFormulas: (batchId: string) =>
      req<{ importBatchId: string; imported: number; skippedDuplicates: number; rejected: number; errorCount: number; warningCount: number }>(
        "/imports/formulas/commit",
        { method: "POST", body: JSON.stringify({ batchId }) }
      ),
    previewCosts: (files: File[], templates: Record<string, unknown>, sapCostSources: Record<string, "CKM3_USD_LTR" | "COSTO_UNIDAD"> = {}) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("templates", JSON.stringify(templates));
      fd.append("sapCostSources", JSON.stringify(sapCostSources));
      return req<{
        batchId: string;
        files: { fileName: string; classification: "OK" | "NEEDS_MAPPING" | "FAILED"; suggestedHeaders?: { headerRow: number; headers: string[] }; errors: { message: string }[]; warnings: { message: string }[] }[];
        rows: { code: string; description: string; type: string; classification: "NEW" | "UPDATED" | "UNCHANGED" | "REJECTED" | "NO_COST"; reason?: string; amount?: string; currency?: string }[];
        totals: { new: number; updated: number; unchanged: number; rejected: number; noCost: number };
      }>("/imports/costs/preview", { method: "POST", body: fd });
    },
    commitCosts: (batchId: string, versionLabel: string) =>
      req<{ importBatchId: string; imported: number; skippedDuplicates: number; rejected: number; errorCount: number; warningCount: number; new: number; updated: number; unchanged: number; noCost: number }>(
        "/imports/costs/commit",
        { method: "POST", body: JSON.stringify({ batchId, versionLabel }) }
      ),
    batches: () =>
      req<{ id: string; type: string; status: string; fileNames: string[]; summary: unknown; errorCount: number; createdAt: string }[]>("/imports/batches"),
    batchErrors: (id: string) => req<{ id: string; fileName: string; rowRef: string | null; severity: string; message: string }[]>(`/imports/batches/${id}/errors`),
  },
  settings: {
    get: () => req<Settings>("/settings"),
    update: (data: Partial<Settings>) => req<Settings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
  search: (q: string) => req<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  dashboard: () => req<DashboardData>("/dashboard"),
  dashboardTimeline: () => req<DashboardTimelinePoint[]>("/dashboard/timeline"),
};

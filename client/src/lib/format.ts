// La app opera en una única moneda (USD); se lo indicamos siempre en el
// número para que nunca quede ambiguo si un monto es USD o AR$/otra.
// Los montos se redondean siempre hacia arriba (nunca subestimar un costo).
export function money(value: string | number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  const factor = 10 ** decimals;
  const rounded = Math.ceil(n * factor) / factor;
  return `USD ${rounded.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function qty(value: string | number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function pct(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value) * 100;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

export function roleLabel(role: string): string {
  switch (role) {
    case "BASE":
      return "Base";
    case "CONCENTRATE":
      return "Concentrado";
    case "PART_B":
      return "Parte B";
    default:
      return role;
  }
}

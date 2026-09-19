// Cambios masivos de precio (§10). Las mismas reglas que valida la base en
// check_price_change, para avisar antes de llamarla.

export const ROUNDING_OPTIONS = [
  { value: 100, label: "Al peso" },
  { value: 1000, label: "A los $10" },
  { value: 10000, label: "A los $100" },
  { value: 100000, label: "A los $1.000" },
] as const;

export const DEFAULT_ROUNDING = 10000;

export const PERCENT_HELP =
  "Entre -90 y 300. Poné un número negativo para bajar precios.";

/** "10", "-15", "7,5" o "10%" a número; null si no sirve. */
export function parsePercent(input: string): number | null {
  const cleaned = input.trim().replace("%", "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const percent = Number(cleaned);
  if (percent === 0 || percent < -90 || percent > 300) return null;
  return percent;
}

export function parseRounding(input: string): number {
  const cents = Number(input);
  return ROUNDING_OPTIONS.some((option) => option.value === cents)
    ? cents
    : DEFAULT_ROUNDING;
}

export function roundingLabel(cents: number): string {
  return (
    ROUNDING_OPTIONS.find((option) => option.value === cents)?.label ??
    "A los $100"
  );
}

/** "+10%" o "-15%", como se escribe en el resumen y en el motivo. */
export function percentLabel(percent: number): string {
  const value = String(percent).replace(".", ",");
  return percent > 0 ? `+${value}%` : `${value}%`;
}

export type PriceScope = "categoria" | "seleccion" | "todos";

export function isPriceScope(value: string): value is PriceScope {
  return value === "categoria" || value === "seleccion" || value === "todos";
}

/** Fila que devuelve preview_price_change. */
export type PricePreviewRow = {
  product_id: string;
  name: string;
  cost_cents: number | null;
  old_price_cents: number;
  new_price_cents: number;
  old_compare_at_price_cents: number | null;
  new_compare_at_price_cents: number | null;
};

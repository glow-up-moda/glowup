// Formatos de la tienda y del panel (CLAUDE.md §8 y §10): montos en centavos,
// fechas en UTC mostradas en hora de Argentina.

export const TIME_ZONE = "America/Argentina/Buenos_Aires";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

const dateTime = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  // En Argentina se escribe 14:27, no 02:27 p. m.
  hourCycle: "h23",
});

const dateOnly = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso));
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Margen del panel (§10): (precio - costo) / precio. */
export function margin(
  priceCents: number,
  costCents: number | null,
): number | null {
  if (costCents == null || priceCents <= 0) return null;
  return (priceCents - costCents) / priceCents;
}

/**
 * Precio escrito en pesos enteros ("32.900" o "32900") a centavos. Los precios
 * no llevan centavos. null si no es un número válido.
 */
export function parsePesos(input: string): number | null {
  const cleaned = input.trim().replace(/[\s.$]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const pesos = Number(cleaned);
  // integer de Postgres en centavos: hasta 21 millones de pesos.
  if (!Number.isSafeInteger(pesos) || pesos > 21_000_000) return null;
  return pesos * 100;
}

export function centsToPesosInput(cents: number | null | undefined): string {
  return cents == null ? "" : String(Math.round(cents / 100));
}

/** "Corpiño Luna" -> "corpino-luna", el formato que exige la base. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Argentina no tiene horario de verano: siempre UTC-3.
const AR_OFFSET = "-03:00";

/** timestamptz -> valor de un <input type="datetime-local"> en hora de Argentina. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const shifted = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** Valor de un <input type="datetime-local"> (hora de Argentina) -> ISO. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00${AR_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "1 pedido", "3 pedidos". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

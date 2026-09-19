import type { Database } from "@/lib/supabase/database.types";

export type MovementType = Database["public"]["Enums"]["stock_movement_type"];

/** Por dónde se hizo una venta manual (§7, Stock). */
export const CHANNELS = [
  "Instagram",
  "WhatsApp",
  "En persona",
  "Otro",
] as const;

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  restock: "Ingreso",
  web_sale: "Venta web",
  manual_sale: "Venta manual",
  adjustment: "Ajuste",
  reservation: "Reserva",
  release: "Reserva liberada",
  return: "Devolución",
};

/** Cómo mueve cada tipo el stock en mano, para mostrar el signo. */
export function movementSign(type: MovementType, quantity: number): string {
  if (type === "adjustment")
    return quantity > 0 ? `+${quantity}` : String(quantity);
  if (type === "restock" || type === "return") return `+${quantity}`;
  if (type === "web_sale" || type === "manual_sale") return `−${quantity}`;
  // Reservas y liberaciones no cambian el stock en mano, solo lo reservado.
  return type === "reservation"
    ? `${quantity} reservado`
    : `${quantity} liberado`;
}

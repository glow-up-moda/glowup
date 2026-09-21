import type { Database } from "@/lib/supabase/database.types";

export { parseOrderNumber } from "@/lib/orders/number";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type ShippingMethod = Database["public"]["Enums"]["shipping_method"];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  ready_for_pickup: "Listo para retirar",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const STATUS_TONES: Record<
  OrderStatus,
  "neutral" | "accent" | "offer" | "success"
> = {
  pending_payment: "accent",
  paid: "offer",
  preparing: "accent",
  shipped: "neutral",
  ready_for_pickup: "neutral",
  delivered: "success",
  cancelled: "neutral",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: "Tarjeta",
  transfer: "Transferencia",
};

export const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  delivery: "Envío a domicilio",
  same_day: "Envío en el día",
  pickup: "Retiro",
};

/** Pestañas del listado: cada una es un filtro de la base. */
export const ORDER_TABS = [
  { value: "por-preparar", label: "Por preparar" },
  { value: "transferencias", label: "Transferencias" },
  { value: "revisar", label: "Para revisar" },
  { value: "preparando", label: "Preparando" },
  { value: "enviados", label: "Enviados y listos" },
  { value: "entregados", label: "Entregados" },
  { value: "cancelados", label: "Cancelados" },
  { value: "todos", label: "Todos" },
] as const;

export type OrderTab = (typeof ORDER_TABS)[number]["value"];

export function isOrderTab(value: string): value is OrderTab {
  return ORDER_TABS.some((tab) => tab.value === value);
}

/** Próximo paso de cada estado, en el orden en que se muestra (§7, Pedidos). */
export function statusActions(
  status: OrderStatus,
  shipping: ShippingMethod,
): { to: OrderStatus; label: string; primary: boolean }[] {
  const sentLabel =
    shipping === "pickup" ? "Listo para retirar" : "Marcar como enviado";
  const sent: OrderStatus =
    shipping === "pickup" ? "ready_for_pickup" : "shipped";
  switch (status) {
    case "paid":
      return [{ to: "preparing", label: "Empezar a preparar", primary: true }];
    case "preparing":
      return [
        { to: sent, label: sentLabel, primary: true },
        { to: "paid", label: "Volver a pagado", primary: false },
      ];
    case "shipped":
    case "ready_for_pickup":
      return [
        { to: "delivered", label: "Marcar como entregado", primary: true },
        { to: "preparing", label: "Volver a preparando", primary: false },
      ];
    case "delivered":
      return [
        {
          to: sent,
          label: `Volver a ${STATUS_LABELS[sent].toLowerCase()}`,
          primary: false,
        },
      ];
    default:
      return [];
  }
}

/** Link de WhatsApp: los celulares argentinos se escriben 549 + característica + número. */
export function whatsappLink(phone: string, text: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `549${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * Claves de orders.shipping_address (§8), en el orden de una etiqueta de
 * envío. jsonb no guarda el orden de las claves, por eso va fijo acá.
 */
const addressFields = [
  ["name", "Recibe"],
  ["street", "Calle"],
  ["number", "Número"],
  ["floor", "Piso"],
  ["apartment", "Depto"],
  ["city", "Localidad"],
  ["province", "Provincia"],
  ["postal_code", "Código postal"],
  ["notes", "Indicaciones"],
] as const;

/** La dirección del checkout campo por campo; lo desconocido va al final. */
export function addressLines(
  address: unknown,
): { label: string; value: string }[] {
  if (!address || typeof address !== "object" || Array.isArray(address))
    return [];
  const values = address as Record<string, unknown>;
  const known = new Set<string>(addressFields.map(([key]) => key));
  return [
    ...addressFields.map(([key, label]) => ({ label, value: values[key] })),
    ...Object.keys(values)
      .filter((key) => !known.has(key))
      .sort()
      .map((key) => ({ label: key.replace(/_/g, " "), value: values[key] })),
  ]
    .filter(({ value }) => value != null && String(value).trim() !== "")
    .map(({ label, value }) => ({ label, value: String(value) }));
}

/** La pestaña del listado donde vive un pedido, para volver a ella. */
export function tabForOrder(
  status: OrderStatus,
  payment: PaymentMethod,
): OrderTab {
  switch (status) {
    case "pending_payment":
      return payment === "transfer" ? "transferencias" : "todos";
    case "paid":
      return "por-preparar";
    case "preparing":
      return "preparando";
    case "shipped":
    case "ready_for_pickup":
      return "enviados";
    case "delivered":
      return "entregados";
    case "cancelled":
      return "cancelados";
  }
}

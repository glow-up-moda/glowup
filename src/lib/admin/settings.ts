import { centsToPesosInput } from "@/lib/format";

// Configuración de la tienda (§8, tabla settings). Los valores se guardan como
// JSON: números, booleanos, textos, listas o null.

export const SETTING_KEYS = [
  "transfer_discount_percent",
  "free_shipping_threshold_cents",
  "discounts_stack",
  "low_stock_default",
  "last_units_threshold",
  "same_day_cutoff_time",
  "announcement_messages",
  "bank_alias",
  "bank_cbu",
  "whatsapp_number",
  "welcome_coupon_code",
  "pickup_address",
  "pickup_hours",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export type SettingsValues = {
  transfer_discount_percent: string;
  free_shipping_threshold_cents: string;
  discounts_stack: boolean;
  low_stock_default: string;
  last_units_threshold: string;
  same_day_cutoff_time: string;
  announcement_messages: string;
  bank_alias: string;
  bank_cbu: string;
  whatsapp_number: string;
  welcome_coupon_code: string;
  pickup_address: string;
  pickup_hours: string;
};

function textOf(value: unknown): string {
  return typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";
}

/** Lo guardado en la base a lo que se escribe en el formulario. */
export function settingsToForm(stored: Map<string, unknown>): SettingsValues {
  const messages = stored.get("announcement_messages");
  const threshold = stored.get("free_shipping_threshold_cents");
  return {
    transfer_discount_percent: textOf(stored.get("transfer_discount_percent")),
    free_shipping_threshold_cents:
      typeof threshold === "number" ? centsToPesosInput(threshold) : "",
    discounts_stack: stored.get("discounts_stack") === true,
    low_stock_default: textOf(stored.get("low_stock_default")),
    last_units_threshold: textOf(stored.get("last_units_threshold")),
    same_day_cutoff_time: textOf(stored.get("same_day_cutoff_time")),
    announcement_messages: Array.isArray(messages) ? messages.join("\n") : "",
    bank_alias: textOf(stored.get("bank_alias")),
    bank_cbu: textOf(stored.get("bank_cbu")),
    whatsapp_number: textOf(stored.get("whatsapp_number")),
    welcome_coupon_code: textOf(stored.get("welcome_coupon_code")),
    pickup_address: textOf(stored.get("pickup_address")),
    pickup_hours: textOf(stored.get("pickup_hours")),
  };
}

export const MAX_ANNOUNCEMENTS = 5;
export const MAX_ANNOUNCEMENT_LENGTH = 80;

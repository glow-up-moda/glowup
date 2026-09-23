import { cache } from "react";

import { TIME_ZONE } from "@/lib/format";
import { createCatalogClient } from "@/lib/supabase/catalog";

// Configuración que muestra la tienda. Sale de la vista `public_settings`
// (§8): la tabla entera es privada porque también guarda el alias y el CBU.

export type StoreSettings = {
  transferDiscountPercent: number;
  freeShippingThresholdCents: number | null;
  announcementMessages: string[];
  whatsappNumber: string | null;
  sameDayCutoffTime: string | null;
  pickupAddress: string | null;
  pickupHours: string | null;
};

const defaults: StoreSettings = {
  transferDiscountPercent: 0,
  freeShippingThresholdCents: null,
  announcementMessages: [],
  whatsappNumber: null,
  sameDayCutoffTime: null,
  pickupAddress: null,
  pickupHours: null,
};

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Una sola lectura por request, aunque la pidan el header, el inicio y el pie. */
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = createCatalogClient();
  const { data } = await supabase.from("public_settings").select("key, value");
  if (!data) return defaults;

  const stored = new Map(data.map((row) => [row.key, row.value]));
  const messages = stored.get("announcement_messages");

  return {
    transferDiscountPercent:
      number(stored.get("transfer_discount_percent")) ??
      defaults.transferDiscountPercent,
    freeShippingThresholdCents: number(
      stored.get("free_shipping_threshold_cents"),
    ),
    announcementMessages: Array.isArray(messages)
      ? messages.filter(
          (message): message is string => typeof message === "string",
        )
      : [],
    whatsappNumber: text(stored.get("whatsapp_number")),
    sameDayCutoffTime: text(stored.get("same_day_cutoff_time")),
    pickupAddress: text(stored.get("pickup_address")),
    pickupHours: text(stored.get("pickup_hours")),
  };
});

/** Precio pagando por transferencia, redondeado al peso como en la base (§10). */
export function transferPrice(priceCents: number, percent: number): number {
  if (percent <= 0) return priceCents;
  return priceCents - Math.round((priceCents * percent) / 100 / 100) * 100;
}

/** Link de WhatsApp de la tienda; null si todavía no se cargó el número. */
export function storeWhatsappLink(
  number: string | null,
  text: string,
): string | null {
  if (!number) return null;
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `549${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const clock = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Si todavía se puede pedir envío en el día (§12). La hora es la de Argentina
 * y la calcula el servidor: el reloj de la clienta no decide. La base vuelve a
 * mirarlo al crear el pedido.
 */
export function isSameDayOpen(cutoff: string | null): boolean {
  if (!cutoff) return true;
  return clock.format(new Date()) <= cutoff.slice(0, 5);
}

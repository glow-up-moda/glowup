import { cache } from "react";

import { TIME_ZONE } from "@/lib/format";
import { SAME_DAY_CITIES } from "@/lib/site";
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
  /** Cómo se llama el bloque de kits en el menú y en el inicio, y su foto. */
  kitsLabel: string;
  kitsImagePath: string | null;
  /** Los textos del inicio, que se editan desde el panel (§7). */
  home: HomeTexts;
  homeHeroImagePath: string | null;
};

/**
 * Lo que se puede reescribir del inicio. Los valores por defecto están abajo y
 * no en la base: lo guardado es solo lo que se cambió, y un campo que se borra
 * vuelve solo al texto de fábrica en vez de dejar un hueco.
 */
export type HomeTexts = {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  categoriesTitle: string;
  newTitle: string;
  kitsTitle: string;
  benefitsTitle: string;
  benefits: string[];
  newsletterTitle: string;
  newsletterText: string;
  footerTagline: string;
};

export const homeDefaults: HomeTexts = {
  heroTitle: "Llevá el verano con vos.",
  heroSubtitle: "Prendas y accesorios para acompañarte en cada momento.",
  heroCta: "Ver la colección",
  categoriesTitle: "Qué estás buscando",
  newTitle: "Lo nuevo",
  kitsTitle: "Kits armados",
  benefitsTitle: "Comprar acá es fácil",
  benefits: [
    `Envío en el día en ${SAME_DAY_CITIES}`,
    "Cambios por fallas o manchas",
    "Productos de buena calidad y durabilidad",
  ],
  newsletterTitle: "Tu primera compra, con descuento",
  newsletterText:
    "Dejanos tu email y te mandamos un código para usar en la primera compra. Después te escribimos solo cuando vale la pena.",
  footerTagline:
    "Prendas y accesorios. Paraná, Entre Ríos. Enviamos a todo el país.",
};

/** Las claves del objeto guardado, en el orden en que se muestran en el panel. */
export const homeFields = Object.keys(homeDefaults) as (keyof HomeTexts)[];

/** Lo guardado pisa el texto de fábrica campo por campo; lo vacío no pisa nada. */
function mergeHome(stored: unknown): HomeTexts {
  if (typeof stored !== "object" || stored === null) return homeDefaults;
  const saved = stored as Record<string, unknown>;
  const merged = { ...homeDefaults };

  for (const field of homeFields) {
    const value = saved[field];
    if (field === "benefits") {
      const list = Array.isArray(value)
        ? value.filter(
            (item): item is string =>
              typeof item === "string" && item.trim() !== "",
          )
        : [];
      if (list.length > 0) merged.benefits = list;
      continue;
    }
    if (typeof value === "string" && value.trim() !== "")
      (merged[field] as string) = value;
  }
  return merged;
}

const defaults: StoreSettings = {
  transferDiscountPercent: 0,
  freeShippingThresholdCents: null,
  announcementMessages: [],
  whatsappNumber: null,
  sameDayCutoffTime: null,
  pickupAddress: null,
  pickupHours: null,
  kitsLabel: "Combos",
  kitsImagePath: null,
  home: homeDefaults,
  homeHeroImagePath: null,
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
    kitsLabel: text(stored.get("kits_label")) ?? defaults.kitsLabel,
    kitsImagePath: text(stored.get("kits_image_path")),
    home: mergeHome(stored.get("home_texts")),
    homeHeroImagePath: text(stored.get("home_hero_image_path")),
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

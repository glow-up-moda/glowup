"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import {
  checkbox,
  fieldErrors,
  type FormState,
  integer,
  optionalPesos,
  text,
} from "@/lib/admin/forms";
import {
  MAX_ANNOUNCEMENT_LENGTH,
  MAX_ANNOUNCEMENTS,
} from "@/lib/admin/settings";
import { requireAdmin } from "@/lib/auth/admin";

// Los datos sensibles (alias, CBU, WhatsApp) viven solo acá, nunca en el
// repositorio (§2). Vacío se guarda como null y la tienda lo trata como "no
// configurado".

const optionalPattern = (
  pattern: RegExp,
  message: string,
  clean: (value: string) => string = (value) => value.trim(),
) =>
  z.string().transform((value, ctx) => {
    // Vacío es "sin configurar"; cualquier otra cosa tiene que ser válida, así
    // un número mal escrito no se borra sin avisar.
    if (value.trim() === "") return null;
    const cleaned = clean(value);
    if (!pattern.test(cleaned)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return cleaned;
  });

const settingsSchema = z.object({
  transfer_discount_percent: integer(0, 90, "El descuento va de 0 a 90."),
  free_shipping_threshold_cents: optionalPesos(
    "Escribí el monto en pesos, sin centavos. Vacío: sin envío gratis.",
  ),
  discounts_stack: checkbox,
  low_stock_default: integer(0, 1000, "Poné un número entero de unidades."),
  last_units_threshold: integer(1, 50, "Poné un número entero de 1 a 50."),
  same_day_cutoff_time: z
    .string()
    .trim()
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "Usá el formato HH:MM, por ejemplo 15:00.",
    ),
  announcement_messages: z.string().transform((value, ctx) => {
    const messages = value
      .split("\n")
      .map((message) => message.trim())
      .filter(Boolean);
    if (messages.length > MAX_ANNOUNCEMENTS) {
      ctx.addIssue({
        code: "custom",
        message: `Hasta ${MAX_ANNOUNCEMENTS} mensajes, uno por línea.`,
      });
      return z.NEVER;
    }
    if (messages.some((message) => message.length > MAX_ANNOUNCEMENT_LENGTH)) {
      ctx.addIssue({
        code: "custom",
        message: `Cada mensaje entra en ${MAX_ANNOUNCEMENT_LENGTH} caracteres.`,
      });
      return z.NEVER;
    }
    return messages;
  }),
  bank_alias: optionalPattern(
    /^[a-zA-Z0-9.-]{6,20}$/,
    "El alias tiene de 6 a 20 caracteres: letras, números, puntos o guiones.",
  ),
  bank_cbu: optionalPattern(/^\d{22}$/, "El CBU tiene 22 números.", (value) =>
    value.replace(/[\s-]/g, ""),
  ),
  whatsapp_number: optionalPattern(
    /^\d{8,15}$/,
    "Escribí el número con característica, solo números.",
    (value) => value.replace(/\D/g, ""),
  ),
});

export async function saveSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = settingsSchema.safeParse({
    transfer_discount_percent: text(formData, "transfer_discount_percent"),
    free_shipping_threshold_cents: text(
      formData,
      "free_shipping_threshold_cents",
    ),
    discounts_stack: text(formData, "discounts_stack"),
    low_stock_default: text(formData, "low_stock_default"),
    last_units_threshold: text(formData, "last_units_threshold"),
    same_day_cutoff_time: text(formData, "same_day_cutoff_time"),
    announcement_messages: text(formData, "announcement_messages"),
    bank_alias: text(formData, "bank_alias"),
    bank_cbu: text(formData, "bank_cbu"),
    whatsapp_number: text(formData, "whatsapp_number"),
    welcome_coupon_code: text(formData, "welcome_coupon_code"),
    pickup_address: text(formData, "pickup_address"),
    pickup_hours: text(formData, "pickup_hours"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // set_settings guarda el null de JSON en lo que queda vacío (§8).
  const { error } = await supabase.rpc("set_settings", {
    p_values: parsed.data,
  });
  if (error) {
    return {
      error: dbErrorMessage(error, "No se pudo guardar la configuración."),
    };
  }

  revalidatePath("/admin", "layout");
  return { message: "Configuración guardada." };
}

"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/params";

// "Avisame cuando vuelva" (§9.10). La tabla de avisos no está abierta al
// público: la escribe el servidor, que además valida el email y comprueba que
// la variante exista y esté agotada.

const schema = z.object({
  email: z.email({ error: "Revisá el email." }).max(120),
});

export type NotifyState = { message?: string; error?: string };

export async function notifyWhenBackInStock(
  variantId: string,
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  if (!isUuid(variantId)) {
    return { error: "Elegí un talle y probá de nuevo." };
  }
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Revisá el email: parece que falta algo." };
  }
  const email = parsed.data.email.toLowerCase();

  const supabase = createAdminClient();
  const { data: availability } = await supabase
    .from("variant_availability")
    .select("is_available")
    .eq("variant_id", variantId)
    .maybeSingle();
  if (!availability) return { error: "Ese talle ya no existe." };
  if (availability.is_available) {
    return { message: "¡Buena noticia! Ese talle volvió a estar disponible." };
  }

  const { error } = await supabase
    .from("back_in_stock_requests")
    .insert({ variant_id: variantId, email });
  // 23505: ya había un aviso pendiente para ese talle y ese email.
  if (error && error.code !== "23505") {
    return { error: "No pudimos anotarte. Probá de nuevo en un rato." };
  }

  return { message: "Listo: te escribimos apenas vuelva ese talle." };
}

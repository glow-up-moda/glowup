"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { type FormState, formValues, text } from "@/lib/admin/forms";
import { CHANNELS } from "@/lib/admin/stock";
import { requireAdmin } from "@/lib/auth/admin";

// Movimientos manuales de stock (§9.8): ingreso de mercadería, venta manual,
// ajuste y devolución. Siempre con la usuaria que los hace, y ventas y ajustes
// con nota. La base valida lo mismo por su cuenta.

const movementSchema = z.object({
  variant_id: z.uuid(),
  type: z.enum(["restock", "manual_sale", "adjustment", "return"]),
  quantity: z.coerce.number().int(),
  channel: z.string(),
  note: z.string().trim().max(200, "Hasta 200 caracteres."),
});

export async function recordMovement(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, userId } = await requireAdmin();
  const values = formValues(formData);

  const parsed = movementSchema.safeParse({
    variant_id: text(formData, "variant_id"),
    type: text(formData, "type"),
    quantity: text(formData, "quantity") || "x",
    channel: text(formData, "channel"),
    note: text(formData, "note"),
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path[0]);
    if (issues.includes("quantity"))
      return { errors: { quantity: "Escribí una cantidad." }, values };
    if (issues.includes("note"))
      return { errors: { note: "Hasta 200 caracteres." }, values };
    return { error: "Revisá los datos del movimiento.", values };
  }

  const { variant_id, type, quantity, channel, note } = parsed.data;

  if (type === "adjustment") {
    if (quantity === 0 || Math.abs(quantity) > 999) {
      return {
        errors: { quantity: "Un número distinto de cero, entre -999 y 999." },
        values,
      };
    }
    if (!note)
      return {
        errors: { note: "Contá por qué se ajusta: queda en el historial." },
        values,
      };
  } else if (quantity < 1 || quantity > 999) {
    return { errors: { quantity: "Un número de 1 a 999." }, values };
  }

  let finalNote = note;
  if (type === "manual_sale") {
    if (!CHANNELS.includes(channel as (typeof CHANNELS)[number])) {
      return { errors: { channel: "Elegí por dónde fue la venta." }, values };
    }
    finalNote = note ? `${channel}: ${note}` : channel;
  }

  let available: number;
  let pendingNotices = 0;

  if (type === "restock") {
    const { data, error } = await supabase.rpc("restock_variant", {
      p_variant_id: variant_id,
      p_quantity: quantity,
      p_note: finalNote,
      p_created_by: userId,
    });
    if (error) return { error: dbErrorMessage(error), values };
    const result = data as {
      available: number;
      pending_back_in_stock: unknown[];
    };
    available = result.available;
    pendingNotices = result.pending_back_in_stock.length;
  } else {
    const { data, error } = await supabase.rpc("record_stock_movement", {
      p_variant_id: variant_id,
      p_type: type,
      p_quantity: quantity,
      p_note: finalNote,
      p_created_by: userId,
    });
    if (error) return { error: dbErrorMessage(error), values };
    available = (data as { available: number }).available;
  }

  revalidatePath("/admin", "layout");

  const notices =
    pendingNotices > 0
      ? ` Hay ${pendingNotices} ${pendingNotices === 1 ? "aviso" : "avisos"} de reposición esperando este talle.`
      : "";
  return {
    message: `Listo: ${available === 1 ? "queda 1 disponible" : `quedan ${available} disponibles`}.${notices}`,
  };
}

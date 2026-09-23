"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { fieldErrors, type FormState, text } from "@/lib/admin/forms";
import { parsePesos } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/params";

// Zonas de envío (§12). El costo y el plazo que ve la clienta salen de acá, y
// `calculate_order_totals` lee la misma fila al cobrar (§10).

/** El costo de la zona sí puede ser 0: una zona sin cargo es una decisión. */
const zonePrice = z.string().transform((value, ctx) => {
  const cents = parsePesos(value);
  if (cents == null) {
    ctx.addIssue({
      code: "custom",
      message: "Escribí el costo en pesos, sin centavos. 0 es sin cargo.",
    });
    return z.NEVER;
  }
  return cents;
});

/** Una por línea: así se escriben cómodo desde el celular. */
const lines = z.string().transform((value) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
);

const zoneSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Poné un nombre de al menos 3 caracteres.")
    .max(60, "Hasta 60 caracteres."),
  price_cents: zonePrice,
  eta_text: z
    .string()
    .trim()
    .min(3, "Contá cuánto tarda.")
    .max(60, "Hasta 60 caracteres."),
  same_day: z.string().transform((value) => value === "on"),
  provinces: lines,
  postal_codes: lines,
});

function parse(formData: FormData) {
  return zoneSchema.safeParse({
    name: text(formData, "name"),
    price_cents: text(formData, "price_cents"),
    eta_text: text(formData, "eta_text"),
    same_day: text(formData, "same_day"),
    provinces: text(formData, "provinces"),
    postal_codes: text(formData, "postal_codes"),
  });
}

const duplicated = "Ya hay una zona con ese nombre.";

export async function createZone(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { data, error } = await supabase
    .from("shipping_zones")
    .insert(parsed.data)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? duplicated
          : dbErrorMessage(error, "No se pudo crear la zona."),
    };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/zonas/${data.id}?hecho=creada`);
}

export async function updateZone(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa zona." };

  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { error } = await supabase
    .from("shipping_zones")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23505"
          ? duplicated
          : dbErrorMessage(error, "No se pudo guardar la zona."),
    };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/zonas/${id}?hecho=guardada`);
}

export async function deleteZone(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa zona." };

  const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
  if (error) {
    // La base no deja borrar una zona que ya viajó en un pedido.
    return {
      error:
        error.code === "23503"
          ? "Esa zona ya se usó en un pedido, así que no se puede borrar. Podés cambiarle el costo o el plazo."
          : dbErrorMessage(error, "No se pudo borrar la zona."),
    };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/zonas?hecho=borrada");
}

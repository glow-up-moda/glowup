"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { fieldErrors, type FormState, text } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePesos, slugify } from "@/lib/format";
import { isUuid } from "@/lib/params";

// Kits (§7). No tienen stock propio: el disponible sale de sus componentes
// (§9.7), así que acá se edita qué trae, cuánto sale y si está publicado.

const pesosObligatorio = (mensaje: string) =>
  z.string().transform((value, ctx) => {
    const cents = parsePesos(value);
    if (cents == null) {
      ctx.addIssue({ code: "custom", message: mensaje });
      return z.NEVER;
    }
    return cents;
  });

const pesosOpcional = (mensaje: string) =>
  z.string().transform((value, ctx): number | null => {
    if (value.trim() === "") return null;
    const cents = parsePesos(value);
    if (cents == null) {
      ctx.addIssue({ code: "custom", message: mensaje });
      return z.NEVER;
    }
    return cents;
  });

const kitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Poné un nombre de al menos 3 caracteres.")
    .max(80, "Hasta 80 caracteres."),
  slug: z.string(),
  price_cents: pesosObligatorio("Escribí el precio en pesos, sin centavos."),
  compare_at_price_cents: pesosOpcional(
    "Escribí el precio tachado en pesos, o dejalo vacío.",
  ),
  is_published: z.string().transform((value) => value === "on"),
});

type KitItem = { variant_id: string; quantity: number };

/** Las líneas del kit: una variante y cuántas trae. */
function parseItems(formData: FormData): KitItem[] | null {
  const variantes = formData.getAll("item_variante").map(String);
  const cantidades = formData.getAll("item_cantidad").map(String);

  const items: KitItem[] = [];
  for (const [index, variantId] of variantes.entries()) {
    if (!variantId) continue;
    if (!isUuid(variantId)) return null;
    const quantity = Number.parseInt(cantidades[index] ?? "", 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return null;
    }
    // Una variante repetida rompería la clave primaria: se suman.
    const existente = items.find((item) => item.variant_id === variantId);
    if (existente) existente.quantity += quantity;
    else items.push({ variant_id: variantId, quantity });
  }
  return items;
}

function parse(formData: FormData) {
  return kitSchema.safeParse({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    price_cents: text(formData, "price_cents"),
    compare_at_price_cents: text(formData, "compare_at_price_cents"),
    is_published: text(formData, "is_published"),
  });
}

/** El slug se escribe solo desde el nombre si no lo completaron. */
function slugOf(values: { slug: string; name: string }): string {
  return slugify(values.slug || values.name);
}

async function guardarItems(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  kitId: string,
  items: KitItem[],
): Promise<string | null> {
  const { error: borrado } = await supabase
    .from("kit_items")
    .delete()
    .eq("kit_id", kitId);
  if (borrado) return dbErrorMessage(borrado, "No se pudo guardar qué trae.");

  if (items.length === 0) return null;
  const { error } = await supabase
    .from("kit_items")
    .insert(items.map((item) => ({ ...item, kit_id: kitId })));
  return error ? dbErrorMessage(error, "No se pudo guardar qué trae.") : null;
}

const duplicado = "Ya hay un kit con ese nombre o esa dirección.";

export async function createKit(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const items = parseItems(formData);
  if (!items) return { error: "Revisá las cantidades de lo que trae el kit." };

  const slug = slugOf(parsed.data);
  if (!slug) return { errors: { name: "Ese nombre no sirve como dirección." } };

  const { data, error } = await supabase
    .from("kits")
    .insert({ ...parsed.data, slug })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? duplicado
          : dbErrorMessage(error, "No se pudo crear el kit."),
    };
  }

  const problema = await guardarItems(supabase, data.id, items);
  if (problema) return { error: problema };

  revalidatePath("/admin", "layout");
  redirect(`/admin/kits/${data.id}?hecho=creado`);
}

export async function updateKit(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos ese kit." };

  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const items = parseItems(formData);
  if (!items) return { error: "Revisá las cantidades de lo que trae el kit." };

  const slug = slugOf(parsed.data);
  if (!slug) return { errors: { name: "Ese nombre no sirve como dirección." } };

  // Un kit publicado sin componentes no se puede armar.
  if (parsed.data.is_published && items.length === 0) {
    return { error: "Un kit publicado tiene que traer al menos un producto." };
  }

  const { error } = await supabase
    .from("kits")
    .update({ ...parsed.data, slug })
    .eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23505"
          ? duplicado
          : dbErrorMessage(error, "No se pudo guardar el kit."),
    };
  }

  const problema = await guardarItems(supabase, id, items);
  if (problema) return { error: problema };

  revalidatePath("/admin", "layout");
  redirect(`/admin/kits/${id}?hecho=guardado`);
}

export async function deleteKit(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos ese kit." };

  const { error } = await supabase.from("kits").delete().eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Este kit ya se vendió, así que no se puede borrar. Despublicalo."
          : dbErrorMessage(error, "No se pudo borrar el kit."),
    };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/kits?hecho=borrado");
}

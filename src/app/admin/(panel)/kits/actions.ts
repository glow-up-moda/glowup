"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { fieldErrors, type FormState, text } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePesos, slugify } from "@/lib/format";
import { isUuid } from "@/lib/params";
import { MAX_UPLOAD_BYTES, PRODUCT_IMAGES_BUCKET } from "@/lib/images";

const pesosObligatorio = (mensaje: string) =>
  z.string().transform((value, ctx) => {
    const cents = parsePesos(value);
    if (cents == null || cents <= 0) {
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
  is_dynamic: z.boolean(),
  discount_percent: z.number().int().min(0).max(90),
});

type KitItem = { variant_id: string; quantity: number };
type KitComponent = { category_id: string; quantity: number; sort_order: number };

function parseItems(formData: FormData): KitItem[] | null {
  const variantes = formData.getAll("item_variante").map(String);
  const cantidades = formData.getAll("item_cantidad").map(String);
  const items: KitItem[] = [];

  for (const [index, variantId] of variantes.entries()) {
    if (!variantId) continue;
    if (!isUuid(variantId)) return null;
    const quantity = Number.parseInt(cantidades[index] ?? "", 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
    const existing = items.find((item) => item.variant_id === variantId);
    if (existing) existing.quantity += quantity;
    else items.push({ variant_id: variantId, quantity });
  }
  return items;
}

function parseComponents(formData: FormData): KitComponent[] | null {
  const categories = formData.getAll("component_category").map(String);
  const components: KitComponent[] = [];

  for (const categoryId of categories) {
    if (!categoryId) continue;
    if (!isUuid(categoryId) || components.some((item) => item.category_id === categoryId)) {
      return null;
    }
    components.push({
      category_id: categoryId,
      quantity: 1,
      sort_order: components.length,
    });
  }
  return components;
}


async function componentCategoryError(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  components: KitComponent[],
): Promise<string | null> {
  if (components.length === 0) return null;

  const ids = components.map((component) => component.category_id);
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id")
    .in("id", ids);

  if (error || !data || data.length !== ids.length) {
    return "No pudimos validar las categorías seleccionadas.";
  }

  const selected = new Set(ids);
  if (data.some((category) => category.parent_id && selected.has(category.parent_id))) {
    return "Elegí una categoría principal o una de sus subcategorías, no ambas.";
  }

  return null;
}

function parse(formData: FormData) {
  const isDynamic = text(formData, "kit_type") === "dynamic";
  const rawDiscount = isDynamic ? Number(text(formData, "discount_percent")) : 0;
  return kitSchema.safeParse({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    price_cents: isDynamic ? "1" : text(formData, "price_cents"),
    compare_at_price_cents: isDynamic ? "" : text(formData, "compare_at_price_cents"),
    is_published: text(formData, "is_published"),
    is_dynamic: isDynamic,
    discount_percent: Number.isInteger(rawDiscount) ? rawDiscount : -1,
  });
}

function slugOf(values: { slug: string; name: string }): string {
  return slugify(values.slug || values.name);
}

async function guardarContenido(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  kitId: string,
  isDynamic: boolean,
  items: KitItem[],
  components: KitComponent[],
): Promise<string | null> {
  const [{ error: deleteItemsError }, { error: deleteComponentsError }] =
    await Promise.all([
      supabase.from("kit_items").delete().eq("kit_id", kitId),
      supabase.from("kit_components").delete().eq("kit_id", kitId),
    ]);

  if (deleteItemsError) return dbErrorMessage(deleteItemsError, "No se pudo actualizar el contenido del kit.");
  if (deleteComponentsError) return dbErrorMessage(deleteComponentsError, "No se pudo actualizar las categorías del kit.");

  if (isDynamic) {
    if (components.length === 0) return null;
    const { error } = await supabase
      .from("kit_components")
      .insert(components.map((component) => ({ ...component, kit_id: kitId })));
    return error ? dbErrorMessage(error, "No se pudieron guardar las categorías.") : null;
  }

  if (items.length === 0) return null;
  const { error } = await supabase
    .from("kit_items")
    .insert(items.map((item) => ({ ...item, kit_id: kitId })));
  return error ? dbErrorMessage(error, "No se pudo guardar qué trae el kit.") : null;
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
  const components = parseComponents(formData);
  if (!items || !components) return { error: "Revisá los productos, categorías y cantidades." };
  if (parsed.data.is_dynamic) {
    const categoryError = await componentCategoryError(supabase, components);
    if (categoryError) return { error: categoryError };
  }
  if (parsed.data.is_published && (parsed.data.is_dynamic ? components.length === 0 : items.length === 0)) {
    return { error: parsed.data.is_dynamic
      ? "Un kit combinable publicado tiene que incluir al menos una categoría."
      : "Un kit publicado tiene que traer al menos un producto." };
  }

  const slug = slugOf(parsed.data);
  if (!slug) return { errors: { name: "Ese nombre no sirve como dirección." } };

  const { data, error } = await supabase
    .from("kits")
    .insert({
      ...parsed.data,
      slug,
      price_cents: parsed.data.is_dynamic ? 0 : parsed.data.price_cents,
      compare_at_price_cents: parsed.data.is_dynamic ? null : parsed.data.compare_at_price_cents,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      error: error?.code === "23505"
        ? duplicado
        : dbErrorMessage(error, "No se pudo crear el kit."),
    };
  }

  const problem = await guardarContenido(
    supabase,
    data.id,
    parsed.data.is_dynamic,
    items,
    components,
  );
  if (problem) return { error: problem };

  revalidatePath("/admin", "layout");
  revalidatePath("/kits");
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
  const components = parseComponents(formData);
  if (!items || !components) return { error: "Revisá los productos, categorías y cantidades." };
  if (parsed.data.is_dynamic) {
    const categoryError = await componentCategoryError(supabase, components);
    if (categoryError) return { error: categoryError };
  }
  if (parsed.data.is_published && (parsed.data.is_dynamic ? components.length === 0 : items.length === 0)) {
    return { error: parsed.data.is_dynamic
      ? "Un kit combinable publicado tiene que incluir al menos una categoría."
      : "Un kit publicado tiene que traer al menos un producto." };
  }

  const slug = slugOf(parsed.data);
  if (!slug) return { errors: { name: "Ese nombre no sirve como dirección." } };

  const { error } = await supabase
    .from("kits")
    .update({
      ...parsed.data,
      slug,
      price_cents: parsed.data.is_dynamic ? 0 : parsed.data.price_cents,
      compare_at_price_cents: parsed.data.is_dynamic ? null : parsed.data.compare_at_price_cents,
    })
    .eq("id", id);

  if (error) {
    return {
      error: error.code === "23505"
        ? duplicado
        : dbErrorMessage(error, "No se pudo guardar el kit."),
    };
  }

  const problem = await guardarContenido(
    supabase,
    id,
    parsed.data.is_dynamic,
    items,
    components,
  );
  if (problem) return { error: problem };

  revalidatePath("/admin", "layout");
  revalidatePath("/kits");
  redirect(`/admin/kits/${id}?hecho=guardado`);
}

/** Guarda una portada propia, independiente de las fotos de los productos. */
export async function uploadKitCoverImage(
  kitId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(kitId)) return { error: "No encontramos ese kit." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { errors: { file: "Elegí una imagen." } };
  if (file.size > MAX_UPLOAD_BYTES)
    return { errors: { file: "La imagen pesa demasiado. Probá con otra." } };

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()), {
      failOn: "error",
    })
      .rotate()
      .resize({ width: 1200, height: 1500, fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    return {
      errors: { file: "No pudimos leer esa imagen. Probá con una JPG o PNG." },
    };
  }

  const { data: kit } = await supabase
    .from("kits")
    .select("cover_image_path")
    .eq("id", kitId)
    .maybeSingle();
  if (!kit) return { error: "No encontramos ese kit." };

  // Se usa un nombre nuevo para evitar que la caché de un año muestre la foto anterior.
  const path = `kits/${kitId}/${randomUUID()}.webp`;
  const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError)
    return { error: "No se pudo subir la imagen. Probá de nuevo." };

  const { error: updateError } = await supabase
    .from("kits")
    .update({ cover_image_path: path })
    .eq("id", kitId);
  if (updateError) {
    await storage.remove([path]);
    return {
      error: dbErrorMessage(updateError, "No se pudo guardar la imagen."),
    };
  }

  if (kit.cover_image_path) await storage.remove([kit.cover_image_path]);

  revalidatePath("/admin", "layout");
  revalidatePath("/kits");
  revalidatePath("/");
  return { message: "Imagen principal actualizada." };
}

export async function removeKitCoverImage(
  kitId: string,
  _prev: FormState,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(kitId)) return { error: "No encontramos ese kit." };

  const { data: kit } = await supabase
    .from("kits")
    .select("cover_image_path")
    .eq("id", kitId)
    .maybeSingle();
  if (!kit) return { error: "No encontramos ese kit." };
  if (!kit.cover_image_path)
    return { message: "El kit ya usa las fotos de sus productos." };

  const { error } = await supabase
    .from("kits")
    .update({ cover_image_path: null })
    .eq("id", kitId);
  if (error)
    return { error: dbErrorMessage(error, "No se pudo quitar la imagen.") };

  await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([kit.cover_image_path]);

  revalidatePath("/admin", "layout");
  revalidatePath("/kits");
  revalidatePath("/");
  return {
    message: "Imagen propia quitada. Se volvieron a usar las fotos de los productos.",
  };
}

export async function deleteKit(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos ese kit." };

  const { data: kit } = await supabase
    .from("kits")
    .select("cover_image_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("kits").delete().eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Este kit ya se vendió, así que no se puede borrar. Despublicalo."
          : dbErrorMessage(error, "No se pudo borrar el kit."),
    };
  }

  if (kit?.cover_image_path)
    await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([kit.cover_image_path]);

  revalidatePath("/admin", "layout");
  revalidatePath("/kits");
  redirect("/admin/kits?hecho=borrado");
}

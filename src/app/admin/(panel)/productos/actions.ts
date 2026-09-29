"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import {
  checkbox,
  fieldErrors,
  type FormState,
  formValues,
  optionalInt,
  optionalPesos,
  optionalText,
  pesos,
  text,
} from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/admin";
import { slugify } from "@/lib/format";
import { PRODUCT_IMAGES_BUCKET, thumbPath } from "@/lib/images";

// Productos ---------------------------------------------------------------------

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribí el nombre del producto.")
    .max(120, "Hasta 120 caracteres."),
  category_id: z.uuid({ error: "Elegí una categoría." }),
  description: optionalText(3000),
  measurements: optionalText(1000),
  price_cents: pesos("Escribí el precio en pesos, sin centavos."),
  compare_at_price_cents: optionalPesos(
    "Escribí el precio tachado en pesos, sin centavos.",
  ),
  cost_cents: optionalPesos("Escribí el costo en pesos, sin centavos."),
  is_published: checkbox,
});

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    name: text(formData, "name"),
    category_id: text(formData, "category_id"),
    description: text(formData, "description"),
    measurements: text(formData, "measurements"),
    price_cents: text(formData, "price"),
    compare_at_price_cents: text(formData, "compare_at_price"),
    cost_cents: text(formData, "cost"),
    is_published: text(formData, "is_published") || undefined,
  });
}

function slugTaken(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" && (error.message ?? "").includes("slug");
}

/**
 * La dirección de la tienda sale del nombre (§7): no se escribe a mano. Si dos
 * productos se llaman igual, al segundo se le suma un número, así cargar el
 * catálogo nunca se frena por el link.
 */
async function freeSlug(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  name: string,
  exceptId?: string,
): Promise<string | null> {
  const base = slugify(name);
  if (!base) return null;

  let query = supabase
    .from("products")
    .select("id, slug")
    .like("slug", base + "%");
  if (exceptId) query = query.neq("id", exceptId);
  const { data } = await query;
  const taken = new Set((data ?? []).map((row) => row.slug));

  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++)
    if (!taken.has(base + "-" + n)) return base + "-" + n;
  return base + "-" + Date.now();
}

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const values = formValues(formData);
  const parsed = parseProduct(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const fields = parsed.data;
  const slug = await freeSlug(supabase, fields.name);
  if (!slug)
    return { errors: { name: "Usá letras o números en el nombre." }, values };

  // Un producto nuevo arranca como borrador: todavía no tiene variantes ni fotos.
  const { data: product, error } = await supabase
    .from("products")
    .insert({ ...fields, slug, is_published: false })
    .select("id")
    .single();
  if (error) {
    if (slugTaken(error))
      return {
        errors: {
          name: "Ya hay otro producto con ese nombre. Cambialo un poco.",
        },
        values,
      };
    return { error: dbErrorMessage(error), values };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/productos/${product.id}?nuevo=1`);
}

export async function updateProduct(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const values = formValues(formData);
  const parsed = parseProduct(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const fields = parsed.data;
  // Con exceptId, su propia dirección no cuenta como tomada.
  const slug = await freeSlug(supabase, fields.name, productId);
  if (!slug)
    return { errors: { name: "Usá letras o números en el nombre." }, values };

  const { error } = await supabase
    .from("products")
    .update({ ...fields, slug })
    .eq("id", productId);
  if (error) {
    if (slugTaken(error))
      return {
        errors: {
          name: "Ya hay otro producto con ese nombre. Cambialo un poco.",
        },
        values,
      };
    return { error: dbErrorMessage(error), values };
  }

  revalidatePath("/admin", "layout");
  return { message: "Cambios guardados." };
}

export async function deleteProduct(productId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const { data: photos } = await supabase
    .from("product_images")
    .select("path")
    .eq("product_id", productId);
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Tiene ventas o está en un kit, así que no se puede borrar: despublicalo."
          : dbErrorMessage(error),
    };
  }

  if (photos?.length) {
    await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove(photos.flatMap((photo) => [photo.path, thumbPath(photo.path)]));
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/productos?borrado=1");
}

// Variantes ---------------------------------------------------------------------

const variantSchema = z.object({
  color: z
    .string()
    .trim()
    .min(1, "Escribí el color.")
    .max(40, "Hasta 40 caracteres."),
  size: z
    .string()
    .trim()
    .min(1, "Escribí el talle.")
    .max(20, "Hasta 20 caracteres."),
  sku: z
    .string()
    .trim()
    .max(40, "Hasta 40 caracteres.")
    .transform((value) => (value === "" ? null : value.toUpperCase())),
  low_stock_threshold: optionalInt(
    0,
    999,
    "Un número de 0 a 999, o vacío para usar el de la configuración.",
  ),
});

function parseVariant(formData: FormData) {
  return variantSchema.safeParse({
    color: text(formData, "color"),
    size: text(formData, "size"),
    sku: text(formData, "sku"),
    low_stock_threshold: text(formData, "low_stock_threshold"),
  });
}

function variantConflict(error: {
  code?: string;
  message?: string;
}): Record<string, string> | null {
  if (error.code !== "23505") return null;
  return (error.message ?? "").includes("sku")
    ? { sku: "Ese SKU ya lo usa otra variante." }
    : { size: "Ya existe ese color con ese talle." };
}

export async function addVariant(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, userId } = await requireAdmin();
  const values = formValues(formData);
  const parsed = parseVariant(formData);
  const initialStock =
    text(formData, "initial_stock").trim() === ""
      ? 0
      : Number(text(formData, "initial_stock"));

  const errors: Record<string, string> = parsed.success
    ? {}
    : fieldErrors(parsed.error);
  if (
    !Number.isInteger(initialStock) ||
    initialStock < 0 ||
    initialStock > 999
  ) {
    errors.initial_stock = "Un número de 0 a 999.";
  }
  if (!parsed.success || Object.keys(errors).length) return { errors, values };

  const { data: variant, error } = await supabase
    .from("product_variants")
    .insert({ ...parsed.data, product_id: productId })
    .select("id")
    .single();
  if (error) {
    const conflict = variantConflict(error);
    return conflict
      ? { errors: conflict, values }
      : { error: dbErrorMessage(error), values };
  }

  // El stock inicial entra como movimiento, así queda en el historial.
  if (initialStock > 0) {
    const { error: stockError } = await supabase.rpc("restock_variant", {
      p_variant_id: variant.id,
      p_quantity: initialStock,
      p_note: "Stock inicial",
      p_created_by: userId,
    });
    if (stockError) {
      revalidatePath("/admin", "layout");
      return {
        error: `La variante se creó, pero no el stock inicial: ${dbErrorMessage(stockError)}`,
      };
    }
  }

  revalidatePath("/admin", "layout");
  return {
    message: `Listo: ${parsed.data.color} ${parsed.data.size} agregada.`,
  };
}

export async function updateVariant(
  variantId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const values = formValues(formData);
  const parsed = parseVariant(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { error } = await supabase
    .from("product_variants")
    .update(parsed.data)
    .eq("id", variantId);
  if (error) {
    const conflict = variantConflict(error);
    return conflict
      ? { errors: conflict, values }
      : { error: dbErrorMessage(error), values };
  }

  revalidatePath("/admin", "layout");
  return { message: "Variante actualizada." };
}

export async function deleteVariant(variantId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock_on_hand, stock_reserved")
    .eq("id", variantId)
    .maybeSingle();
  if (!variant) return { error: "Esa variante ya no existe." };
  if (variant.stock_on_hand > 0 || variant.stock_reserved > 0) {
    return {
      error:
        "Todavía tiene stock o reservas: ajustalo a cero antes de borrarla.",
    };
  }

  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Tiene ventas o está en un kit, así que no se puede borrar."
          : dbErrorMessage(error),
    };
  }

  revalidatePath("/admin", "layout");
  return { message: "Variante borrada." };
}

// Fotos -------------------------------------------------------------------------

// El navegador ya las achica antes de subirlas; esto es solo el tope del servidor.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function uploadProductImage(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0)
    return { errors: { file: "Elegí una foto." } };
  if (file.size > MAX_UPLOAD_BYTES)
    return { errors: { file: "La foto pesa demasiado. Probá con otra." } };

  // El alt no se escribe al subir (§15): arranca con el nombre del producto,
  // que es la columna obligatoria de product_images, y después se puede
  // mejorar desde "Descripción" en cada foto.
  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .single();
  const alt = (product?.name ?? "Foto del producto").slice(0, 150);

  // WebP en dos tamaños: la foto (hasta 1600 × 2000) y la miniatura del panel.
  let full: Buffer;
  let thumb: Buffer;
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), {
      failOn: "error",
    }).rotate();
    [full, thumb] = await Promise.all([
      source
        .clone()
        .resize({
          width: 1600,
          height: 2000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer(),
      source
        .clone()
        .resize({
          width: 480,
          height: 600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toBuffer(),
    ]);
  } catch {
    return {
      errors: { file: "No pudimos leer esa foto. Probá con una JPG o PNG." },
    };
  }

  const path = `products/${productId}/${randomUUID()}.webp`;
  const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const options = {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  };
  const [uploadFull, uploadThumb] = await Promise.all([
    storage.upload(path, full, options),
    storage.upload(thumbPath(path), thumb, options),
  ]);
  if (uploadFull.error || uploadThumb.error) {
    await storage.remove([path, thumbPath(path)]);
    return { error: "No se pudo subir la foto. Probá de nuevo." };
  }

  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    path,
    alt,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) {
    await storage.remove([path, thumbPath(path)]);
    return { error: dbErrorMessage(error), values: { alt } };
  }

  revalidatePath("/admin", "layout");
  return { message: "Foto subida." };
}

export async function updateImageAlt(
  imageId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const alt = text(formData, "alt").trim();
  if (alt.length < 3 || alt.length > 150) {
    return { errors: { alt: "Entre 3 y 150 caracteres." }, values: { alt } };
  }

  const { error } = await supabase
    .from("product_images")
    .update({ alt })
    .eq("id", imageId);
  if (error) return { error: dbErrorMessage(error), values: { alt } };

  revalidatePath("/admin", "layout");
  return { message: "Descripción guardada." };
}

export async function deleteProductImage(imageId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const { data: photo } = await supabase
    .from("product_images")
    .select("path")
    .eq("id", imageId)
    .maybeSingle();
  if (!photo) return { error: "Esa foto ya no existe." };

  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);
  if (error) return { error: dbErrorMessage(error) };

  await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([photo.path, thumbPath(photo.path)]);

  revalidatePath("/admin", "layout");
  return { message: "Foto borrada." };
}

export async function moveProductImage(
  productId: string,
  imageId: string,
  direction: "up" | "down",
) {
  const { supabase } = await requireAdmin();

  const { data: photos } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .order("sort_order")
    .order("created_at");
  if (!photos) return;

  const order = photos.map((photo) => photo.id);
  const from = order.indexOf(imageId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= order.length) return;
  [order[from], order[to]] = [order[to], order[from]];

  // Se renumera todo: así nunca quedan dos fotos con el mismo orden.
  await Promise.all(
    order.map((id, index) =>
      supabase
        .from("product_images")
        .update({ sort_order: index })
        .eq("id", id),
    ),
  );

  revalidatePath("/admin", "layout");
}

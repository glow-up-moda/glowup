"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import {
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
import { slugify, variantLabel } from "@/lib/format";
import { isUuid } from "@/lib/params";
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

// Grilla de variantes -------------------------------------------------------------

// color y size en null: la fila es el producto a secas, sin variantes (§8).
type GridRow = { color: string | null; size: string | null; stock: number };

/**
 * Lee la grilla de colores × talles. Cada celda manda dos campos en paralelo,
 * `combo` y `stock`, así que `getAll` los devuelve alineados. Una celda vacía
 * no crea nada: es la forma de decir "ese color no viene en ese talle".
 */
function parseGrid(formData: FormData): {
  rows: GridRow[];
  error?: string;
} {
  const combos = formData.getAll("combo").map(String);
  const stocks = formData.getAll("stock").map(String);
  const rows: GridRow[] = [];

  for (const [index, raw] of combos.entries()) {
    const written = (stocks[index] ?? "").trim();
    if (written === "") continue;

    let pair: unknown;
    try {
      pair = JSON.parse(raw);
    } catch {
      return {
        rows: [],
        error: "No pudimos leer la grilla. Recargá la página.",
      };
    }
    if (!Array.isArray(pair) || pair.length !== 2)
      return {
        rows: [],
        error: "No pudimos leer la grilla. Recargá la página.",
      };

    const color = String(pair[0]).trim();
    const size = String(pair[1]).trim();
    if (!color || !size) continue;

    const stock = Number(written);
    if (!Number.isInteger(stock) || stock < 0 || stock > 999)
      return {
        rows: [],
        error: `El stock de ${color} talle ${size} tiene que ser un número de 0 a 999.`,
      };

    rows.push({ color, size, stock });
  }

  return { rows };
}

/** Crea las variantes de la grilla y anota el stock inicial como ingreso. */
async function createVariants(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  userId: string,
  productId: string,
  rows: GridRow[],
): Promise<string | null> {
  if (rows.length === 0) return null;

  const { data, error } = await supabase
    .from("product_variants")
    .insert(
      rows.map((row) => ({
        product_id: productId,
        color: row.color,
        size: row.size,
      })),
    )
    .select("id, color, size");
  if (error) {
    return error.code === "23505"
      ? "Hay un color y un talle repetidos en la grilla."
      : dbErrorMessage(error);
  }

  for (const created of data ?? []) {
    const row = rows.find(
      (candidate) =>
        candidate.color === created.color && candidate.size === created.size,
    );
    if (!row || row.stock <= 0) continue;

    // El stock inicial entra como movimiento, así queda en el historial (§9.8).
    const { error: stockError } = await supabase.rpc("restock_variant", {
      p_variant_id: created.id,
      p_quantity: row.stock,
      p_note: "Stock inicial",
      p_created_by: userId,
    });
    if (stockError)
      return `Las variantes se crearon, pero no el stock de ${variantLabel(created.color, created.size, "ese producto")}: ${dbErrorMessage(stockError)}`;
  }

  return null;
}

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, userId } = await requireAdmin();
  const values = formValues(formData);
  const parsed = parseProduct(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const fields = parsed.data;
  const slug = await freeSlug(supabase, fields.name);
  if (!slug)
    return { errors: { name: "Usá letras o números en el nombre." }, values };

  // Nace como borrador y lo publica el formulario recién cuando terminó de
  // subir las fotos (§7): así nunca se ve a medio cargar en la tienda.
  const grid = parseGrid(formData);
  if (grid.error) return { error: grid.error, values };

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

  // Sin colores ni talles, una sola fila sin color ni talle: es el producto a
  // secas, y ahí vive su stock (§8).
  const stockSuelto = text(formData, "stock_simple").trim();
  const rows = grid.rows.length
    ? grid.rows
    : stockSuelto === ""
      ? []
      : [{ color: null, size: null, stock: Number(stockSuelto) }];
  if (
    rows.length === 1 &&
    rows[0].color === null &&
    (!Number.isInteger(rows[0].stock) ||
      rows[0].stock < 0 ||
      rows[0].stock > 999)
  ) {
    return { errors: { stock_simple: "Un número de 0 a 999." }, values };
  }

  const variantError = await createVariants(supabase, userId, product.id, rows);

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return variantError
    ? { productId: product.id, error: variantError }
    : { productId: product.id };
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

// Color y talle vacíos quieren decir "sin variantes": la fila es el producto a
// secas y ahí vive su stock (§8).
const variantSchema = z.object({
  color: z
    .string()
    .trim()
    .max(40, "Hasta 40 caracteres.")
    .transform((value) => (value === "" ? null : value)),
  size: z
    .string()
    .trim()
    .max(20, "Hasta 20 caracteres.")
    .transform((value) => (value === "" ? null : value)),
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

export async function addVariants(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, userId } = await requireAdmin();

  const grid = parseGrid(formData);
  if (grid.error) return { error: grid.error };
  if (grid.rows.length === 0)
    return {
      error: "Escribí los colores y los talles, y el stock de al menos uno.",
    };

  const problema = await createVariants(supabase, userId, productId, grid.rows);
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  if (problema) return { error: problema };

  return {
    message:
      grid.rows.length === 1
        ? "Listo: 1 variante agregada."
        : `Listo: ${grid.rows.length} variantes agregadas.`,
  };
}

/** Publicar y despublicar, que es lo que más se toca, tiene su propio control. */
export async function setProductPublished(
  productId: string,
  published: boolean,
): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase
    .from("products")
    .update({ is_published: published })
    .eq("id", productId);

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/**
 * Duplica un producto con sus variantes, para cargar una tanda que comparte
 * colores y talles. El stock arranca en cero y el SKU queda vacío, porque es
 * único en toda la base. Las fotos no se copian: son archivos y el original se
 * quedaría sin ellas al borrar la copia.
 */
export async function duplicateProduct(productId: string): Promise<void> {
  const { supabase } = await requireAdmin();
  const falla: (motivo: string) => never = (motivo) =>
    redirect(
      `/admin/productos/${productId}?problema=${encodeURIComponent(motivo)}`,
    );
  if (!isUuid(productId)) redirect("/admin/productos");

  const { data: original } = await supabase
    .from("products")
    .select(
      "name, category_id, description, measurements, cost_cents, price_cents, compare_at_price_cents",
    )
    .eq("id", productId)
    .maybeSingle();
  if (!original) redirect("/admin/productos");

  const name = `${original.name} (copia)`;
  const slug = await freeSlug(supabase, name);
  if (!slug) falla("No pudimos armar la dirección de la copia.");

  const { data: copy, error } = await supabase
    .from("products")
    .insert({ ...original, name, slug, is_published: false })
    .select("id")
    .single();
  if (error) falla(dbErrorMessage(error));

  const { data: variants } = await supabase
    .from("product_variants")
    .select("color, size, low_stock_threshold")
    .eq("product_id", productId);
  if (variants?.length) {
    await supabase.from("product_variants").insert(
      variants.map((variant) => ({
        product_id: copy.id,
        color: variant.color,
        size: variant.size,
        low_stock_threshold: variant.low_stock_threshold,
      })),
    );
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/productos/${copy.id}?copia=1`);
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

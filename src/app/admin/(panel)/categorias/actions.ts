"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { fieldErrors, type FormState, text } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/admin";
import { slugify } from "@/lib/format";
import { MAX_UPLOAD_BYTES, PRODUCT_IMAGES_BUCKET } from "@/lib/images";
import { isUuid } from "@/lib/params";

// Categorías y subcategorías (§7). La tienda arma sus rutas con esto:
// /[categoria] y /[categoria]/[subcategoria]. Por eso solo hay dos niveles,
// y la dirección sale del nombre, igual que en productos.

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribí el nombre de la categoría.")
    .max(60, "Hasta 60 caracteres."),
  parent_id: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || isUuid(value), "Elegí una categoría."),
});

function parse(formData: FormData) {
  return categorySchema.safeParse({
    name: text(formData, "name"),
    parent_id: text(formData, "parent_id"),
  });
}

/** Como en productos: la dirección sale del nombre y, si está tomada, lleva número. */
async function freeSlug(
  supabase: Supabase,
  name: string,
  exceptId?: string,
): Promise<string | null> {
  const base = slugify(name);
  if (!base) return null;

  let query = supabase
    .from("categories")
    .select("id, slug")
    .like("slug", `${base}%`);
  if (exceptId) query = query.neq("id", exceptId);
  const { data } = await query;
  const taken = new Set((data ?? []).map((row) => row.slug));

  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++)
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${Date.now()}`;
}

/** Va al final de su grupo: así una categoría nueva no se mete en el medio. */
async function nextOrder(
  supabase: Supabase,
  parentId: string | null,
): Promise<number> {
  let query = supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  query = parentId
    ? query.eq("parent_id", parentId)
    : query.is("parent_id", null);
  const { data } = await query;
  return (data?.[0]?.sort_order ?? 0) + 1;
}

/**
 * La tienda no sabe mostrar un tercer nivel: una subcategoría no puede colgar
 * de otra subcategoría.
 */
async function parentIsTopLevel(
  supabase: Supabase,
  parentId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("categories")
    .select("parent_id")
    .eq("id", parentId)
    .maybeSingle();
  return Boolean(data) && data?.parent_id === null;
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { name, parent_id } = parsed.data;
  if (parent_id && !(await parentIsTopLevel(supabase, parent_id))) {
    return {
      errors: {
        parent_id: "Esa ya es una subcategoría. Solo hay dos niveles.",
      },
    };
  }

  const slug = await freeSlug(supabase, name);
  if (!slug) return { errors: { name: "Usá letras o números en el nombre." } };

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      parent_id,
      slug,
      sort_order: await nextOrder(supabase, parent_id),
    })
    .select("id")
    .maybeSingle();
  if (error || !data)
    return { error: dbErrorMessage(error, "No se pudo crear la categoría.") };

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect(`/admin/categorias/${data.id}?hecho=creada`);
}

export async function updateCategory(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa categoría." };

  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { name, parent_id } = parsed.data;
  if (parent_id === id)
    return { errors: { parent_id: "No puede colgar de sí misma." } };
  if (parent_id && !(await parentIsTopLevel(supabase, parent_id))) {
    return {
      errors: {
        parent_id: "Esa ya es una subcategoría. Solo hay dos niveles.",
      },
    };
  }

  // Si tiene subcategorías colgando, no puede pasar a ser subcategoría.
  if (parent_id) {
    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id);
    if (count)
      return {
        errors: {
          parent_id: `Tiene ${count} ${count === 1 ? "subcategoría" : "subcategorías"} adentro, así que no puede ser subcategoría de otra.`,
        },
      };
  }

  const slug = await freeSlug(supabase, name, id);
  if (!slug) return { errors: { name: "Usá letras o números en el nombre." } };

  const { error } = await supabase
    .from("categories")
    .update({ name, parent_id, slug })
    .eq("id", id);
  if (error)
    return { error: dbErrorMessage(error, "No se pudo guardar la categoría.") };

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect(`/admin/categorias/${id}?hecho=guardada`);
}

export async function deleteCategory(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa categoría." };

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    // La base no deja borrarla si tiene productos o subcategorías adentro.
    return {
      error:
        error.code === "23503"
          ? "Esa categoría tiene productos o subcategorías adentro. Movelos a otra y volvé a intentar."
          : dbErrorMessage(error, "No se pudo borrar la categoría."),
    };
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/categorias?hecho=borrada");
}

/**
 * Sube o baja una categoría dentro de su grupo intercambiando el orden con la
 * vecina. Es lo mismo que hacen las flechas de las fotos de un producto.
 */
export async function moveCategory(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return;

  const { data: category } = await supabase
    .from("categories")
    .select("id, parent_id, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!category) return;

  let query = supabase
    .from("categories")
    .select("id, sort_order")
    .order("sort_order", { ascending: direction === "down" })
    .limit(1);
  query = category.parent_id
    ? query.eq("parent_id", category.parent_id)
    : query.is("parent_id", null);
  query =
    direction === "up"
      ? query.lt("sort_order", category.sort_order)
      : query.gt("sort_order", category.sort_order);

  const { data: neighbours } = await query;
  const neighbour = neighbours?.[0];
  if (!neighbour) return;

  // Dos updates sueltos: el orden no tiene restricción de unicidad, así que
  // cruzarse un instante no rompe nada.
  await supabase
    .from("categories")
    .update({ sort_order: neighbour.sort_order })
    .eq("id", category.id);
  await supabase
    .from("categories")
    .update({ sort_order: category.sort_order })
    .eq("id", neighbour.id);

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/**
 * La foto de la tarjeta del inicio. Una sola por categoría y cuadrada, que es
 * como se muestra; el navegador ya la achicó a 2000px antes de mandarla y acá
 * se recorta a 1200 y se pasa a WebP, igual que las de producto (§7).
 *
 * 1200 y calidad 90 porque este archivo no es el que se sirve: Netlify lo
 * vuelve a achicar y a comprimir para cada tamaño, y partir de uno ya
 * machacado deja las letras de los productos con bordes sucios.
 */
export async function uploadCategoryImage(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa categoría." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { errors: { file: "Elegí una foto." } };
  if (file.size > MAX_UPLOAD_BYTES)
    return { errors: { file: "La foto pesa demasiado. Probá con otra." } };

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()), {
      failOn: "error",
    })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    return {
      errors: { file: "No pudimos leer esa foto. Probá con una JPG o PNG." },
    };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();
  if (!category) return { error: "No encontramos esa categoría." };

  // Nombre nuevo en cada subida: el archivo se sirve con caché de un año, así
  // que reemplazarlo con el mismo nombre dejaría la foto vieja a la vista.
  const path = `categories/${id}/${randomUUID()}.webp`;
  const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError)
    return { error: "No se pudo subir la foto. Probá de nuevo." };

  const { error } = await supabase
    .from("categories")
    .update({ image_path: path })
    .eq("id", id);
  if (error) {
    await storage.remove([path]);
    return { error: dbErrorMessage(error, "No se pudo guardar la foto.") };
  }

  // El archivo viejo recién se borra cuando el nuevo ya está guardado.
  if (category.image_path) await storage.remove([category.image_path]);

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Foto subida." };
}

export async function removeCategoryImage(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa categoría." };

  const { data: category } = await supabase
    .from("categories")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();
  if (!category?.image_path) return { message: "No tenía foto." };

  const { error } = await supabase
    .from("categories")
    .update({ image_path: null })
    .eq("id", id);
  if (error)
    return { error: dbErrorMessage(error, "No se pudo sacar la foto.") };

  await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([category.image_path]);

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Foto borrada." };
}

// Los combos (§7). `/kits` es una ruta fija, no una categoría, así que su
// nombre y su foto viven en `settings` y se editan en su propia pantalla.

const kitsSchema = z.object({
  kits_label: z
    .string()
    .trim()
    .min(2, "Escribí cómo se llama en el menú.")
    .max(30, "Hasta 30 caracteres."),
});

export async function updateKitsLabel(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = kitsSchema.safeParse({ kits_label: text(formData, "name") });
  if (!parsed.success)
    return { errors: { name: fieldErrors(parsed.error).kits_label } };

  const { error } = await supabase.rpc("set_settings", {
    p_values: { kits_label: parsed.data.kits_label },
  });
  if (error) return { error: dbErrorMessage(error, "No se pudo guardar.") };

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Nombre guardado." };
}

async function saveKitsImage(
  supabase: Supabase,
  path: string | null,
): Promise<string | null> {
  const { error } = await supabase.rpc("set_settings", {
    p_values: { kits_image_path: path },
  });
  return error ? dbErrorMessage(error, "No se pudo guardar la foto.") : null;
}

async function currentKitsImage(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kits_image_path")
    .maybeSingle();
  return typeof data?.value === "string" && data.value !== ""
    ? data.value
    : null;
}

export async function uploadKitsImage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0)
    return { errors: { file: "Elegí una foto." } };
  if (file.size > MAX_UPLOAD_BYTES)
    return { errors: { file: "La foto pesa demasiado. Probá con otra." } };

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()), {
      failOn: "error",
    })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    return {
      errors: { file: "No pudimos leer esa foto. Probá con una JPG o PNG." },
    };
  }

  const anterior = await currentKitsImage(supabase);
  const path = `categories/kits/${randomUUID()}.webp`;
  const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError)
    return { error: "No se pudo subir la foto. Probá de nuevo." };

  const problema = await saveKitsImage(supabase, path);
  if (problema) {
    await storage.remove([path]);
    return { error: problema };
  }
  if (anterior) await storage.remove([anterior]);

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Foto subida." };
}

export async function removeKitsImage(): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const anterior = await currentKitsImage(supabase);
  if (!anterior) return { message: "No tenía foto." };

  const problema = await saveKitsImage(supabase, null);
  if (problema) return { error: problema };

  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([anterior]);
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Foto borrada." };
}

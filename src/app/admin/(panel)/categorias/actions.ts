"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { fieldErrors, type FormState, text } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/admin";
import { slugify } from "@/lib/format";
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

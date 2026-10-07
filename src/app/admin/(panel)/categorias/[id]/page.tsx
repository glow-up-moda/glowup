import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { CategoryImage } from "@/components/admin/category-image";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { plural } from "@/lib/format";
import { isUuid, param } from "@/lib/params";

import {
  deleteCategory,
  removeCategoryImage,
  updateCategory,
  uploadCategoryImage,
} from "../actions";

export const metadata: Metadata = { title: "Categoría" };

const done: Record<string, string> = {
  creada: "Categoría creada.",
  guardada: "Categoría guardada.",
};

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/admin/categorias/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const message = done[param((await searchParams).hecho)];

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, image_path")
    .eq("id", id)
    .maybeSingle();
  if (!category) notFound();

  const [{ data: parents }, { count: productos }, { count: hijas }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .is("parent_id", null)
        .neq("id", id)
        .order("sort_order"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", id),
    ]);

  const ocupada = (productos ?? 0) > 0 || (hijas ?? 0) > 0;

  return (
    <>
      <PageHeader
        title={category.name}
        back={{ href: "/admin/categorias", label: "Categorías" }}
      />

      {message && <Notice tone="success">{message}</Notice>}

      <Section>
        <CategoryForm
          action={updateCategory.bind(null, id)}
          parents={parents ?? []}
          initial={{
            name: category.name,
            parent_id: category.parent_id ?? "",
          }}
          mode="edit"
        />
      </Section>

      <Section
        title="Foto"
        description="La que se ve en la tarjeta del inicio."
      >
        <CategoryImage
          name={category.name}
          imagePath={category.image_path}
          uploadAction={uploadCategoryImage.bind(null, id)}
          removeAction={removeCategoryImage.bind(null, id)}
        />
      </Section>

      <Section
        title="Borrar"
        description={
          ocupada
            ? `No se puede: tiene ${plural(productos ?? 0, "producto", "productos")} y ${plural(hijas ?? 0, "subcategoría", "subcategorías")} adentro. Movelos a otra categoría primero.`
            : "Está vacía, así que se puede borrar. Renombrarla le cambia el link."
        }
      >
        {ocupada ? (
          <Notice>
            Mientras tenga algo adentro, la base no deja borrarla. Es a
            propósito: así no desaparece un producto sin querer.
          </Notice>
        ) : (
          <ConfirmAction
            action={deleteCategory.bind(null, id)}
            label="Borrar la categoría"
            confirmLabel="Sí, borrarla"
            question="¿Seguro? No se puede deshacer."
          />
        )}
      </Section>
    </>
  );
}

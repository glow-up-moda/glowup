import type { Metadata } from "next";

import { CategoryForm } from "@/components/admin/category-form";
import { PageHeader, Section } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/admin";

import { createCategory } from "../actions";

export const metadata: Metadata = { title: "Nueva categoría" };

export default async function NewCategoryPage() {
  const { supabase } = await requireAdmin();

  const { data: parents } = await supabase
    .from("categories")
    .select("id, name")
    .is("parent_id", null)
    .order("sort_order");

  return (
    <>
      <PageHeader
        title="Nueva categoría"
        description="Si va adentro de otra, es una subcategoría y aparece en el menú desplegable."
        back={{ href: "/admin/categorias", label: "Categorías" }}
      />

      <Section>
        <CategoryForm
          action={createCategory}
          parents={parents ?? []}
          mode="create"
        />
      </Section>
    </>
  );
}

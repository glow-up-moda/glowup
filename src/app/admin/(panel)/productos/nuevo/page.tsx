import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/admin/page-header";
import { emptyProduct, ProductForm } from "@/components/admin/product-form";
import { categoryOptions } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";

import { createProduct } from "../actions";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const categories = await categoryOptions(supabase);

  return (
    <>
      <PageHeader
        title="Nuevo producto"
        description="Se publica al crearlo. Cargá los colores y talles con su stock acá mismo; las fotos se suman después."
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      <Section>
        <ProductForm
          action={createProduct}
          categories={categories}
          initial={emptyProduct}
          mode="create"
        />
      </Section>
    </>
  );
}

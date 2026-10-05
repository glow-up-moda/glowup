import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/admin/page-header";
import { CreateProductForm } from "@/components/admin/product-form";
import { categoryOptions } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const categories = await categoryOptions(supabase);

  return (
    <>
      <PageHeader
        title="Nuevo producto"
        description="Todo en una pantalla: datos, stock y fotos. Se publica recién cuando terminan de subir las fotos."
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      <Section>
        <CreateProductForm categories={categories} />
      </Section>
    </>
  );
}

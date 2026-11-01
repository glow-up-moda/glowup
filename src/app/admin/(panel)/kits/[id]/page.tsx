import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { KitForm } from "@/components/admin/kit-form";
import { KitCoverImage } from "@/components/admin/kit-cover-image";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Notice } from "@/components/ui/notice";
import { categoryOptions } from "@/lib/admin/catalog";
import { variantOptions } from "@/lib/admin/kits";
import { requireAdmin } from "@/lib/auth/admin";
import { centsToPesosInput } from "@/lib/format";
import { isUuid, param } from "@/lib/params";

import {
  deleteKit,
  removeKitCoverImage,
  updateKit,
  uploadKitCoverImage,
} from "../actions";

export const metadata: Metadata = { title: "Kit" };

const done: Record<string, string> = {
  creado: "Kit creado.",
  guardado: "Kit guardado.",
};

export default async function KitPage({
  params,
  searchParams,
}: PageProps<"/admin/kits/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const message = done[param((await searchParams).hecho)];

  const [{ data: kit }, variants, categories] = await Promise.all([
    supabase
      .from("kits")
      .select(
        "id, name, slug, price_cents, compare_at_price_cents, is_published, is_dynamic, discount_percent, cover_image_path, kit_items(variant_id, quantity), kit_components(id, category_id, quantity, sort_order)",
      )
      .eq("id", id)
      .maybeSingle(),
    variantOptions(supabase),
    categoryOptions(supabase),
  ]);
  if (!kit) notFound();

  return (
    <>
      <PageHeader
        title={kit.name}
        back={{ href: "/admin/kits", label: "Kits" }}
      />

      {message && <Notice tone="success">{message}</Notice>}

      <Section>
        <KitForm
          action={updateKit.bind(null, id)}
          variants={variants}
          categories={categories}
          mode="edit"
          initial={{
            name: kit.name,
            slug: kit.slug,
            price_cents: centsToPesosInput(kit.price_cents),
            compare_at_price_cents: centsToPesosInput(
              kit.compare_at_price_cents,
            ),
            is_published: kit.is_published,
            is_dynamic: kit.is_dynamic,
            discount_percent: String(kit.discount_percent),
            items: kit.kit_items,
            components: kit.kit_components,
          }}
        />
      </Section>

      <Section
        title="Imagen principal"
        description="Esta imagen reemplaza las fotos automáticas de los productos en la tarjeta del kit."
      >
        <KitCoverImage
          name={kit.name}
          imagePath={kit.cover_image_path}
          uploadAction={uploadKitCoverImage.bind(null, id)}
          removeAction={removeKitCoverImage.bind(null, id)}
        />
      </Section>

      <Section
        title="Borrar"
        description="Solo se puede si ningún pedido lo incluyó. Si ya se vendió, despublicalo."
      >
        <ConfirmAction
          action={deleteKit.bind(null, id)}
          label="Borrar el kit"
          confirmLabel="Sí, borrarlo"
          question="¿Seguro? No se puede deshacer."
        />
      </Section>
    </>
  );
}

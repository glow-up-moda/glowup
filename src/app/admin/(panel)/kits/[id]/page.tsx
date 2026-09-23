import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { KitForm } from "@/components/admin/kit-form";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Notice } from "@/components/ui/notice";
import { variantOptions } from "@/lib/admin/kits";
import { requireAdmin } from "@/lib/auth/admin";
import { centsToPesosInput } from "@/lib/format";
import { isUuid, param } from "@/lib/params";

import { deleteKit, updateKit } from "../actions";

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

  const [{ data: kit }, variants] = await Promise.all([
    supabase
      .from("kits")
      .select(
        "id, name, slug, price_cents, compare_at_price_cents, is_published, kit_items(variant_id, quantity)",
      )
      .eq("id", id)
      .maybeSingle(),
    variantOptions(supabase),
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
          mode="edit"
          initial={{
            name: kit.name,
            slug: kit.slug,
            price_cents: centsToPesosInput(kit.price_cents),
            compare_at_price_cents: centsToPesosInput(
              kit.compare_at_price_cents,
            ),
            is_published: kit.is_published,
            items: kit.kit_items,
          }}
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

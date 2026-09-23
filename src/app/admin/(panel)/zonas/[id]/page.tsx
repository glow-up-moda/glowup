import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { PageHeader, Section } from "@/components/admin/page-header";
import { ZoneForm } from "@/components/admin/zone-form";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { centsToPesosInput } from "@/lib/format";
import { isUuid, param } from "@/lib/params";

import { deleteZone, updateZone } from "../actions";

export const metadata: Metadata = { title: "Zona de envío" };

const done: Record<string, string> = {
  creada: "Zona creada.",
  guardada: "Zona guardada.",
};

export default async function ZonePage({
  params,
  searchParams,
}: PageProps<"/admin/zonas/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const message = done[param((await searchParams).hecho)];

  const { data: zone } = await supabase
    .from("shipping_zones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!zone) notFound();

  return (
    <>
      <PageHeader
        title={zone.name}
        back={{ href: "/admin/zonas", label: "Zonas de envío" }}
      />

      {message && <Notice tone="success">{message}</Notice>}

      <Section>
        <ZoneForm
          action={updateZone.bind(null, id)}
          mode="edit"
          initial={{
            name: zone.name,
            price_cents: centsToPesosInput(zone.price_cents),
            eta_text: zone.eta_text,
            same_day: zone.same_day,
            provinces: zone.provinces.join("\n"),
            postal_codes: zone.postal_codes.join("\n"),
          }}
        />
      </Section>

      <Section
        title="Borrar"
        description="Solo se puede si ningún pedido la usó. Si ya viajó en un pedido, cambiale el costo o el plazo."
      >
        <ConfirmAction
          action={deleteZone.bind(null, id)}
          label="Borrar la zona"
          confirmLabel="Sí, borrarla"
          question="¿Seguro? No se puede deshacer."
        />
      </Section>
    </>
  );
}

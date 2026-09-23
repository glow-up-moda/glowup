import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/admin/page-header";
import { ZoneForm } from "@/components/admin/zone-form";
import { requireAdmin } from "@/lib/auth/admin";

import { createZone } from "../actions";

export const metadata: Metadata = { title: "Nueva zona" };

export default async function NewZonePage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Nueva zona"
        back={{ href: "/admin/zonas", label: "Zonas de envío" }}
      />
      <Section>
        <ZoneForm action={createZone} mode="create" />
      </Section>
    </>
  );
}

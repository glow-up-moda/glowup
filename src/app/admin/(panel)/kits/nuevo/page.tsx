import type { Metadata } from "next";

import { KitForm } from "@/components/admin/kit-form";
import { PageHeader, Section } from "@/components/admin/page-header";
import { categoryOptions } from "@/lib/admin/catalog";
import { variantOptions } from "@/lib/admin/kits";
import { requireAdmin } from "@/lib/auth/admin";

import { createKit } from "../actions";

export const metadata: Metadata = { title: "Nuevo kit" };

export default async function NewKitPage() {
  const { supabase } = await requireAdmin();
  const [variants, categories] = await Promise.all([
    variantOptions(supabase),
    categoryOptions(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Nuevo kit"
        back={{ href: "/admin/kits", label: "Kits" }}
      />
      <Section>
        <KitForm
          action={createKit}
          variants={variants}
          categories={categories}
          mode="create"
        />
      </Section>
    </>
  );
}

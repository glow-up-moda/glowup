import type { Metadata } from "next";

import { CategoryImage } from "@/components/admin/category-image";
import { KitsForm } from "@/components/admin/kits-form";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";

import { removeKitsImage, updateKitsLabel, uploadKitsImage } from "../actions";

export const metadata: Metadata = { title: "Combos" };

/**
 * Los combos no son una categoría: `/kits` es una ruta fija que lista la tabla
 * `kits`. Pero sí están en el menú y en el inicio, así que su nombre y su foto
 * se editan acá, al lado de las categorías (§7).
 */
export default async function KitsBlockPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["kits_label", "kits_image_path"]);

  const stored = new Map((data ?? []).map((row) => [row.key, row.value]));
  const valor = (clave: string) => {
    const value = stored.get(clave);
    return typeof value === "string" && value.trim() !== "" ? value : null;
  };
  const label = valor("kits_label") ?? "Combos";

  return (
    <>
      <PageHeader
        title={label}
        back={{ href: "/admin/categorias", label: "Categorías" }}
      />

      <Notice>
        Esto no es una categoría: los combos se arman en Kits y viven siempre en{" "}
        <strong>/kits</strong>. Acá se cambia cómo se llaman y la foto que los
        muestra.
      </Notice>

      <Section>
        <KitsForm action={updateKitsLabel} initial={label} />
      </Section>

      <Section
        title="Foto"
        description="La que se ve en la tarjeta del inicio."
      >
        <CategoryImage
          name={label}
          imagePath={valor("kits_image_path")}
          uploadAction={uploadKitsImage}
          removeAction={removeKitsImage}
        />
      </Section>
    </>
  );
}

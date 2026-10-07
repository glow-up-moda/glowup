import type { Metadata } from "next";

import { CategoryImage } from "@/components/admin/category-image";
import { HomeTextsForm } from "@/components/admin/home-texts-form";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { getStoreSettings } from "@/lib/store/settings";

import { removeHeroImage, updateHomeTexts, uploadHeroImage } from "./actions";

export const metadata: Metadata = { title: "Textos del inicio" };

/**
 * Los textos y la foto del inicio (§7). Lo que no está acá —los legales, los
 * botones, los mensajes de error— se cambia en el código: ahí un texto mal
 * puesto rompe la compra sin que se note.
 */
export default async function HomeTextsPage() {
  await requireAdmin();
  const settings = await getStoreSettings();

  return (
    <>
      <PageHeader
        title="Textos del inicio"
        description="Lo que se lee en la portada, y la foto grande de arriba."
      />

      <Notice>
        Si borrás un campo y guardás, vuelve solo al texto original. Esa es la
        salida si algo queda mal.
      </Notice>

      <Section
        title="Foto de arriba"
        description="La del arco, al lado del título. Se recorta a lo alto."
      >
        <CategoryImage
          name="la portada"
          imagePath={settings.homeHeroImagePath}
          uploadAction={uploadHeroImage}
          removeAction={removeHeroImage}
        />
      </Section>

      <Section>
        <HomeTextsForm action={updateHomeTexts} initial={settings.home} />
      </Section>
    </>
  );
}

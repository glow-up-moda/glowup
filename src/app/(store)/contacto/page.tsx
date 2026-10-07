import type { Metadata } from "next";
import Link from "next/link";

import { Block, PageShell } from "@/components/store/page-shell";
import { IconWhatsApp } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";
import { getStoreSettings, storeWhatsappLink } from "@/lib/store/settings";

export const metadata: Metadata = {
  title: "Contacto · MAREA",
  description: "Escribinos por WhatsApp: te respondemos nosotras.",
};

export default async function ContactPage() {
  const { whatsappNumber } = await getStoreSettings();
  const whatsapp = storeWhatsappLink(
    whatsappNumber,
    "¡Hola! Tengo una consulta.",
  );

  return (
    <PageShell
      title="Contacto"
      intro="Escribinos cuando quieras: contestamos nosotras, de lunes a sábado."
    >
      <Block title="Por WhatsApp">
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("primary", "self-start")}
          >
            <IconWhatsApp />
            Escribinos por WhatsApp
          </a>
        ) : (
          <p>Estamos terminando de configurar el WhatsApp de la tienda.</p>
        )}
        <p className="text-sm">
          Es la vía más rápida, sobre todo para dudas de talles.
        </p>
      </Block>

      <Block title="Antes de escribir">
        <p>
          Puede que la respuesta ya esté en{" "}
          <Link
            href="/preguntas-frecuentes"
            className="underline underline-offset-4"
          >
            preguntas frecuentes
          </Link>{" "}
          o en{" "}
          <Link
            href="/envios-y-cambios"
            className="underline underline-offset-4"
          >
            envíos y cambios
          </Link>
          .
        </p>
      </Block>
    </PageShell>
  );
}

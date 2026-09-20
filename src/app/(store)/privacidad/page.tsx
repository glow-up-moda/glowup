import type { Metadata } from "next";

import { LegalDraft } from "@/components/store/legal-draft";
import { Block, PageShell } from "@/components/store/page-shell";

export const metadata: Metadata = {
  title: "Privacidad · GLOW UP",
  description: "Qué datos pedimos y para qué los usamos.",
};

export default function PrivacyPage() {
  return (
    <PageShell title="Privacidad">
      <LegalDraft />
      <Block title="En criollo">
        <p>
          Pedimos tu email y tu teléfono para poder mandarte el pedido y
          avisarte en cada paso, y tu dirección solo si elegís envío a
          domicilio.
        </p>
        <p>
          No guardamos datos de tarjetas: el pago con tarjeta lo procesa Mercado
          Pago en su propio sitio.
        </p>
        <p>
          Solo te mandamos novedades si lo aceptás al comprar, y podés pedirnos
          que te saquemos de la lista cuando quieras.
        </p>
      </Block>
    </PageShell>
  );
}

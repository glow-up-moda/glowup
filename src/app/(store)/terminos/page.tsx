import type { Metadata } from "next";
import Link from "next/link";

import { LegalDraft } from "@/components/store/legal-draft";
import { Block, PageShell } from "@/components/store/page-shell";

export const metadata: Metadata = {
  title: "Términos y condiciones · GLOW UP",
  description: "Condiciones de compra en GLOW UP.",
};

export default function TermsPage() {
  return (
    <PageShell title="Términos y condiciones">
      <LegalDraft />
      <Block title="Mientras tanto">
        <p>
          Lo que ya podés consultar está en{" "}
          <Link
            href="/envios-y-cambios"
            className="underline underline-offset-4"
          >
            envíos y cambios
          </Link>{" "}
          (plazos, costos y política de cambios) y en{" "}
          <Link
            href="/preguntas-frecuentes"
            className="underline underline-offset-4"
          >
            preguntas frecuentes
          </Link>
          .
        </p>
      </Block>
    </PageShell>
  );
}

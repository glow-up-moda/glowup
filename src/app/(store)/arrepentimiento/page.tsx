import type { Metadata } from "next";
import Link from "next/link";

import { LegalDraft } from "@/components/store/legal-draft";
import { Block, PageShell } from "@/components/store/page-shell";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento · GLOW UP",
  description:
    "Cómo cancelar una compra dentro de los 10 días, como indica la ley.",
};

export default function WithdrawalPage() {
  return (
    <PageShell
      title="Botón de arrepentimiento"
      intro="Podés arrepentirte de una compra online dentro de los 10 días corridos de recibirla, sin explicar por qué."
    >
      <Block title="Cómo hacerlo">
        <p>
          Escribinos por{" "}
          <Link href="/contacto" className="underline underline-offset-4">
            WhatsApp
          </Link>{" "}
          con tu número de pedido (empieza con GU-) y decinos que querés
          arrepentirte. Te respondemos con los pasos y coordinamos el retiro sin
          costo para vos.
        </p>
        <p>
          El reintegro se hace por el mismo medio con el que pagaste, una vez
          que recibimos el producto sin uso y con su etiqueta.
        </p>
      </Block>
      <LegalDraft />
    </PageShell>
  );
}

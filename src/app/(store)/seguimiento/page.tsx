import type { Metadata } from "next";
import Link from "next/link";

import { OrderEmailForm } from "@/components/store/order-email-form";
import { Block, PageShell } from "@/components/store/page-shell";

import { findOrder } from "../pedido/actions";

export const metadata: Metadata = {
  title: "Seguir mi pedido · GLOW UP",
  description: "Mirá en qué anda tu pedido con el número y tu email.",
};

export default function TrackOrderPage() {
  return (
    <PageShell
      title="Seguir mi pedido"
      intro="Con el número de pedido y tu email te mostramos en qué anda."
    >
      <OrderEmailForm
        action={findOrder}
        askNumber
        submitLabel="Buscar mi pedido"
      />

      <Block title="¿Dónde está el número?">
        <p>
          Empieza con GU- y te lo mandamos por email apenas hiciste la compra.
          También aparece en la pantalla de confirmación.
        </p>
        <p>
          Si no lo encontrás,{" "}
          <Link href="/contacto" className="underline underline-offset-4">
            escribinos
          </Link>{" "}
          y lo buscamos por vos.
        </p>
      </Block>
    </PageShell>
  );
}

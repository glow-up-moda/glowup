import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/store/page-shell";
import { UnsubscribeForm } from "@/components/store/unsubscribe-form";
import { isUuid } from "@/lib/params";
import { createAdminClient } from "@/lib/supabase/admin";

// Baja de los avisos de carrito abandonado (§15). La baja se confirma con un
// botón, no con el link: los lectores de correo abren los links solos y no
// sería ella quien se dio de baja.

export const metadata: Metadata = {
  title: "Dejar de recibir avisos · GLOW UP",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  params,
}: PageProps<"/baja/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = createAdminClient();
  const { data: cart } = await supabase
    .from("abandoned_carts")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  // Sin fila, ya se dio de baja (o el carrito se limpió): se le dice que está
  // listo, no que no existe.
  if (!cart) {
    return (
      <PageShell
        title="Listo"
        intro="No vamos a escribirte más para recordarte lo que dejaste en la bolsa. Los emails de tus pedidos siguen llegando, porque son sobre tu compra."
      />
    );
  }

  return (
    <PageShell
      title="¿Dejamos de escribirte?"
      intro="Podemos dejar de mandarte el recordatorio de lo que dejaste en la bolsa. Los emails de tus pedidos van a seguir llegando: son sobre tu compra."
    >
      <UnsubscribeForm id={id} />
    </PageShell>
  );
}

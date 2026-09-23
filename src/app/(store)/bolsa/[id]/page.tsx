import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestoreCartButton } from "@/components/store/restore-cart-button";
import { PageShell } from "@/components/store/page-shell";
import { formatMoney } from "@/lib/format";
import { isUuid } from "@/lib/params";
import { getSavedCart } from "@/lib/store/abandoned";

// Link del email de carrito abandonado (§13). Muestra lo que había con los
// precios de hoy, y con un botón vuelve a la bolsa: no se toca el carrito del
// navegador hasta que ella lo pide, porque los lectores de correo abren los
// links solos.

export const metadata: Metadata = {
  title: "Tu bolsa · GLOW UP",
  robots: { index: false, follow: false },
};

export default async function SavedCartPage({
  params,
}: PageProps<"/bolsa/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const cart = await getSavedCart(id);
  if (!cart) notFound();

  if (cart.items.length === 0) {
    return (
      <PageShell
        title="Se nos escapó"
        intro="Lo que tenías guardado ya no está a la venta. Mirá lo que hay ahora: entra cosa nueva todas las semanas."
      >
        <RestoreCartButton items={[]} />
      </PageShell>
    );
  }

  const total = cart.items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );

  return (
    <PageShell
      title="Te guardamos la bolsa"
      intro="Esto es lo que estabas eligiendo, con los precios de hoy."
    >
      <ul className="divide-y divide-crema-oscuro border-y border-crema-oscuro">
        {cart.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="font-medium">
                {item.quantity} × {item.name}
              </span>
              {(item.color || item.size) && (
                <span className="block text-sm">
                  {[item.color, item.size && `Talle ${item.size}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </span>
            <span className="shrink-0">
              {formatMoney(item.priceCents * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <p className="flex justify-between font-display text-xl font-semibold">
        <span>Total</span>
        <span>{formatMoney(total)}</span>
      </p>

      <RestoreCartButton items={cart.items} />
    </PageShell>
  );
}

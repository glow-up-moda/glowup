import "server-only";

import AbandonedCart, { subject } from "@/emails/abandoned-cart";
import { getSavedCart } from "@/lib/store/abandoned";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmail, siteUrl } from "./send";

// Carrito abandonado (§13). Lo dispara el job diario, igual que el pedido de
// reseña. Se escribe una sola vez por carrito, y nunca a quien se dio de baja.

/** Horas que se esperan desde el último cambio antes de escribirle. */
const WAIT_HOURS = 4;
/** Más viejo que esto ya no se recuerda. */
const TOO_OLD_DAYS = 7;
/** Y a los 30 días la copia se borra: es el email de alguien que no compró. */
const KEEP_DAYS = 30;

const hoursAgo = (count: number) =>
  new Date(Date.now() - count * 60 * 60 * 1000).toISOString();
const daysAgo = (count: number) => hoursAgo(count * 24);

export async function sendAbandonedCarts(): Promise<number> {
  const supabase = createAdminClient();

  const { data: carts } = await supabase
    .from("abandoned_carts")
    .select("id, email")
    .is("notified_at", null)
    .is("recovered_at", null)
    .lte("updated_at", hoursAgo(WAIT_HOURS))
    .gte("updated_at", daysAgo(TOO_OLD_DAYS))
    .limit(100);
  if (!carts || carts.length === 0) return 0;

  const { data: optouts } = await supabase
    .from("marketing_optouts")
    .select("email")
    .in(
      "email",
      carts.map((cart) => cart.email),
    );
  const excluded = new Set((optouts ?? []).map((row) => row.email));

  let count = 0;
  for (const row of carts) {
    if (excluded.has(row.email)) continue;

    // Precios y disponibilidad de hoy: lo que ya no está no se ofrece.
    const cart = await getSavedCart(row.id);
    if (!cart || cart.items.length === 0) continue;

    const props = {
      lines: cart.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        totalCents: item.priceCents * item.quantity,
      })),
      totalCents: cart.items.reduce(
        (sum, item) => sum + item.priceCents * item.quantity,
        0,
      ),
      url: `${siteUrl()}/bolsa/${row.id}`,
      unsubscribeUrl: `${siteUrl()}/baja/${row.id}`,
    };

    const ok = await sendEmail({
      to: row.email,
      subject: subject(),
      element: <AbandonedCart {...props} />,
      key: `bolsa:${row.id}`,
      kind: "carrito-abandonado",
    });
    if (ok) {
      await supabase
        .from("abandoned_carts")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", row.id);
      count += 1;
    }
  }

  return count;
}

/** Limpia las copias viejas: es el único email de alguien que no compró. */
export async function pruneAbandonedCarts(): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("abandoned_carts")
      .delete()
      .lt("updated_at", daysAgo(KEEP_DAYS));
  } catch (error) {
    console.error("[email] no se pudieron limpiar los carritos", error);
  }
}

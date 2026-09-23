import "server-only";

import ReviewRequest, { subject } from "@/emails/review-request";
import { reviewableProducts } from "@/lib/orders/reviews";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmail, siteUrl } from "./send";

// Pedido de reseña (§13). Lo dispara el job diario: la base despierta a la app
// una vez por día y acá se decide a quién le toca.

/** Días que se esperan después de la entrega antes de preguntar. */
const AFTER_DELIVERY = 3;
/** Más viejo que esto ya no se pregunta: nadie se acuerda, y al encender el
 *  job por primera vez no tiene sentido escribirle a todo el historial. */
const TOO_OLD = 30;

const days = (count: number) =>
  new Date(Date.now() - count * 24 * 60 * 60 * 1000).toISOString();

export async function sendReviewRequests(): Promise<number> {
  const supabase = createAdminClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, number, email")
    .eq("status", "delivered")
    .lte("delivered_at", days(AFTER_DELIVERY))
    .gte("delivered_at", days(TOO_OLD))
    .limit(100);
  if (!orders || orders.length === 0) return 0;

  // Los que ya recibieron el pedido de reseña. `sent_emails` igual no dejaría
  // mandar dos veces, pero así no se arma el email al pedo todos los días.
  const { data: already } = await supabase
    .from("sent_emails")
    .select("key")
    .in(
      "key",
      orders.map((order) => `resena:${order.id}`),
    );
  const sent = new Set((already ?? []).map((row) => row.key));

  let count = 0;
  for (const order of orders) {
    if (sent.has(`resena:${order.id}`)) continue;

    // Si ya reseñó todo lo que compró, no hay nada que pedirle.
    const products = await reviewableProducts(order.id);
    const missing = products.filter((product) => !product.done);
    if (missing.length === 0) continue;

    const props = {
      number: order.number,
      productNames: missing.map((product) => product.name),
      url: `${siteUrl()}/pedido/${order.number}#resena`,
    };
    const ok = await sendEmail({
      to: order.email,
      subject: subject(),
      element: <ReviewRequest {...props} />,
      key: `resena:${order.id}`,
      kind: "pedido-de-resena",
    });
    if (ok) count += 1;
  }

  return count;
}

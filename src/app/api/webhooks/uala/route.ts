import { after } from "next/server";

import {
  sendLowStockAlertForOrder,
  sendReviewAlert,
} from "@/lib/emails/internal";
import { sendPaymentApproved } from "@/lib/emails/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUalaOrder } from "@/lib/uala/client";

// Webhook de Ualá Bis (§11).
//
// El aviso no viene firmado, así que no se le cree nada: solo dice qué orden
// mirar. El estado se vuelve a consultar a Ualá con nuestro token, y recién
// entonces se aplican las reglas de stock (§9). Si el aviso fuera inventado,
// la consulta lo desmiente.
//
// Ualá reintenta hasta 3 veces más si no recibe un 200, así que un 200 es
// "esto ya está resuelto" y un 500 es "probá de nuevo".

type Notification = {
  uuid?: string;
  external_reference?: string;
  status?: string;
  created_date?: string;
};

export async function POST(request: Request) {
  let body: Notification;
  try {
    body = (await request.json()) as Notification;
  } catch {
    return Response.json({ ok: true });
  }

  const uuid = body.uuid?.trim();
  if (!uuid) return Response.json({ ok: true });

  const supabase = createAdminClient();

  // Idempotencia (§11): el aviso no trae id propio, así que la orden y su
  // estado alcanzan para reconocer un reintento.
  const eventId = `uala:${uuid}:${body.status ?? "sin-estado"}`;
  const { error: eventError } = await supabase
    .from("payment_events")
    .insert({ provider: "uala", provider_event_id: eventId, payload: body });
  if (eventError) {
    return Response.json({ ok: true, repetido: eventError.code === "23505" });
  }

  let order;
  try {
    order = await getUalaOrder(uuid);
  } catch {
    // No pudimos preguntar: que Ualá reintente.
    await supabase
      .from("payment_events")
      .delete()
      .eq("provider_event_id", eventId);
    return new Response("no se pudo consultar la orden", { status: 500 });
  }

  // El pedido se reconoce por nuestra propia referencia, no por lo que diga el
  // aviso: si alguien inventa uno, acá se queda sin pedido.
  const orderId = order.externalReference;
  if (!orderId) return Response.json({ ok: true });

  const { data: ourOrder } = await supabase
    .from("orders")
    .select("id, total_cents, payment_method")
    .eq("id", orderId)
    .maybeSingle();
  if (!ourOrder || ourOrder.payment_method !== "card") {
    return Response.json({ ok: true, desconocido: true });
  }

  if (order.status === "APPROVED" || order.status === "PROCESSED") {
    // Que el monto cobrado sea el del pedido: si no coincide, no se confirma
    // solo y queda a la vista en el panel.
    if (
      order.amountCents != null &&
      order.amountCents !== ourOrder.total_cents
    ) {
      await supabase
        .from("orders")
        .update({
          needs_review: true,
          review_reason: `Ualá Bis cobró ${order.amountCents} centavos y el pedido es de ${ourOrder.total_cents}.`,
        })
        .eq("id", ourOrder.id);
      after(() => sendReviewAlert(ourOrder.id));
    } else {
      const { data: confirmed } = await supabase.rpc("confirm_order_payment", {
        p_order_id: ourOrder.id,
        p_payment_reference: order.uuid,
      });
      // Ualá puede avisar dos veces el mismo pago (APPROVED y PROCESSED): el
      // email sale solo con la confirmación que descontó el stock.
      const result = confirmed as {
        already_confirmed: boolean;
        needs_review: boolean;
      } | null;
      if (result && !result.already_confirmed) {
        after(() => sendPaymentApproved(ourOrder.id));
        after(() => sendLowStockAlertForOrder(ourOrder.id));
        if (result.needs_review) after(() => sendReviewAlert(ourOrder.id));
      }
    }
  } else if (order.status === "REJECTED" || order.status === "REFUNDED") {
    await supabase.rpc("release_order_reservation", {
      p_order_id: ourOrder.id,
      p_reason: `Ualá Bis: ${order.status}`,
    });
  }
  // PENDING: todavía no pagó; ya va a llegar otro aviso.

  await supabase
    .from("payment_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider_event_id", eventId);

  return Response.json({ ok: true });
}

import { createHmac, timingSafeEqual } from "node:crypto";

import { getPayment } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook de Mercado Pago (§11). El orden importa:
//   1. validar la firma;
//   2. anotar el evento (si ya estaba, salir);
//   3. preguntarle el pago a Mercado Pago, nunca creerle al aviso;
//   4. aplicar las reglas de stock (§9);
//   5. contestar 200 rápido.
//
// Siempre responde 200 salvo que la firma no cierre: un 500 hace que Mercado
// Pago reintente para siempre por algo que no se va a arreglar solo.

const secret = process.env.MP_WEBHOOK_SECRET;

/**
 * Firma `x-signature: ts=...,v1=...` sobre
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 */
function signatureIsValid(request: Request, dataId: string): boolean {
  if (!secret) return false;
  const header = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id") ?? "";
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  const ts = parts.ts;
  const received = parts.v1;
  if (!ts || !received) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: {
    id?: number | string;
    type?: string;
    action?: string;
    data?: { id?: string };
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: true });
  }

  const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? "";
  const type = body.type ?? url.searchParams.get("type") ?? "";

  if (!dataId || !signatureIsValid(request, dataId)) {
    return new Response("firma inválida", { status: 401 });
  }
  // Solo nos interesan los pagos; el resto se acusa recibo y listo.
  if (type !== "payment") return Response.json({ ok: true });

  const supabase = createAdminClient();

  // Idempotencia (§11): si el aviso ya se procesó, no se vuelve a tocar nada.
  const eventId = String(body.id ?? `${type}:${dataId}`);
  const { error: eventError } = await supabase
    .from("payment_events")
    .insert({ provider_event_id: eventId, payload: body });
  if (eventError) {
    // 23505 = ya estaba anotado.
    return Response.json({ ok: true, repetido: eventError.code === "23505" });
  }

  let payment;
  try {
    payment = await getPayment(dataId);
  } catch {
    return Response.json({ ok: true, sinPago: true });
  }

  const orderId = payment.external_reference;
  const status = payment.status;
  if (!orderId) return Response.json({ ok: true });

  if (status === "approved") {
    await supabase.rpc("confirm_order_payment", {
      p_order_id: orderId,
      p_mp_payment_id: String(payment.id ?? dataId),
    });
  } else if (
    status === "rejected" ||
    status === "cancelled" ||
    status === "refunded" ||
    status === "charged_back"
  ) {
    await supabase.rpc("release_order_reservation", {
      p_order_id: orderId,
      p_reason: `Mercado Pago: ${status}`,
    });
  }
  // in_process, pending o authorized: se espera el próximo aviso.

  await supabase
    .from("payment_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider_event_id", eventId);

  return Response.json({ ok: true });
}

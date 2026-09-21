import "server-only";

import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

// Checkout Pro (§11). El token es de servidor: nunca sale de acá.

const accessToken = process.env.MP_ACCESS_TOKEN;

export function isMercadoPagoReady(): boolean {
  return Boolean(accessToken);
}

function config() {
  if (!accessToken) throw new Error("Falta MP_ACCESS_TOKEN.");
  return new MercadoPagoConfig({ accessToken });
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

/**
 * Preferencia de pago de un pedido ya creado y con stock reservado.
 *
 * Va una sola línea con el total: los descuentos y el envío ya están
 * calculados por la base (§10) y Mercado Pago exige que la suma de los ítems
 * sea exactamente lo que se cobra. El detalle la clienta ya lo vio en el
 * checkout y lo tiene en la página del pedido.
 */
export async function createPreference(order: {
  id: string;
  number: string;
  email: string;
  totalCents: number;
  reservedUntil: string | null;
}): Promise<{ id: string; initPoint: string }> {
  const site = siteUrl();
  const preference = await new Preference(config()).create({
    body: {
      external_reference: order.id,
      notification_url: `${site}/api/webhooks/mercadopago`,
      statement_descriptor: "GLOWUP",
      items: [
        {
          id: order.number,
          title: `Pedido ${order.number}`,
          quantity: 1,
          unit_price: order.totalCents / 100,
          currency_id: "ARS",
        },
      ],
      payer: { email: order.email },
      back_urls: {
        success: `${site}/pedido/${order.number}`,
        pending: `${site}/pedido/${order.number}`,
        failure: `${site}/pedido/${order.number}`,
      },
      auto_return: "approved",
      // Efectivo no, al menos al inicio (§11).
      payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
      // La preferencia vence con la reserva de stock (§9.2).
      ...(order.reservedUntil
        ? { expires: true, expiration_date_to: order.reservedUntil }
        : {}),
    },
  });

  const id = preference.id;
  const initPoint = preference.init_point ?? preference.sandbox_init_point;
  if (!id || !initPoint)
    throw new Error("Mercado Pago no devolvió la preferencia.");
  return { id, initPoint };
}

/** Estado real del pago, consultado a Mercado Pago (§11: nunca confiar en el aviso). */
export async function getPayment(paymentId: string) {
  return new Payment(config()).get({ id: paymentId });
}

/** Link para retomar un pago que quedó a medias. */
export function checkoutUrl(preferenceId: string): string {
  return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`;
}

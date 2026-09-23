import "server-only";

import { siteUrl } from "@/lib/site";

// Cobros con tarjeta por la API Cobros Online v2 de Ualá Bis (§11).
//
// El flujo es: pedir un token (dura 24 horas), crear una orden de pago que
// devuelve un link de checkout, y después escuchar el webhook. Como el webhook
// no viene firmado, el estado siempre se vuelve a consultar con el token: lo
// que avisa el aviso no alcanza.
//
// Credenciales: app o web de Ualá → Ualá Bis → Cobros online → API.

const username = process.env.UALA_USERNAME;
const clientId = process.env.UALA_CLIENT_ID;
const clientSecret = process.env.UALA_CLIENT_SECRET;
/** `test` mientras probamos; `production` cobra plata de verdad. */
const environment = process.env.UALA_ENVIRONMENT ?? "test";

const BASE_URLS = {
  test: {
    auth: "https://auth.stage.developers.ar.ua.la/v2/api",
    checkout: "https://checkout.stage.developers.ar.ua.la/v2/api",
  },
  production: {
    auth: "https://auth.developers.ar.ua.la/v2/api",
    checkout: "https://checkout.developers.ar.ua.la/v2/api",
  },
} as const;

function urls() {
  return environment === "production" ? BASE_URLS.production : BASE_URLS.test;
}

export function isUalaReady(): boolean {
  return Boolean(username && clientId && clientSecret);
}

// El token vive 24 horas: se guarda en memoria y se renueva un rato antes.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function token(): Promise<string> {
  if (!isUalaReady()) throw new Error("Faltan las credenciales de Ualá Bis.");
  if (cachedToken && cachedToken.expiresAt > Date.now())
    return cachedToken.value;

  const response = await fetch(`${urls().auth}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username,
      client_id: clientId,
      client_secret_id: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Ualá Bis no dio token: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: data.access_token,
    // Un margen de 5 minutos, por si el reloj no coincide.
    expiresAt: Date.now() + Math.max(0, data.expires_in - 300) * 1000,
  };
  return cachedToken.value;
}

async function call(path: string, init?: RequestInit) {
  const response = await fetch(`${urls().checkout}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await token()}`,
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Ualá Bis ${path}: ${response.status}`);
  }
  return response.json();
}

/** Monto mínimo que acepta Ualá Bis: $25. */
export const MIN_CARD_CENTS = 2500;

export type UalaOrderStatus =
  "PENDING" | "PROCESSED" | "APPROVED" | "REJECTED" | "REFUNDED";

/**
 * Orden de pago de un pedido que ya reservó stock. `external_reference` es el
 * id del pedido: por ahí lo reconocemos cuando vuelve el aviso.
 *
 * Ojo con el monto: Ualá Bis lo toma en **pesos con dos decimales**, no en
 * centavos como nuestra base. Mandar "2500" por $25 cobra $2.500.
 */
export async function createCheckout(order: {
  id: string;
  number: string;
  totalCents: number;
}): Promise<{ uuid: string; checkoutLink: string }> {
  const site = siteUrl();
  const data = (await call("/checkout", {
    method: "POST",
    body: JSON.stringify({
      amount: (order.totalCents / 100).toFixed(2),
      description: `Pedido ${order.number} · GLOW UP`,
      callback_success: `${site}/pedido/${order.number}`,
      callback_fail: `${site}/pedido/${order.number}`,
      notification_url: `${site}/api/webhooks/uala`,
      external_reference: order.id,
    }),
  })) as {
    uuid: string;
    links?: { checkout_link?: string };
  };

  const checkoutLink = data.links?.checkout_link;
  if (!data.uuid || !checkoutLink) {
    throw new Error("Ualá Bis no devolvió el link de pago.");
  }
  return { uuid: data.uuid, checkoutLink };
}

/** Estado real de una orden, consultado a Ualá Bis (§11). */
export async function getUalaOrder(uuid: string): Promise<{
  uuid: string;
  status: UalaOrderStatus;
  externalReference: string | null;
  amountCents: number | null;
}> {
  const data = (await call(`/orders/${encodeURIComponent(uuid)}`)) as {
    uuid: string;
    status: UalaOrderStatus;
    external_reference?: string | null;
    amount?: number | string | null;
  };

  // El monto vuelve en pesos: lo pasamos a centavos para compararlo con el
  // total del pedido.
  const amount = data.amount == null ? Number.NaN : Number(data.amount);
  return {
    uuid: data.uuid,
    status: data.status,
    externalReference: data.external_reference ?? null,
    amountCents: Number.isFinite(amount) ? Math.round(amount * 100) : null,
  };
}

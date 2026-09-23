"use client";

// Eventos de Meta Pixel y GA4 (§14).
//
// Los dos reciben lo mismo con nombres distintos. `eventId` va siempre: Meta
// lo usa para no contar dos veces el mismo hecho si el mismo evento llega por
// otro camino (por ejemplo, si más adelante se manda también desde el
// servidor), y para que recargar la página del pedido no sume otra compra.
//
// Sin los ids cargados no se carga ningún script y esto no hace nada.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export type CartLine = {
  id: string;
  name: string;
  quantity: number;
  priceCents: number;
};

const CURRENCY = "ARS";

const pesos = (cents: number) => Number((cents / 100).toFixed(2));

function metaContents(items: CartLine[]) {
  return items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    item_price: pesos(item.priceCents),
  }));
}

function ga4Items(items: CartLine[]) {
  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    quantity: item.quantity,
    price: pesos(item.priceCents),
  }));
}

function totalOf(items: CartLine[]) {
  return pesos(
    items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
  );
}

export type TrackedEvent =
  | { name: "ViewContent"; items: CartLine[] }
  | { name: "AddToCart"; items: CartLine[] }
  | { name: "InitiateCheckout"; items: CartLine[] }
  | {
      name: "Purchase";
      items: CartLine[];
      totalCents: number;
      orderId: string;
    };

const GA4_NAMES: Record<TrackedEvent["name"], string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

export function track(event: TrackedEvent): void {
  if (typeof window === "undefined") return;

  const value =
    event.name === "Purchase" ? pesos(event.totalCents) : totalOf(event.items);
  const eventId =
    event.name === "Purchase"
      ? `compra-${event.orderId}`
      : `${event.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    window.fbq?.(
      "track",
      event.name,
      {
        currency: CURRENCY,
        value,
        contents: metaContents(event.items),
        content_type: "product",
      },
      { eventID: eventId },
    );
  } catch {
    // La analítica nunca puede romper la compra.
  }

  try {
    window.gtag?.("event", GA4_NAMES[event.name], {
      currency: CURRENCY,
      value,
      items: ga4Items(event.items),
      ...(event.name === "Purchase" ? { transaction_id: event.orderId } : {}),
    });
  } catch {
    // Igual que arriba.
  }
}

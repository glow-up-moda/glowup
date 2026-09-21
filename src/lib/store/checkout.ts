// Traducción de los errores de la base (§8) a la voz de la tienda (§5): cada
// mensaje dice qué pasó y qué hacer.

type DbError = { message?: string; details?: string | null } | null | undefined;

function detailsOf(error: DbError): Record<string, unknown> {
  try {
    return error?.details
      ? (JSON.parse(error.details) as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

const couponReasons: Record<string, string> = {
  not_found: "Ese cupón no existe. Revisá cómo está escrito.",
  not_started: "Ese cupón todavía no se puede usar.",
  expired: "Ese cupón ya venció.",
  max_uses: "Ese cupón ya se usó todas las veces que podía usarse.",
  min_subtotal: "Te falta llegar al mínimo de compra para ese cupón.",
};

const shippingReasons: Record<string, string> = {
  method_required: "Elegí cómo querés recibirlo.",
  zone_required: "Elegí la zona de envío.",
  zone_not_found: "Esa zona ya no está disponible. Elegí otra.",
  zone_not_same_day:
    "Esa zona no tiene envío en el día. Elegí envío a domicilio.",
  zone_is_same_day: "Esa zona es de envío en el día. Elegí esa opción arriba.",
  pickup_has_zone: "El retiro no lleva zona de envío.",
  address_required: "Completá la dirección para el envío.",
};

export function checkoutErrorMessage(error: DbError): string {
  const details = detailsOf(error);

  switch (error?.message) {
    case "out_of_stock": {
      const product = [details.product, details.color, details.size]
        .filter(Boolean)
        .join(" ");
      const available = Number(details.available ?? 0);
      return available > 0
        ? `Quedan ${available} de ${product}. Ajustá la cantidad en el carrito y volvé a intentar.`
        : `Se agotó ${product} mientras comprabas. Sacalo del carrito o elegí otro talle.`;
    }
    case "item_unavailable":
      return "Uno de los productos dejó de estar a la venta. Revisá el carrito.";
    case "invalid_coupon":
      return (
        couponReasons[String(details.reason)] ??
        "Ese cupón no se puede usar en esta compra."
      );
    case "invalid_shipping":
      return (
        shippingReasons[String(details.reason)] ??
        "Revisá cómo querés recibir el pedido."
      );
    case "invalid_items":
      return details.reason === "quantity"
        ? "Hay como máximo 10 unidades por producto. Ajustá el carrito."
        : "Hay algo raro en el carrito. Recargá la página y probá de nuevo.";
    case "invalid_payload":
      return "Revisá el email y el teléfono.";
    default:
      return "No pudimos terminar la compra. Probá de nuevo en un momento.";
  }
}

/** Lo que devuelve quote_cart y muestra el resumen del checkout (§10). */
export type CheckoutTotals = {
  subtotalCents: number;
  couponDiscountCents: number;
  transferDiscountCents: number;
  shippingCents: number | null;
  totalCents: number;
  remainingForFreeShippingCents: number | null;
  coupon: {
    code: string;
    valid: boolean;
    applied: boolean;
    error: string | null;
  } | null;
  lines: {
    id: string;
    name: string;
    quantity: number;
    lineTotalCents: number;
    unavailable: boolean;
    inStock: boolean;
  }[];
};

type TotalsResponse = {
  lines: {
    variant_id: string | null;
    kit_id: string | null;
    name?: string;
    quantity: number;
    line_total_cents?: number;
    in_stock?: boolean;
    unavailable: boolean;
  }[];
  subtotal_cents: number;
  coupon: {
    code: string;
    valid: boolean;
    applied: boolean;
    error: string | null;
  } | null;
  coupon_discount_cents: number;
  transfer_discount_cents: number;
  shipping_cents: number | null;
  total_cents: number;
  remaining_for_free_shipping_cents: number | null;
};

export function toCheckoutTotals(data: unknown): CheckoutTotals {
  const totals = data as TotalsResponse;
  return {
    subtotalCents: totals.subtotal_cents,
    couponDiscountCents: totals.coupon_discount_cents,
    transferDiscountCents: totals.transfer_discount_cents,
    shippingCents: totals.shipping_cents,
    totalCents: totals.total_cents,
    remainingForFreeShippingCents: totals.remaining_for_free_shipping_cents,
    coupon: totals.coupon,
    lines: totals.lines.map((line) => ({
      id: line.variant_id ?? line.kit_id ?? "",
      name: line.name ?? "",
      quantity: line.quantity,
      lineTotalCents: line.line_total_cents ?? 0,
      unavailable: line.unavailable,
      inStock: line.in_stock !== false,
    })),
  };
}

/** Por qué no se puede usar un cupón, en la voz de la tienda. */
export function couponMessage(error: string | null): string | null {
  if (!error) return null;
  return couponReasons[error] ?? "Ese cupón no se puede usar en esta compra.";
}

import "server-only";

import OrderReceived, {
  subject as receivedSubject,
} from "@/emails/order-received";
import OrderShipped, {
  subject as shippedSubject,
} from "@/emails/order-shipped";
import type { OrderEmailData } from "@/emails/order-summary";
import PaymentApproved, {
  subject as approvedSubject,
} from "@/emails/payment-approved";
import { addressLines, SHIPPING_LABELS } from "@/lib/admin/orders";
import { getBankDetails } from "@/lib/orders/public";
import { getStoreSettings } from "@/lib/store/settings";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmail, siteUrl } from "./send";

// Los emails del pedido (§13). Se llaman con `after()` desde el checkout y el
// panel: la clienta y la administradora no tienen que esperar a Resend.
//
// Nada de acá tira: si un email falla, el pedido ya está hecho y el pago ya
// está cobrado.

const SELECT =
  "id, number, status, payment_method, email, shipping_method, shipping_address, is_gift, gift_message, subtotal_cents, coupon_discount_cents, transfer_discount_cents, shipping_cents, total_cents, reserved_until, coupons(code), shipping_zones(name, eta_text), order_items(id, parent_item_id, name_snapshot, unit_price_cents, quantity)";

async function loadOrder(
  orderId: string,
): Promise<{ email: string; order: OrderEmailData } | null> {
  const supabase = createAdminClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("orders").select(SELECT).eq("id", orderId).maybeSingle(),
    getStoreSettings(),
  ]);
  if (!data) return null;

  // Un kit es una línea con sus componentes colgando (§8): en el email se
  // muestra como una sola cosa con el detalle adentro.
  const parents = data.order_items
    .filter((item) => !item.parent_item_id)
    .sort((a, b) => a.name_snapshot.localeCompare(b.name_snapshot, "es"));

  return {
    email: data.email,
    order: {
      number: data.number,
      url: `${siteUrl()}/pedido/${data.number}`,
      paymentMethod: data.payment_method,
      shippingMethod: data.shipping_method,
      shippingLabel: SHIPPING_LABELS[data.shipping_method],
      zoneName: data.shipping_zones?.name ?? null,
      etaText: data.shipping_zones?.eta_text ?? null,
      address: addressLines(data.shipping_address),
      pickup:
        data.shipping_method === "pickup"
          ? { address: settings.pickupAddress, hours: settings.pickupHours }
          : null,
      isGift: data.is_gift,
      giftMessage: data.gift_message,
      lines: parents.map((line) => ({
        name: line.name_snapshot,
        quantity: line.quantity,
        totalCents: line.unit_price_cents * line.quantity,
        parts: data.order_items
          .filter((item) => item.parent_item_id === line.id)
          .map((part) => `${part.quantity} × ${part.name_snapshot}`),
      })),
      subtotalCents: data.subtotal_cents,
      couponCode: data.coupons?.code ?? null,
      couponDiscountCents: data.coupon_discount_cents,
      transferDiscountCents: data.transfer_discount_cents,
      shippingCents: data.shipping_cents,
      totalCents: data.total_cents,
      reservedUntil: data.reserved_until,
    },
  };
}

/** Recién creado: con transferencia lleva los datos para pagar (§13). */
export async function sendOrderReceived(orderId: string): Promise<void> {
  try {
    const loaded = await loadOrder(orderId);
    if (!loaded) return;
    const bank =
      loaded.order.paymentMethod === "transfer"
        ? await getBankDetails()
        : { alias: null, cbu: null };

    const props = { order: loaded.order, bank };
    await sendEmail({
      to: loaded.email,
      subject: receivedSubject(props),
      element: <OrderReceived {...props} />,
      key: `recibido:${orderId}`,
      kind: "pedido-recibido",
    });
  } catch (error) {
    console.error("[email] pedido recibido", error);
  }
}

/** Pago acreditado, por tarjeta o por transferencia confirmada (§9.3). */
export async function sendPaymentApproved(orderId: string): Promise<void> {
  try {
    const loaded = await loadOrder(orderId);
    if (!loaded) return;

    const props = { order: loaded.order };
    await sendEmail({
      to: loaded.email,
      subject: approvedSubject(props),
      element: <PaymentApproved {...props} />,
      key: `pagado:${orderId}`,
      kind: "pago-aprobado",
    });
  } catch (error) {
    console.error("[email] pago aprobado", error);
  }
}

/** Salió o quedó listo para retirar, según cómo lo recibe (§13). */
export async function sendOrderShipped(orderId: string): Promise<void> {
  try {
    const loaded = await loadOrder(orderId);
    if (!loaded) return;

    const props = {
      order: loaded.order,
      pickup: loaded.order.shippingMethod === "pickup",
    };
    await sendEmail({
      to: loaded.email,
      subject: shippedSubject(props),
      element: <OrderShipped {...props} />,
      key: `enviado:${orderId}`,
      kind: "pedido-enviado",
    });
  } catch (error) {
    console.error("[email] pedido enviado", error);
  }
}

"use server";

import { z } from "zod";

import { createCheckout, isUalaReady, MIN_CARD_CENTS } from "@/lib/uala/client";
import { rememberOrder } from "@/lib/orders/access";
import {
  checkoutErrorMessage,
  type CheckoutTotals,
  toCheckoutTotals,
} from "@/lib/store/checkout";
import { createAdminClient } from "@/lib/supabase/admin";

// El checkout no tiene sesión: corre con la clave secreta del servidor (§8).
// Los totales y la reserva de stock los calcula siempre la base (§10), nunca
// lo que manda el navegador.

const itemSchema = z.object({
  kind: z.enum(["variant", "kit"]),
  id: z.uuid(),
  quantity: z.number().int().min(1).max(10),
});

const quoteSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  couponCode: z.string().trim().max(32).nullable(),
  paymentMethod: z.enum(["card", "transfer"]),
  shippingMethod: z.enum(["delivery", "same_day", "pickup"]),
  shippingZoneId: z.uuid().nullable(),
});

type QuoteInput = z.infer<typeof quoteSchema>;

function toItems(items: QuoteInput["items"]) {
  return items.map((item) =>
    item.kind === "variant"
      ? { variant_id: item.id, quantity: item.quantity }
      : { kit_id: item.id, quantity: item.quantity },
  );
}

export async function quoteCheckout(
  input: unknown,
): Promise<{ totals: CheckoutTotals } | { error: string }> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisá los datos de la entrega." };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("quote_cart", {
    payload: {
      items: toItems(parsed.data.items),
      coupon_code: parsed.data.couponCode,
      payment_method: parsed.data.paymentMethod,
      shipping_method: parsed.data.shippingMethod,
      shipping_zone_id: parsed.data.shippingZoneId,
    },
  });
  if (error || !data) return { error: checkoutErrorMessage(error) };

  return { totals: toCheckoutTotals(data) };
}

const addressSchema = z.object({
  name: z.string().trim().min(2, "Escribí quién recibe.").max(80),
  street: z.string().trim().min(2, "Escribí la calle.").max(80),
  number: z.string().trim().min(1, "Escribí la altura.").max(10),
  floor: z.string().trim().max(10),
  apartment: z.string().trim().max(10),
  city: z.string().trim().min(2, "Escribí la localidad.").max(60),
  province: z.string().trim().min(2, "Escribí la provincia.").max(60),
  postal_code: z.string().trim().min(4, "Escribí el código postal.").max(8),
  notes: z.string().trim().max(200),
});

const orderSchema = quoteSchema
  .extend({
    email: z.email({ error: "Revisá el email." }).max(120),
    phone: z
      .string()
      .trim()
      .min(6, "Escribí tu WhatsApp con característica.")
      .max(40),
    address: addressSchema.nullable(),
    isGift: z.boolean(),
    giftMessage: z.string().trim().max(200),
    acceptsTerms: z.literal(true, { error: "Tenés que aceptar los términos." }),
    acceptsMarketing: z.boolean(),
  })
  .refine(
    (order) => order.shippingMethod === "pickup" || order.address !== null,
    { error: "Completá la dirección para el envío.", path: ["address"] },
  );

export type PlaceOrderResult =
  { number: string; redirectUrl?: string } | { error: string };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const order = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_order_with_reservation", {
    payload: {
      items: toItems(order.items),
      coupon_code: order.couponCode,
      payment_method: order.paymentMethod,
      shipping_method: order.shippingMethod,
      shipping_zone_id: order.shippingZoneId,
      email: order.email,
      phone: order.phone,
      shipping_address: order.address,
      is_gift: order.isGift,
      gift_message: order.isGift ? order.giftMessage : null,
    },
  });
  if (error || !data) return { error: checkoutErrorMessage(error) };

  const created = data as {
    order_id: string;
    number: string;
    total_cents: number;
    reserved_until: string | null;
  };

  // El consentimiento va aparte: la función que reserva stock no se ocupa de
  // marketing (ver la migración 20260921120000).
  if (order.acceptsMarketing) {
    await supabase
      .from("orders")
      .update({ accepts_marketing: true })
      .eq("id", created.order_id);
  }

  // Este navegador puede ver el pedido sin escribir el email (§7).
  await rememberOrder(created.number);

  if (order.paymentMethod !== "card") {
    return { number: created.number };
  }

  // Con tarjeta falta abrir el pago. Si no se puede, el pedido no queda
  // colgado reteniendo stock: se libera la reserva (§9.4) y se avisa.
  async function cancel(reason: string) {
    await supabase.rpc("release_order_reservation", {
      p_order_id: created.order_id,
      p_reason: reason,
    });
  }

  if (!isUalaReady()) {
    await cancel("Cobro con tarjeta sin configurar");
    return {
      error:
        "Por ahora no podemos cobrar con tarjeta. Elegí transferencia y listo.",
    };
  }
  if (created.total_cents < MIN_CARD_CENTS) {
    await cancel("Monto por debajo del mínimo para tarjeta");
    return {
      error:
        "Para pagar con tarjeta el pedido tiene que llegar a $25. Sumá algo más o pagá por transferencia.",
    };
  }

  try {
    const checkout = await createCheckout({
      id: created.order_id,
      number: created.number,
      totalCents: created.total_cents,
    });
    await supabase
      .from("orders")
      .update({ payment_checkout_id: checkout.uuid })
      .eq("id", created.order_id);
    return { number: created.number, redirectUrl: checkout.checkoutLink };
  } catch {
    await cancel("No se pudo abrir el pago con tarjeta");
    return {
      error: "No pudimos abrir el pago. Probá de nuevo o elegí transferencia.",
    };
  }
}

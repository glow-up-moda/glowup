"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { rememberedOrders, rememberOrder } from "@/lib/orders/access";
import { parseOrderNumber } from "@/lib/orders/number";
import { reviewableProducts } from "@/lib/orders/reviews";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckout, isUalaReady } from "@/lib/uala/client";
import type { FormState } from "@/lib/use-form-action";

// Para ver un pedido que no se hizo en este navegador hay que saber el número
// y el email con el que se compró (§7). El mensaje de error es siempre el
// mismo, así que desde afuera no se puede averiguar qué números existen.

export type FindOrderState = { error?: string };

const NOT_FOUND = "No encontramos un pedido con ese número y ese email.";

const schema = z.object({
  number: z.string(),
  email: z.email().max(120),
});

async function findOrderNumber(
  number: string,
  email: string,
): Promise<string | null> {
  const parsed = schema.safeParse({ number, email });
  const orderNumber = parseOrderNumber(
    parsed.success ? parsed.data.number : "",
  );
  if (!parsed.success || !orderNumber) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("number")
    .eq("number", orderNumber)
    .eq("email", parsed.data.email.toLowerCase())
    .maybeSingle();
  return data?.number ?? null;
}

/** Desde la página del pedido: ya sabemos el número, falta el email. */
export async function verifyOrderEmail(
  number: string,
  _prev: FindOrderState,
  formData: FormData,
): Promise<FindOrderState> {
  const found = await findOrderNumber(
    number,
    String(formData.get("email") ?? ""),
  );
  if (!found) return { error: NOT_FOUND };

  await rememberOrder(found);
  redirect(`/pedido/${found}`);
}

/** Desde /seguimiento: número y email juntos. */
export async function findOrder(
  _prev: FindOrderState,
  formData: FormData,
): Promise<FindOrderState> {
  const found = await findOrderNumber(
    String(formData.get("numero") ?? ""),
    String(formData.get("email") ?? ""),
  );
  if (!found) return { error: NOT_FOUND };

  await rememberOrder(found);
  redirect(`/pedido/${found}`);
}

/**
 * Vuelve a abrir el pago con tarjeta de un pedido que quedó pendiente. Crea un
 * link nuevo en vez de reusar el anterior: los de Ualá Bis pueden vencer, y el
 * pedido se reconoce igual por su referencia cuando llega el aviso.
 */
export async function resumeCardPayment(
  number: string,
): Promise<FindOrderState> {
  const orderNumber = parseOrderNumber(number);
  if (!orderNumber) return { error: NOT_FOUND };

  // Solo desde el navegador donde se hizo o se verificó el pedido.
  const remembered = await rememberedOrders();
  if (!remembered.includes(orderNumber)) {
    return { error: "Volvé a entrar a tu pedido y probá de nuevo." };
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, number, status, payment_method, total_cents")
    .eq("number", orderNumber)
    .maybeSingle();
  if (
    !order ||
    order.status !== "pending_payment" ||
    order.payment_method !== "card"
  ) {
    return { error: "Este pedido ya no está esperando un pago." };
  }
  if (!isUalaReady()) {
    return {
      error:
        "Por ahora no podemos cobrar con tarjeta. Escribinos y lo resolvemos.",
    };
  }

  let link: string;
  try {
    const checkout = await createCheckout({
      id: order.id,
      number: order.number,
      totalCents: order.total_cents,
    });
    await supabase
      .from("orders")
      .update({ payment_checkout_id: checkout.uuid })
      .eq("id", order.id);
    link = checkout.checkoutLink;
  } catch {
    return { error: "No pudimos abrir el pago. Probá de nuevo en un momento." };
  }

  redirect(link);
}

// Reseñas (§13). Se dejan desde la página del pedido, que ya controla quién
// puede verla: la cookie del navegador o el email con el que se compró (§7).
// La tabla `reviews` no se escribe por la API pública, así que va por acá.

const reviewSchema = z.object({
  productId: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  name: z.string().trim().min(2, "Escribí tu nombre.").max(60),
  text: z
    .string()
    .trim()
    .min(10, "Contanos un poco más: al menos 10 caracteres.")
    .max(600, "Hasta 600 caracteres."),
});

export async function leaveReview(
  number: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const orderNumber = parseOrderNumber(number);
  const remembered = await rememberedOrders();
  if (!orderNumber || !remembered.includes(orderNumber)) {
    return { error: "Volvé a entrar a tu pedido y probá de nuevo." };
  }

  const parsed = reviewSchema.safeParse({
    productId: String(formData.get("producto") ?? ""),
    rating: String(formData.get("puntaje") ?? ""),
    name: String(formData.get("nombre") ?? ""),
    text: String(formData.get("texto") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error:
        issue?.path[0] === "rating"
          ? "Elegí cuántas estrellas le ponés."
          : (issue?.message ?? "Revisá lo que escribiste."),
    };
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("number", orderNumber)
    .maybeSingle();
  if (!order || order.status !== "delivered") {
    return { error: "Podés dejar tu reseña cuando el pedido esté entregado." };
  }

  // Que el producto sea de este pedido: si no, cualquiera reseñaría cualquier
  // cosa desde un pedido propio.
  const reviewable = await reviewableProducts(order.id);
  const product = reviewable.find((item) => item.id === parsed.data.productId);
  if (!product) return { error: "Ese producto no está en este pedido." };
  if (product.done) return { error: "Ya dejaste tu reseña de este producto." };

  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.productId,
    order_id: order.id,
    rating: parsed.data.rating,
    name: parsed.data.name,
    text: parsed.data.text,
  });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya dejaste tu reseña de este producto."
          : "No pudimos guardar tu reseña. Probá de nuevo.",
    };
  }

  revalidatePath(`/pedido/${orderNumber}`);
  return { message: "¡Gracias! La publicamos apenas la leamos." };
}

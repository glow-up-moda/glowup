"use server";

import { after } from "next/server";
import { z } from "zod";

import { sendNewsletterWelcome } from "@/lib/emails/newsletter";
import { isUuid } from "@/lib/params";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "@/lib/use-form-action";

// El carrito se guarda en el navegador, así que antes de mostrarlo se revisa
// contra la base (§7): los precios y el stock mandan siempre del lado del
// servidor (§10). `quote_cart` no está abierta a la API pública, por eso se
// llama desde acá.

const lineSchema = z.object({
  kind: z.enum(["variant", "kit"]),
  id: z.uuid(),
  quantity: z.number().int().min(1).max(10),
});

export type CartLineQuote = {
  id: string;
  name: string;
  unitPriceCents: number;
  /** El producto se despublicó o el kit ya no existe. */
  unavailable: boolean;
  /** No alcanza el stock para la cantidad pedida. */
  outOfStock: boolean;
};

export type CartQuote = {
  lines: CartLineQuote[];
  subtotalCents: number;
};

type QuoteResponse = {
  lines: {
    variant_id: string | null;
    kit_id: string | null;
    name?: string;
    unit_price_cents?: number;
    in_stock?: boolean;
    unavailable: boolean;
  }[];
  subtotal_cents: number;
};

export async function quoteCart(items: unknown): Promise<CartQuote | null> {
  const parsed = z.array(lineSchema).max(50).safeParse(items);
  if (!parsed.success) return null;
  if (parsed.data.length === 0) return { lines: [], subtotalCents: 0 };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("quote_cart", {
    payload: {
      items: parsed.data.map((line) =>
        line.kind === "variant"
          ? { variant_id: line.id, quantity: line.quantity }
          : { kit_id: line.id, quantity: line.quantity },
      ),
    },
  });
  if (error || !data) return null;

  const quote = data as unknown as QuoteResponse;
  return {
    subtotalCents: quote.subtotal_cents,
    lines: quote.lines.map((line) => ({
      id: line.variant_id ?? line.kit_id ?? "",
      name: line.name ?? "",
      unitPriceCents: line.unit_price_cents ?? 0,
      unavailable: line.unavailable,
      outOfStock: !line.unavailable && line.in_stock === false,
    })),
  };
}

// Novedades por email (§7, inicio, y §15). El consentimiento es explícito: se
// escribe el email en un formulario que dice para qué es, y cada email lleva
// el link de baja.

const emailSchema = z.email({ error: "Revisá el email." }).max(120);

export async function subscribeToNewsletter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) return { error: "Revisá el email." };
  const email = parsed.data.toLowerCase();

  const supabase = createAdminClient();

  // Quien se dio de baja no vuelve por un formulario: que lo pida de nuevo por
  // WhatsApp es más honesto que reactivarla sola.
  const { data: optout } = await supabase
    .from("marketing_optouts")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (optout) {
    return { message: "¡Listo! Ya estás en la lista." };
  }

  const { data: subscriber, error } = await supabase
    .from("newsletter_subscribers")
    .upsert({ email }, { onConflict: "email" })
    .select("id, welcomed_at")
    .maybeSingle();
  if (error || !subscriber) {
    return { error: "No pudimos anotarte. Probá de nuevo en un momento." };
  }

  // La bienvenida sale una sola vez: anotarse dos veces no manda dos cupones.
  if (!subscriber.welcomed_at) {
    after(() => sendNewsletterWelcome(subscriber.id));
  }

  return { message: "¡Listo! Mirá tu correo: te mandamos el descuento." };
}

/**
 * Baja de los emails de marketing (§15): vale para el link del carrito
 * abandonado y para el del newsletter. El email queda anotado aparte, así
 * volver a anotarse sin querer no la vuelve a suscribir.
 */
export async function unsubscribeFromMarketing(id: string): Promise<FormState> {
  if (!isUuid(id)) return { error: "Ese link ya no sirve." };

  const supabase = createAdminClient();
  const [{ data: cart }, { data: subscriber }] = await Promise.all([
    supabase.from("abandoned_carts").select("email").eq("id", id).maybeSingle(),
    supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("id", id)
      .maybeSingle(),
  ]);

  const email = cart?.email ?? subscriber?.email;
  if (!email) return { message: "Listo: no te escribimos más." };

  const { error } = await supabase
    .from("marketing_optouts")
    .upsert({ email }, { onConflict: "email" });
  if (error) {
    return { error: "No pudimos darte de baja. Probá de nuevo en un rato." };
  }

  await Promise.all([
    supabase.from("abandoned_carts").delete().eq("email", email),
    supabase.from("newsletter_subscribers").delete().eq("email", email),
  ]);

  return { message: "Listo: no te escribimos más." };
}

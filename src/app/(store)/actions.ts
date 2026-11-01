"use server";

import { z } from "zod";

import { isUuid } from "@/lib/params";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "@/lib/use-form-action";

// El carrito se guarda en el navegador, así que antes de mostrarlo se revisa
// contra la base (§7): los precios y el stock mandan siempre del lado del
// servidor (§10). `quote_cart` no está abierta a la API pública, por eso se
// llama desde acá.

const selectionSchema = z.object({
  componentId: z.uuid(),
  variantId: z.uuid(),
  componentName: z.string().max(100).optional(),
  productName: z.string().max(120).optional(),
  color: z.string().max(80).nullable().optional(),
  size: z.string().max(80).nullable().optional(),
  quantity: z.number().int().min(1).max(10).optional(),
});

const lineSchema = z.object({
  kind: z.enum(["variant", "kit"]),
  id: z.uuid(),
  cartKey: z.string().trim().min(1).max(2000).optional(),
  selections: z.array(selectionSchema).max(20).optional(),
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
    line_key?: string;
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
      items: parsed.data.map((line) => ({
      ...(line.kind === "variant"
        ? { variant_id: line.id }
        : {
            kit_id: line.id,
            selections: line.selections?.map((selection) => ({
              component_id: selection.componentId,
              variant_id: selection.variantId,
            })),
          }),
      line_key: line.cartKey ?? `${line.kind}:${line.id}`,
      quantity: line.quantity,
    })),
    },
  });
  if (error || !data) return null;

  const quote = data as unknown as QuoteResponse;
  return {
    subtotalCents: quote.subtotal_cents,
    lines: quote.lines.map((line) => ({
      id: line.line_key ?? line.variant_id ?? line.kit_id ?? "",
      name: line.name ?? "",
      unitPriceCents: line.unit_price_cents ?? 0,
      unavailable: line.unavailable,
      outOfStock: !line.unavailable && line.in_stock === false,
    })),
  };
}

/**
 * Baja de los emails de marketing (§15): vale para el link del carrito
 * abandonado. El email queda anotado aparte, así
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

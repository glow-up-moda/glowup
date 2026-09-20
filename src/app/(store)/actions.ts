"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

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

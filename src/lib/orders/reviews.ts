import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Qué puede reseñar un pedido (§13). La reseña se deja desde la página del
// pedido, que ya sabe quién es quien mira (§7), así que no hace falta cuenta.
//
// Las líneas hijas de un kit también tienen variante, así que cada producto
// del kit se puede reseñar por separado.

export type ReviewableProduct = {
  id: string;
  name: string;
  slug: string;
  /** Ya dejó su reseña de este producto en este pedido. */
  done: boolean;
};

export async function reviewableProducts(
  orderId: string,
): Promise<ReviewableProduct[]> {
  const supabase = createAdminClient();

  const [{ data: items }, { data: reviews }] = await Promise.all([
    supabase
      .from("order_items")
      .select("product_variants(products(id, name, slug))")
      .eq("order_id", orderId)
      .not("variant_id", "is", null),
    supabase.from("reviews").select("product_id").eq("order_id", orderId),
  ]);

  const reviewed = new Set((reviews ?? []).map((review) => review.product_id));
  const products = new Map<string, ReviewableProduct>();

  for (const item of items ?? []) {
    const product = item.product_variants?.products;
    if (!product || products.has(product.id)) continue;
    products.set(product.id, {
      id: product.id,
      name: product.name,
      slug: product.slug,
      done: reviewed.has(product.id),
    });
  }

  return [...products.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

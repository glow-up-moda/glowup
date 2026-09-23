import "server-only";

import type { CartItem } from "@/lib/store/cart";
import { createAdminClient } from "@/lib/supabase/admin";

// Carrito guardado del aviso de carrito abandonado (§13). El link del email
// lleva acá, se rearma la bolsa con los precios de hoy y se sigue comprando.
//
// Se guardan solo los ids (§10): nombres, precios y fotos se leen frescos, y
// lo que ya no está publicado no vuelve.

export type SavedItem = {
  kind: "variant" | "kit";
  id: string;
  quantity: number;
};

export function savedItems(value: unknown): SavedItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SavedItem =>
      typeof item === "object" &&
      item !== null &&
      (item as SavedItem).kind != null &&
      typeof (item as SavedItem).id === "string" &&
      typeof (item as SavedItem).quantity === "number",
  );
}

export type SavedCart = { id: string; email: string; items: CartItem[] };

export async function getSavedCart(id: string): Promise<SavedCart | null> {
  const supabase = createAdminClient();
  const { data: cart } = await supabase
    .from("abandoned_carts")
    .select("id, email, items")
    .eq("id", id)
    .maybeSingle();
  if (!cart) return null;

  const saved = savedItems(cart.items);
  const variantIds = saved.filter((i) => i.kind === "variant").map((i) => i.id);
  const kitIds = saved.filter((i) => i.kind === "kit").map((i) => i.id);

  const [{ data: variants }, { data: kits }] = await Promise.all([
    variantIds.length
      ? supabase
          .from("product_variants")
          .select(
            "id, color, size, products(name, slug, price_cents, is_published, product_images(path, sort_order))",
          )
          .in("id", variantIds)
      : Promise.resolve({ data: [] }),
    kitIds.length
      ? supabase
          .from("kits")
          .select("id, name, slug, price_cents, is_published")
          .in("id", kitIds)
      : Promise.resolve({ data: [] }),
  ]);

  const byVariant = new Map((variants ?? []).map((v) => [v.id, v]));
  const byKit = new Map((kits ?? []).map((k) => [k.id, k]));

  const items: CartItem[] = [];
  for (const line of saved) {
    if (line.kind === "variant") {
      const variant = byVariant.get(line.id);
      const product = variant?.products;
      if (!variant || !product?.is_published) continue;
      const image = [...(product.product_images ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      )[0];
      items.push({
        kind: "variant",
        id: variant.id,
        href: `/producto/${product.slug}`,
        name: product.name,
        color: variant.color,
        size: variant.size,
        priceCents: product.price_cents,
        imagePath: image?.path ?? null,
        quantity: line.quantity,
      });
    } else {
      const kit = byKit.get(line.id);
      if (!kit?.is_published) continue;
      items.push({
        kind: "kit",
        id: kit.id,
        href: `/kits#${kit.slug}`,
        name: kit.name,
        color: null,
        size: null,
        priceCents: kit.price_cents,
        imagePath: null,
        quantity: line.quantity,
      });
    }
  }

  return { id: cart.id, email: cart.email, items };
}

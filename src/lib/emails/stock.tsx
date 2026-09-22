import "server-only";

import BackInStock, { subject } from "@/emails/back-in-stock";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmail, siteUrl } from "./send";

// "Volvió tu talle" (§9.10). `restock_variant` devuelve los avisos pendientes
// de la variante; acá se mandan y se marcan como avisados.

export type PendingNotice = { id: string; email: string };

export function pendingNotices(value: unknown): PendingNotice[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PendingNotice =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as PendingNotice).id === "string" &&
      typeof (item as PendingNotice).email === "string",
  );
}

export async function sendBackInStock(
  variantId: string,
  notices: PendingNotice[],
): Promise<void> {
  try {
    if (notices.length === 0) return;
    const supabase = createAdminClient();

    const { data: variant } = await supabase
      .from("product_variants")
      .select("color, size, products(name, slug, price_cents, is_published)")
      .eq("id", variantId)
      .maybeSingle();
    // Si el producto está despublicado no hay adónde mandarla.
    if (!variant?.products?.is_published) return;

    const sent: string[] = [];
    for (const notice of notices) {
      const props = {
        productName: variant.products.name,
        color: variant.color,
        size: variant.size,
        priceCents: variant.products.price_cents,
        url: `${siteUrl()}/producto/${variant.products.slug}`,
      };
      const ok = await sendEmail({
        to: notice.email,
        subject: subject(props),
        element: <BackInStock {...props} />,
        key: `repuesto:${notice.id}`,
        kind: "volvio-tu-talle",
      });
      if (ok) sent.push(notice.id);
    }

    if (sent.length > 0) {
      await supabase
        .from("back_in_stock_requests")
        .update({ notified_at: new Date().toISOString() })
        .in("id", sent);
    }
  } catch (error) {
    console.error("[email] volvió tu talle", error);
  }
}

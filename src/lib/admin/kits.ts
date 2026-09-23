import "server-only";

import type { VariantOption } from "@/components/admin/kit-form";
import type { createClient } from "@/lib/supabase/server";

// Las variantes que se pueden meter en un kit, escritas como se leen: el
// producto, el color y el talle.

type Client = Awaited<ReturnType<typeof createClient>>;

export async function variantOptions(
  supabase: Client,
): Promise<VariantOption[]> {
  const { data } = await supabase
    .from("product_variants")
    .select("id, color, size, products(name)")
    .order("id");

  return (data ?? [])
    .map((variant) => ({
      id: variant.id,
      label: `${variant.products?.name ?? "?"} — ${variant.color} / ${variant.size}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

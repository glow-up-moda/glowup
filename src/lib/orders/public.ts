import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// La tienda no puede leer `orders` por la API pública (§8): estas lecturas
// corren en el servidor con la clave secreta, y el acceso lo decide
// `src/lib/orders/access.ts`.

export async function getPublicOrder(number: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, number, status, payment_method, email, phone, shipping_method, shipping_address, is_gift, gift_message, subtotal_cents, coupon_discount_cents, transfer_discount_cents, shipping_cents, total_cents, reserved_until, paid_at, created_at, mp_preference_id, coupons(code), shipping_zones(name, eta_text), order_items(id, parent_item_id, name_snapshot, unit_price_cents, quantity)",
    )
    .eq("number", number)
    .maybeSingle();
  return data;
}

export type PublicOrder = NonNullable<
  Awaited<ReturnType<typeof getPublicOrder>>
>;

/** Alias y CBU para pagar por transferencia (§11). Vacíos hasta cargarlos. */
export async function getBankDetails(): Promise<{
  alias: string | null;
  cbu: string | null;
}> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["bank_alias", "bank_cbu"]);

  const stored = new Map((data ?? []).map((row) => [row.key, row.value]));
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() !== "" ? value : null;

  return {
    alias: text(stored.get("bank_alias")),
    cbu: text(stored.get("bank_cbu")),
  };
}

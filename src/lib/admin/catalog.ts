import "server-only";

import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Categorías para un selector: "Ropa interior / Corpiños", en orden. */
export async function categoryOptions(supabase: ServerClient) {
  const { data } = await supabase
    .from("categories")
    .select("id, name, parent_id, sort_order")
    .order("sort_order");
  const categories = data ?? [];
  const byId = new Map(categories.map((category) => [category.id, category]));

  return categories
    .map((category) => {
      const parent = category.parent_id
        ? byId.get(category.parent_id)
        : undefined;
      return {
        id: category.id,
        label: parent ? `${parent.name} / ${category.name}` : category.name,
        order: parent
          ? [parent.sort_order, category.sort_order]
          : [category.sort_order, -1],
      };
    })
    .sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1])
    .map(({ id, label }) => ({ id, label }));
}

/** Nombre de cada administradora, para mostrar quién hizo cada movimiento. */
export async function adminNames(
  supabase: ServerClient,
): Promise<Map<string, string>> {
  const { data } = await supabase.from("admin_users").select("user_id, name");
  return new Map((data ?? []).map((admin) => [admin.user_id, admin.name]));
}

export async function lowStockDefault(supabase: ServerClient): Promise<number> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "low_stock_default")
    .maybeSingle();
  const value = Number(data?.value);
  return Number.isInteger(value) && value >= 0 ? value : 3;
}

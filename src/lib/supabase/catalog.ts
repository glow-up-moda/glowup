import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cliente del catálogo público: siempre sin sesión, así la base lo ve como
 * `anon` (§8). Con la sesión de una clienta logueada sería `authenticated` y
 * no vería ni un producto, porque las políticas del catálogo son para `anon`.
 */
export function createCatalogClient() {
  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createSupabaseClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

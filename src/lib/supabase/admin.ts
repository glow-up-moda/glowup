import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

/**
 * Cliente con la clave secreta: saltea RLS.
 * Solo para webhooks, el panel y tareas del servidor. El `import "server-only"`
 * rompe el build si este archivo termina en un componente de cliente.
 */
export function createAdminClient() {
  if (!url || !secretKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  }

  return createSupabaseClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type AdminAccess =
  | { status: "signed_out"; supabase: ServerClient }
  | { status: "not_admin"; supabase: ServerClient }
  | { status: "ok"; supabase: ServerClient; userId: string; name: string };

/**
 * Estado de acceso al panel de quien hace el pedido, calculado una vez por
 * request. Es la primera barrera; la base vuelve a verificar todo con RLS
 * (private.is_admin()) en cada consulta.
 *
 * El panel se entra solo con email y contraseña (§7): el segundo factor se
 * sacó, así que acá alcanza con que la sesión exista y esté en admin_users.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { status: "signed_out", supabase };

  const { data: admin } = await supabase
    .from("admin_users")
    .select("name")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (!admin) return { status: "not_admin", supabase };

  return { status: "ok", supabase, userId: claims.sub, name: admin.name };
});

/** Para cada página y cada acción del panel: sin acceso, redirige. */
export async function requireAdmin() {
  const access = await getAdminAccess();
  if (access.status === "signed_out") redirect("/admin/ingresar");
  if (access.status === "not_admin")
    redirect("/admin/ingresar?error=sin-acceso");
  return access;
}

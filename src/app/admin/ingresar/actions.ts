"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = loginSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { error: "Escribí tu email y tu contraseña.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user)
    return { error: "El email o la contraseña no coinciden.", email };

  // Con la contraseña sola ya puede leer su propia fila de admin_users.
  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel.", email };
  }

  redirect("/admin/verificar");
}

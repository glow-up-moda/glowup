"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminAccess } from "@/lib/auth/admin";

export type EnrollState = {
  factorId?: string;
  qrCode?: string;
  secret?: string;
  error?: string;
};
export type CodeState = { error?: string };

const codeSchema = z.string().regex(/^\d{6}$/);
const WRONG_CODE =
  "Ese código no es correcto o ya cambió. Probá con el que muestra la app ahora.";

/** Solo quien ya entró con la contraseña y es administradora llega acá. */
async function requirePasswordStep() {
  const access = await getAdminAccess();
  if (access.status === "signed_out") redirect("/admin/ingresar");
  if (access.status === "not_admin")
    redirect("/admin/ingresar?error=sin-acceso");
  if (access.status === "ok") redirect("/admin");
  return access.supabase;
}

export async function startEnrollment(): Promise<EnrollState> {
  const supabase = await requirePasswordStep();

  // Un intento anterior sin terminar deja un factor sin verificar: se borra
  // para no chocar con el nombre.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified")
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Panel GLOW UP",
  });
  if (error || !data)
    return { error: "No pudimos generar el código QR. Probá de nuevo." };

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function confirmEnrollment(
  _prev: CodeState,
  formData: FormData,
): Promise<CodeState> {
  const supabase = await requirePasswordStep();

  const code = codeSchema.safeParse(
    String(formData.get("code") ?? "").replace(/\s/g, ""),
  );
  const factorId = String(formData.get("factorId") ?? "");
  if (!code.success)
    return { error: "Escribí los 6 números que muestra la app." };
  if (!factorId) return { error: "Volvé a generar el código QR." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.data,
  });
  if (error) return { error: WRONG_CODE };

  redirect("/admin");
}

export async function verifyCode(
  _prev: CodeState,
  formData: FormData,
): Promise<CodeState> {
  const supabase = await requirePasswordStep();

  const code = codeSchema.safeParse(
    String(formData.get("code") ?? "").replace(/\s/g, ""),
  );
  if (!code.success)
    return { error: "Escribí los 6 números que muestra la app." };

  // El factor sale de la sesión, no del formulario.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (!factor) redirect("/admin/verificar");

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: code.data,
  });
  if (error) return { error: WRONG_CODE };

  redirect("/admin");
}

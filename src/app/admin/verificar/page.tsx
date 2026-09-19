import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { getAdminAccess } from "@/lib/auth/admin";

import { signOut } from "../actions";
import { EnrollForm, VerifyForm } from "./mfa-forms";

export const metadata: Metadata = { title: "Segundo paso" };

export default async function VerifyPage() {
  const access = await getAdminAccess();
  if (access.status === "signed_out") redirect("/admin/ingresar");
  if (access.status === "not_admin")
    redirect("/admin/ingresar?error=sin-acceso");
  if (access.status === "ok") redirect("/admin");

  // totp trae solo los factores ya verificados.
  const { data } = await access.supabase.auth.mfa.listFactors();
  const hasFactor = (data?.totp.length ?? 0) > 0;

  return (
    <AuthCard title={hasFactor ? "Segundo paso" : "Configurá el segundo paso"}>
      {hasFactor ? <VerifyForm /> : <EnrollForm />}
      <form action={signOut} className="mt-4 text-center">
        <button
          type="submit"
          className="min-h-11 px-3 text-sm underline underline-offset-4"
        >
          Salir y entrar con otra cuenta
        </button>
      </form>
    </AuthCard>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { Notice } from "@/components/ui/notice";
import { getAdminAccess } from "@/lib/auth/admin";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/admin/ingresar">) {
  const access = await getAdminAccess();
  if (access.status === "ok") redirect("/admin");
  if (access.status === "needs_mfa") redirect("/admin/verificar");

  const { error } = await searchParams;

  return (
    <AuthCard title="Panel de administración">
      {error === "sin-acceso" && (
        <Notice tone="error" className="mb-4">
          Esta cuenta no tiene acceso al panel.
        </Notice>
      )}
      <LoginForm />
    </AuthCard>
  );
}

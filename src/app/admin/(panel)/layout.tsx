import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth/admin";

// Toda pantalla del panel pasa por acá: sin sesión de administradora con
// segundo factor, redirige. Cada acción vuelve a verificarlo por su cuenta.
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { name } = await requireAdmin();
  return <AdminShell name={name}>{children}</AdminShell>;
}

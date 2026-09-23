import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { IconChevronRight } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney, plural } from "@/lib/format";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Kits" };

const done: Record<string, string> = {
  creado: "Kit creado.",
  guardado: "Kit guardado.",
  borrado: "Kit borrado.",
};

export default async function KitsPage({
  searchParams,
}: PageProps<"/admin/kits">) {
  const { supabase } = await requireAdmin();
  const message = done[param((await searchParams).hecho)];

  const { data: kits, error } = await supabase
    .from("kits")
    .select("id, name, price_cents, is_published, kit_items(quantity)")
    .order("name");

  return (
    <>
      <PageHeader
        title="Kits"
        description="Combos armados. No tienen stock propio: lo que se puede vender sale de lo que traen."
        actions={<ButtonLink href="/admin/kits/nuevo">Nuevo kit</ButtonLink>}
      />

      {message && <Notice tone="success">{message}</Notice>}

      {error ? (
        <Notice tone="error">
          No pudimos cargar los kits. Recargá la página.
        </Notice>
      ) : kits && kits.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {kits.map((kit) => (
            <li key={kit.id}>
              <Link
                href={`/admin/kits/${kit.id}`}
                className="flex min-h-16 items-center gap-4 rounded-card bg-crema-oscuro/60 px-4 py-3"
              >
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{kit.name}</span>
                    {!kit.is_published && <Badge>Borrador</Badge>}
                  </span>
                  <span className="block text-sm">
                    {formatMoney(kit.price_cents)} ·{" "}
                    {plural(kit.kit_items.length, "producto", "productos")}
                  </span>
                </span>
                <IconChevronRight className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Notice title="Todavía no hay kits">
          Un kit junta varios productos en un precio. Creá el primero cuando
          sepas qué querés combinar.
        </Notice>
      )}
    </>
  );
}

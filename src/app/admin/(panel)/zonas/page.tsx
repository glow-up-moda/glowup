import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { IconChevronRight } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/format";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Zonas de envío" };

const done: Record<string, string> = {
  creada: "Zona creada.",
  guardada: "Zona guardada.",
  borrada: "Zona borrada.",
};

export default async function ZonesPage({
  searchParams,
}: PageProps<"/admin/zonas">) {
  const { supabase } = await requireAdmin();
  const message = done[param((await searchParams).hecho)];

  const { data: zones, error } = await supabase
    .from("shipping_zones")
    .select("id, name, price_cents, eta_text, same_day")
    .order("same_day", { ascending: false })
    .order("price_cents");

  return (
    <>
      <PageHeader
        title="Zonas de envío"
        description="Cuánto sale y cuánto tarda cada destino. La clienta elige una al comprar."
        actions={<ButtonLink href="/admin/zonas/nueva">Nueva zona</ButtonLink>}
      />

      {message && <Notice tone="success">{message}</Notice>}

      {error ? (
        <Notice tone="error">
          No pudimos cargar las zonas. Recargá la página.
        </Notice>
      ) : zones && zones.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {zones.map((zone) => (
            <li key={zone.id}>
              <Link
                href={`/admin/zonas/${zone.id}`}
                className="flex min-h-16 items-center gap-4 rounded-card bg-crema-oscuro/60 px-4 py-3"
              >
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{zone.name}</span>
                    {zone.same_day && <Badge tone="accent">En el día</Badge>}
                  </span>
                  <span className="block text-sm">
                    {zone.price_cents > 0
                      ? formatMoney(zone.price_cents)
                      : "Sin cargo"}{" "}
                    · {zone.eta_text}
                  </span>
                </span>
                <IconChevronRight className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Notice title="Todavía no hay zonas">
          Sin zonas cargadas, la clienta solo puede retirar. Creá al menos una
          para poder enviar.
        </Notice>
      )}
    </>
  );
}

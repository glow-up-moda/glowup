import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDate, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Avisos de reposición" };

/**
 * Quién está esperando qué talle (§7). Es la lista de lo que conviene reponer:
 * cada fila ya tiene alguien con el email dejado. Al reponer desde Stock, el
 * aviso sale solo (§9.10).
 */
export default async function RestockNoticesPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("back_in_stock_requests")
    .select(
      "id, email, created_at, product_variants(color, size, stock_on_hand, stock_reserved, products(name, slug))",
    )
    .is("notified_at", null)
    .order("created_at");

  // Una fila por variante, con quiénes esperan y desde cuándo.
  const porVariante = new Map<
    string,
    {
      producto: string;
      slug: string;
      detalle: string;
      disponible: number;
      emails: string[];
      desde: string;
    }
  >();

  for (const fila of data ?? []) {
    const variante = fila.product_variants;
    const producto = variante?.products;
    if (!variante || !producto) continue;
    const clave = `${producto.name} ${variante.color} ${variante.size}`;
    const actual = porVariante.get(clave);
    if (actual) {
      actual.emails.push(fila.email);
      continue;
    }
    porVariante.set(clave, {
      producto: producto.name,
      slug: producto.slug,
      detalle: `${variante.color} · Talle ${variante.size}`,
      disponible: variante.stock_on_hand - variante.stock_reserved,
      emails: [fila.email],
      desde: fila.created_at,
    });
  }

  const filas = [...porVariante.values()].sort(
    (a, b) => b.emails.length - a.emails.length,
  );

  return (
    <>
      <PageHeader
        title="Avisos de reposición"
        description="Quién está esperando un talle agotado. Cuando lo repongas desde Stock, el aviso sale solo."
      />

      {error ? (
        <Notice tone="error">
          No pudimos cargar los avisos. Recargá la página.
        </Notice>
      ) : filas.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filas.map((fila) => (
            <li
              key={`${fila.producto}-${fila.detalle}`}
              className="rounded-card bg-crema-oscuro/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <Link
                    href={`/producto/${fila.slug}`}
                    target="_blank"
                    className="font-medium underline underline-offset-4"
                  >
                    {fila.producto}
                  </Link>
                  <span className="block text-sm">{fila.detalle}</span>
                </span>
                <Badge tone={fila.disponible > 0 ? "success" : "accent"}>
                  {fila.disponible > 0
                    ? `${plural(fila.disponible, "disponible", "disponibles")}`
                    : "Sin stock"}
                </Badge>
              </div>

              <p className="mt-3 text-sm">
                {plural(
                  fila.emails.length,
                  "persona esperando",
                  "personas esperando",
                )}
                , desde el {formatDate(fila.desde)}.
              </p>
              <p className="mt-1 text-sm break-words">
                {fila.emails.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <Notice title="No hay nadie esperando">
          Cuando alguien pida que le avisemos por un talle agotado, aparece acá.
        </Notice>
      )}
    </>
  );
}

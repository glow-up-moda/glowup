import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Section } from "@/components/admin/page-header";
import { StockMovementForm } from "@/components/admin/stock-movement-form";
import { Badge } from "@/components/ui/badge";
import { inputClass } from "@/components/ui/field";
import { IconSearch } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { adminNames, lowStockDefault } from "@/lib/admin/catalog";
import { likePattern, param } from "@/lib/params";
import { compareVariants } from "@/lib/sizes";
import { MOVEMENT_LABELS, movementSign } from "@/lib/admin/stock";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Stock" };

const VARIANT_COLUMNS =
  "id, color, size, sku, stock_on_hand, stock_reserved, low_stock_threshold, product_id, products!inner(name)";

type VariantRow = {
  id: string;
  color: string;
  size: string;
  sku: string | null;
  stock_on_hand: number;
  stock_reserved: number;
  low_stock_threshold: number | null;
  product_id: string;
  products: { name: string };
};

export default async function StockPage({
  searchParams,
}: PageProps<"/admin/stock">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const q = param(params.q);
  const lowOnly = param(params.filtro) === "bajo";

  let rows: VariantRow[] = [];
  if (lowOnly) {
    const { data: low } = await supabase
      .from("low_stock_variants")
      .select("variant_id")
      .limit(200);
    const ids = (low ?? [])
      .map((row) => row.variant_id)
      .filter((id): id is string => Boolean(id));
    if (ids.length) {
      const { data } = await supabase
        .from("product_variants")
        .select(VARIANT_COLUMNS)
        .in("id", ids);
      rows = data ?? [];
    }
  } else if (q) {
    const [{ data: byName }, { data: bySku }] = await Promise.all([
      supabase
        .from("product_variants")
        .select(VARIANT_COLUMNS)
        .ilike("products.name", likePattern(q))
        .limit(200),
      supabase
        .from("product_variants")
        .select(VARIANT_COLUMNS)
        .ilike("sku", likePattern(q))
        .limit(200),
    ]);
    const unique = new Map(
      [...(byName ?? []), ...(bySku ?? [])].map((row) => [row.id, row]),
    );
    rows = [...unique.values()];
  }
  rows.sort(
    (a, b) =>
      a.products.name.localeCompare(b.products.name, "es") ||
      compareVariants(a, b),
  );

  const [{ data: movements }, names, threshold] = await Promise.all([
    supabase
      .from("stock_movements")
      .select(
        "id, type, quantity, note, created_at, created_by, product_variants(color, size, product_id, products(name))",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    adminNames(supabase),
    lowStockDefault(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Stock"
        description="Ingresos de mercadería, ventas por Instagram, WhatsApp o en persona, y ajustes."
      />

      <form role="search" className="mb-3 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar por producto o SKU
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por producto o SKU"
          className={inputClass}
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-chocolate"
        >
          <IconSearch />
        </button>
      </form>

      <nav aria-label="Filtrar stock" className="mb-5 flex gap-2">
        <Link
          href="/admin/stock?filtro=bajo"
          aria-current={lowOnly ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full px-4 ${lowOnly ? "bg-chocolate text-crema" : "bg-crema-oscuro"}`}
        >
          Stock bajo
        </Link>
        {(lowOnly || q) && (
          <Link
            href="/admin/stock"
            className="inline-flex min-h-11 items-center rounded-full px-4 underline underline-offset-4"
          >
            Ver movimientos
          </Link>
        )}
      </nav>

      {(lowOnly || q) && (
        <Section
          title={
            lowOnly ? "Variantes con stock bajo" : `Resultados para "${q}"`
          }
        >
          {rows.length === 0 ? (
            <p>
              {lowOnly
                ? "Ninguna variante publicada está por debajo de su aviso de stock."
                : "No encontramos variantes."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => {
                const available = row.stock_on_hand - row.stock_reserved;
                const rowThreshold = row.low_stock_threshold ?? threshold;
                return (
                  <li key={row.id} className="rounded-card bg-crema p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/productos/${row.product_id}#stock`}
                          className="font-medium underline underline-offset-4"
                        >
                          {row.products.name}
                        </Link>
                        <p className="text-sm">
                          {row.color} · {row.size}
                          {row.sku ? ` · SKU ${row.sku}` : ""}
                        </p>
                      </div>
                      {available <= 0 ? (
                        <Badge tone="error">Agotado</Badge>
                      ) : available <= rowThreshold ? (
                        <Badge tone="accent">Stock bajo</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm">
                      <span className="font-display text-xl font-semibold">
                        {available}
                      </span>{" "}
                      {available === 1 ? "disponible" : "disponibles"} ·{" "}
                      {row.stock_on_hand} en mano · {row.stock_reserved}{" "}
                      {row.stock_reserved === 1 ? "reservada" : "reservadas"}
                    </p>
                    <details className="mt-3">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 underline underline-offset-4 hover:bg-crema-oscuro">
                        Mover stock
                      </summary>
                      <div className="mt-3">
                        <StockMovementForm variantId={row.id} />
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}

      {!lowOnly && !q && (
        <Section title="Últimos movimientos">
          {!movements?.length ? (
            <Notice>
              Todavía no hay movimientos. Buscá un producto para registrar el
              primero.
            </Notice>
          ) : (
            <ul className="divide-y divide-crema-oscuro">
              {movements.map((movement) => (
                <li
                  key={movement.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                >
                  <span className="min-w-0">
                    <span className="font-medium">
                      {MOVEMENT_LABELS[movement.type]}
                    </span>{" "}
                    {movement.product_variants && (
                      <Link
                        href={`/admin/productos/${movement.product_variants.product_id}#stock`}
                        className="text-sm underline underline-offset-4"
                      >
                        {movement.product_variants.products?.name} ·{" "}
                        {movement.product_variants.color} ·{" "}
                        {movement.product_variants.size}
                      </Link>
                    )}
                    {movement.note && (
                      <span className="block text-sm">{movement.note}</span>
                    )}
                  </span>
                  <span className="text-right text-sm">
                    <span className="block font-medium">
                      {movementSign(movement.type, movement.quantity)}
                    </span>
                    {formatDateTime(movement.created_at)}
                    {movement.created_by && names.get(movement.created_by)
                      ? ` · ${names.get(movement.created_by)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}

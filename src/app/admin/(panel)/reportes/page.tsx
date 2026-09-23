import type { Metadata } from "next";

import { FilterNav } from "@/components/admin/filter-nav";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney, formatPercent, plural } from "@/lib/format";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Reportes" };

/**
 * Más vendidos, talles y margen (§7).
 *
 * Las cuentas se hacen acá y no en la base: con el volumen de una tienda chica
 * son unas pocas filas, y así no hace falta una función nueva por cada reporte.
 * Si algún día esto se pone lento, el cálculo se muda a SQL.
 *
 * Un kit se vendió como una línea con su precio y sus componentes colgando en
 * cero (§8): las unidades salen de las líneas con variante, así lo que se
 * vendió dentro de un kit también cuenta, y la facturación de las líneas de
 * arriba, para no contar dos veces.
 */

const RANGOS = [
  { value: "30", label: "Últimos 30 días", dias: 30 },
  { value: "90", label: "Últimos 90 días", dias: 90 },
  { value: "todo", label: "Todo", dias: null },
] as const;

const LIMITE = 2000;

/** Desde cuándo mirar. Va afuera del componente: la hora cambia en cada pedido. */
function desdeCuando(dias: number | null): string | null {
  if (dias === null) return null;
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
}

export default async function ReportsPage({
  searchParams,
}: PageProps<"/admin/reportes">) {
  const { supabase } = await requireAdmin();
  const desde = param((await searchParams).desde);
  const rango = RANGOS.find((item) => item.value === desde) ?? RANGOS[0];

  let query = supabase
    .from("order_items")
    .select(
      "quantity, unit_price_cents, parent_item_id, variant_id, product_variants(size, products(name, cost_cents)), orders!inner(paid_at, status)",
    )
    .not("orders.paid_at", "is", null)
    .neq("orders.status", "cancelled")
    .limit(LIMITE);

  const limite = desdeCuando(rango.dias);
  if (limite) query = query.gte("orders.paid_at", limite);

  const { data: lineas, error } = await query;

  const porProducto = new Map<string, number>();
  const porTalle = new Map<string, number>();
  let facturado = 0;
  let costo = 0;
  let costoDesconocido = false;

  for (const linea of lineas ?? []) {
    if (!linea.parent_item_id)
      facturado += linea.unit_price_cents * linea.quantity;

    if (!linea.variant_id) continue;
    const variante = linea.product_variants;
    const producto = variante?.products;
    if (!variante || !producto) continue;

    porProducto.set(
      producto.name,
      (porProducto.get(producto.name) ?? 0) + linea.quantity,
    );
    porTalle.set(
      variante.size,
      (porTalle.get(variante.size) ?? 0) + linea.quantity,
    );

    if (producto.cost_cents == null) costoDesconocido = true;
    else costo += producto.cost_cents * linea.quantity;
  }

  const ranking = (mapa: Map<string, number>) =>
    [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const productos = ranking(porProducto);
  const talles = ranking(porTalle);
  const margen = facturado > 0 ? (facturado - costo) / facturado : null;

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Qué se vende, en qué talles y cuánto queda. Solo cuenta lo que ya se cobró."
      />

      <FilterNav
        label="Período"
        items={RANGOS.map((item) => ({
          href: `/admin/reportes?desde=${item.value}`,
          label: item.label,
          active: item.value === rango.value,
        }))}
      />

      {error ? (
        <Notice tone="error">
          No pudimos armar los reportes. Recargá la página.
        </Notice>
      ) : facturado === 0 ? (
        <Notice title="Todavía no hay ventas cobradas">
          Cuando entre la primera, acá vas a ver qué se vende y cuánto queda.
        </Notice>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Cuánto queda">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm">Facturado</dt>
                <dd className="font-display text-2xl font-semibold">
                  {formatMoney(facturado)}
                </dd>
              </div>
              <div>
                <dt className="text-sm">Costo de lo vendido</dt>
                <dd className="font-display text-2xl font-semibold">
                  {formatMoney(costo)}
                </dd>
              </div>
              <div>
                <dt className="text-sm">Margen</dt>
                <dd className="font-display text-2xl font-semibold">
                  {margen == null ? "—" : formatPercent(margen)}
                </dd>
              </div>
            </dl>
            {costoDesconocido && (
              <Notice title="El margen es aproximado">
                Hay productos vendidos sin costo cargado, así que el costo real
                es más alto y el margen, más bajo.
              </Notice>
            )}
          </Section>

          <Section title="Más vendidos">
            <ul className="flex flex-col gap-2">
              {productos.map(([nombre, unidades]) => (
                <li
                  key={nombre}
                  className="flex items-baseline justify-between gap-3 border-b border-crema-oscuro pb-2"
                >
                  <span>{nombre}</span>
                  <span className="shrink-0 font-medium">
                    {plural(unidades, "unidad", "unidades")}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Talles más vendidos"
            description="Sirve para saber qué reponer primero."
          >
            <ul className="flex flex-wrap gap-2">
              {talles.map(([talle, unidades]) => (
                <li
                  key={talle}
                  className="rounded-full bg-crema-oscuro px-4 py-2"
                >
                  <span className="font-medium">{talle}</span>: {unidades}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}

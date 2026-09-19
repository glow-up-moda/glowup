import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { PrintButton } from "@/components/admin/print-button";
import { Notice } from "@/components/ui/notice";
import {
  addressLines,
  parseOrderNumber,
  SHIPPING_LABELS,
  STATUS_LABELS,
} from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDateTime, plural } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/admin/pedidos/[numero]/hoja">): Promise<Metadata> {
  const number = parseOrderNumber((await params).numero);
  return { title: number ? `Hoja ${number}` : "Hoja del pedido" };
}

// Hoja para armar el paquete (§7, Pedidos). Sin precios: puede viajar dentro
// de la caja, y los regalos van sin precios.

function CheckRow({
  quantity,
  name,
  sku,
}: {
  quantity: number;
  name: string;
  sku?: string | null;
}) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden
        className="mt-0.5 size-5 shrink-0 border-2 border-chocolate"
      />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{quantity} ×</span> {name}
        {sku && <span className="block text-sm">{sku}</span>}
      </span>
    </li>
  );
}

export default async function PackingSlipPage({
  params,
}: PageProps<"/admin/pedidos/[numero]/hoja">) {
  const { supabase } = await requireAdmin();
  const number = parseOrderNumber((await params).numero);
  if (!number) notFound();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "number, status, email, phone, shipping_method, shipping_address, is_gift, gift_message, created_at, shipping_zones(name, eta_text), order_items(id, parent_item_id, name_snapshot, quantity, product_variants(sku))",
    )
    .eq("number", number)
    .maybeSingle();
  if (!order) notFound();

  const byName = (a: { name_snapshot: string }, b: { name_snapshot: string }) =>
    a.name_snapshot.localeCompare(b.name_snapshot, "es");
  const lines = order.order_items
    .filter((item) => !item.parent_item_id)
    .sort(byName);
  const partsOf = (id: string) =>
    order.order_items.filter((item) => item.parent_item_id === id).sort(byName);
  // Lo que entra en la caja: los kits cuentan por sus componentes.
  const units = order.order_items
    .filter(
      (item) =>
        !order.order_items.some((other) => other.parent_item_id === item.id),
    )
    .reduce((total, item) => total + item.quantity, 0);
  const address = addressLines(order.shipping_address);
  const ready = order.status === "paid" || order.status === "preparing";
  const unpaid =
    order.status === "pending_payment" || order.status === "cancelled";

  return (
    <>
      <PageHeader
        title={`Hoja del pedido ${order.number}`}
        back={{
          href: `/admin/pedidos/${order.number}`,
          label: `Pedido ${order.number}`,
        }}
        actions={<PrintButton />}
      />

      {!ready && (
        <Notice tone={unpaid ? "error" : "info"} className="mb-4 print:hidden">
          {unpaid
            ? `Este pedido está ${STATUS_LABELS[order.status].toLowerCase()}: no lo armes todavía.`
            : `Este pedido ya está ${STATUS_LABELS[order.status].toLowerCase()}.`}
        </Notice>
      )}

      <article className="rounded-card border-2 border-crema-oscuro p-5 md:p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b-2 border-chocolate pb-3">
          <div>
            <p className="font-display text-2xl font-semibold">GLOW UP</p>
            <p className="text-sm">Hoja para armar el pedido</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold">
              {order.number}
            </p>
            <p className="text-sm">{formatDateTime(order.created_at)}</p>
          </div>
        </header>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <section>
            <h2 className="font-medium">Entrega</h2>
            <p>
              {SHIPPING_LABELS[order.shipping_method]}
              {order.shipping_zones && ` · ${order.shipping_zones.name}`}
            </p>
            {order.shipping_zones?.eta_text && (
              <p className="text-sm">{order.shipping_zones.eta_text}</p>
            )}
            {address.length > 0 && (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                {address.map((line) => (
                  <div key={line.label} className="contents">
                    <dt>{line.label}</dt>
                    <dd className="break-words">{line.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          <section>
            <h2 className="font-medium">Contacto</h2>
            <p>{order.phone}</p>
            <p className="break-all">{order.email}</p>
          </section>
        </div>

        {order.is_gift && (
          <section className="mt-4 rounded-card border-2 border-chocolate p-3">
            <h2 className="font-medium">Es para regalo: caja sin precios</h2>
            {order.gift_message && (
              <p className="mt-1">
                Mensaje para la tarjeta: “{order.gift_message}”
              </p>
            )}
          </section>
        )}

        <section className="mt-5">
          <h2 className="font-medium">
            {plural(units, "producto", "productos")}
          </h2>
          <ul className="mt-1 divide-y divide-crema-oscuro border-y border-crema-oscuro">
            {lines.map((line) => {
              const parts = partsOf(line.id);
              return parts.length > 0 ? (
                <li key={line.id} className="py-2">
                  <p className="font-medium">
                    {line.quantity} × {line.name_snapshot}
                  </p>
                  <ul className="pl-4">
                    {parts.map((part) => (
                      <CheckRow
                        key={part.id}
                        quantity={part.quantity}
                        name={part.name_snapshot}
                        sku={part.product_variants?.sku}
                      />
                    ))}
                  </ul>
                </li>
              ) : (
                <CheckRow
                  key={line.id}
                  quantity={line.quantity}
                  name={line.name_snapshot}
                  sku={line.product_variants?.sku}
                />
              );
            })}
          </ul>
        </section>

        <p className="mt-5 text-sm">
          Embalaje discreto: que desde afuera no se vea qué hay adentro.
        </p>
      </article>
    </>
  );
}

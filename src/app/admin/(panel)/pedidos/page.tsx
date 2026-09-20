import type { Metadata } from "next";
import Link from "next/link";

import { FilterNav } from "@/components/admin/filter-nav";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { inputClass } from "@/components/ui/field";
import { IconChevronRight, IconSearch } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import type { DashboardSummary } from "@/lib/admin/dashboard";
import {
  isOrderTab,
  ORDER_TABS,
  type OrderTab,
  PAYMENT_LABELS,
  SHIPPING_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
} from "@/lib/admin/orders";
import { likePattern, param } from "@/lib/params";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDateTime, formatMoney, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos" };

const PAGE_SIZE = 30;

const emptyTexts: Record<OrderTab, string> = {
  "por-preparar":
    "No hay pedidos pagados esperando. Cuando entre uno, aparece acá.",
  transferencias: "No hay transferencias por confirmar.",
  revisar: "No hay pedidos para revisar.",
  preparando: "No hay pedidos en preparación.",
  enviados: "No hay pedidos enviados ni listos para retirar.",
  entregados: "Todavía no hay pedidos entregados.",
  cancelados: "No hay pedidos cancelados.",
  todos: "Todavía no hay pedidos.",
};

/** Las colas se atienden por orden de llegada; el resto, lo último primero. */
const queues: OrderTab[] = ["por-preparar", "transferencias", "preparando"];

export default async function OrdersPage({
  searchParams,
}: PageProps<"/admin/pedidos">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const q = param(params.q);
  const estado = param(params.estado);
  // Buscar recorre todos los pedidos; sin búsqueda se arranca por lo que hay que preparar.
  const tab: OrderTab = isOrderTab(estado)
    ? estado
    : q
      ? "todos"
      : "por-preparar";
  const page = Math.max(1, Number.parseInt(param(params.pagina), 10) || 1);

  let query = supabase
    .from("orders")
    .select(
      "id, number, status, payment_method, shipping_method, email, total_cents, created_at, reserved_until, needs_review, is_gift, order_items(quantity, parent_item_id)",
      { count: "exact" },
    );

  if (tab === "por-preparar") query = query.eq("status", "paid");
  if (tab === "transferencias") {
    query = query
      .eq("status", "pending_payment")
      .eq("payment_method", "transfer");
  }
  if (tab === "revisar") query = query.eq("needs_review", true);
  if (tab === "preparando") query = query.eq("status", "preparing");
  if (tab === "enviados")
    query = query.in("status", ["shipped", "ready_for_pickup"]);
  if (tab === "entregados") query = query.eq("status", "delivered");
  if (tab === "cancelados") query = query.eq("status", "cancelled");

  if (q) {
    // "1000", "GU-1000" o "gu-001000" buscan por número; lo demás, por email.
    const digits = q.replace(/^gu-?/i, "");
    query = /^\d+$/.test(digits)
      ? query.ilike("number", `%${digits}%`)
      : query.ilike("email", likePattern(q));
  }

  const from = (page - 1) * PAGE_SIZE;
  const [{ data: orders, count, error }, { data: summaryData }] =
    await Promise.all([
      query
        .order("created_at", { ascending: queues.includes(tab) })
        .range(from, from + PAGE_SIZE - 1),
      supabase.rpc("admin_dashboard"),
    ]);
  const summary = summaryData as DashboardSummary | null;
  const pending: Partial<Record<OrderTab, number>> = {
    "por-preparar": summary?.to_prepare,
    transferencias: summary?.pending_transfers,
    revisar: summary?.needs_review,
  };
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function href(next: { estado?: OrderTab; pagina?: number }): string {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    search.set("estado", next.estado ?? tab);
    if (next.pagina && next.pagina > 1)
      search.set("pagina", String(next.pagina));
    return `/admin/pedidos?${search}`;
  }

  return (
    <>
      <PageHeader title="Pedidos" />

      <form role="search" className="mb-3 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar por número o email
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Número o email"
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

      <FilterNav
        label="Filtrar pedidos"
        items={ORDER_TABS.map((item) => ({
          href: href({ estado: item.value }),
          label: item.label,
          active: tab === item.value,
          count: pending[item.value],
        }))}
      />

      {q && !error && !!count && (
        <p className="mb-3 text-sm" role="status">
          {plural(count ?? 0, "pedido", "pedidos")} para “{q}”.{" "}
          <Link
            href={`/admin/pedidos?estado=${tab}`}
            className="underline underline-offset-4"
          >
            Borrar búsqueda
          </Link>
        </p>
      )}

      {error ? (
        <Notice tone="error">
          No pudimos cargar los pedidos. Recargá la página.
        </Notice>
      ) : !orders?.length ? (
        <Notice>
          {q ? `No hay pedidos que coincidan con “${q}”.` : emptyTexts[tab]}
        </Notice>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {orders.map((order) => {
              const units = order.order_items
                .filter((item) => !item.parent_item_id)
                .reduce((total, item) => total + item.quantity, 0);
              return (
                <li key={order.id}>
                  <Link
                    href={`/admin/pedidos/${order.number}`}
                    className="flex items-center gap-3 rounded-card bg-crema-oscuro/60 p-3 hover:bg-crema-oscuro"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{order.number}</span>
                        <Badge tone={STATUS_TONES[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                        {order.needs_review && (
                          <Badge tone="error">Para revisar</Badge>
                        )}
                        {order.is_gift && <Badge>Regalo</Badge>}
                      </span>
                      <span className="mt-1 block truncate text-sm">
                        {order.email}
                      </span>
                      <span className="block text-sm">
                        {formatDateTime(order.created_at)} ·{" "}
                        {PAYMENT_LABELS[order.payment_method]} ·{" "}
                        {SHIPPING_LABELS[order.shipping_method]}
                      </span>
                      {order.status === "pending_payment" &&
                        order.reserved_until && (
                          <span className="block text-sm">
                            Reserva hasta {formatDateTime(order.reserved_until)}
                          </span>
                        )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-medium">
                        {formatMoney(order.total_cents)}
                      </span>
                      <span className="block text-sm">
                        {plural(units, "producto", "productos")}
                      </span>
                    </span>
                    <IconChevronRight className="hidden shrink-0 sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {pages > 1 && (
            <nav
              aria-label="Páginas"
              className="mt-5 flex items-center justify-between gap-3 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={href({ pagina: page - 1 })}
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  ← Anteriores
                </Link>
              ) : (
                <span />
              )}
              <span>
                Página {page} de {pages}
              </span>
              {page < pages ? (
                <Link
                  href={href({ pagina: page + 1 })}
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  Siguientes →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

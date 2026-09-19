import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { IconAlert, IconChevronRight } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Inicio" };

type Summary = {
  sales_today_cents: number;
  orders_today: number;
  sales_week_cents: number;
  orders_week: number;
  to_prepare: number;
  pending_transfers: number;
  needs_review: number;
  low_stock: number;
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export default async function DashboardPage() {
  const { supabase, name } = await requireAdmin();

  const [{ data: summaryData }, { data: lowStock }] = await Promise.all([
    supabase.rpc("admin_dashboard"),
    supabase
      .from("low_stock_variants")
      .select("variant_id, product_id, product_name, color, size, available")
      .order("available")
      .limit(5),
  ]);
  const summary = summaryData as Summary | null;

  const alerts = summary
    ? [
        {
          count: summary.needs_review,
          text: plural(
            summary.needs_review,
            "pedido para revisar",
            "pedidos para revisar",
          ),
          href: "/admin/pedidos?estado=revisar",
        },
        {
          count: summary.pending_transfers,
          text: plural(
            summary.pending_transfers,
            "transferencia por confirmar",
            "transferencias por confirmar",
          ),
          href: "/admin/pedidos?estado=transferencias",
        },
        {
          count: summary.low_stock,
          text: plural(
            summary.low_stock,
            "variante con stock bajo",
            "variantes con stock bajo",
          ),
          href: "/admin/stock?filtro=bajo",
        },
      ].filter((alert) => alert.count > 0)
    : [];

  return (
    <>
      <PageHeader
        title={`Hola, ${name.split(" ")[0]}`}
        description="Así viene la tienda hoy."
      />

      {!summary ? (
        <Notice tone="error">
          No pudimos cargar el resumen. Recargá la página.
        </Notice>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-card bg-crema-oscuro/60 p-4">
              <p className="text-sm">Ventas de hoy</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {formatMoney(summary.sales_today_cents)}
              </p>
              <p className="text-sm">
                {plural(summary.orders_today, "pedido", "pedidos")}
              </p>
            </div>
            <div className="rounded-card bg-crema-oscuro/60 p-4">
              <p className="text-sm">Esta semana</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {formatMoney(summary.sales_week_cents)}
              </p>
              <p className="text-sm">
                {plural(summary.orders_week, "pedido", "pedidos")}
              </p>
            </div>
            <Link
              href="/admin/pedidos?estado=por-preparar"
              className="col-span-2 flex items-center justify-between rounded-card bg-rosa p-4 md:col-span-1"
            >
              <span>
                <span className="block text-sm">Por preparar</span>
                <span className="mt-1 block font-display text-2xl font-semibold">
                  {summary.to_prepare}
                </span>
                <span className="block text-sm">
                  {summary.to_prepare === 1
                    ? "pedido pagado"
                    : "pedidos pagados"}
                </span>
              </span>
              <IconChevronRight />
            </Link>
          </div>

          <section aria-labelledby="alertas">
            <h2 id="alertas" className="font-display text-xl font-semibold">
              Alertas
            </h2>
            {alerts.length === 0 ? (
              <Notice tone="success" className="mt-3">
                Todo en orden: nada para revisar, ninguna transferencia
                esperando y stock al día.
              </Notice>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {alerts.map((alert) => (
                  <li key={alert.href}>
                    <Link
                      href={alert.href}
                      className="flex min-h-14 items-center gap-3 rounded-card border-l-4 border-error bg-crema-oscuro px-4 py-3 text-error"
                    >
                      <IconAlert className="shrink-0" />
                      <span className="flex-1 font-medium">{alert.text}</span>
                      <IconChevronRight className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {lowStock && lowStock.length > 0 && (
            <section
              aria-labelledby="stock-bajo"
              className="rounded-card bg-crema-oscuro/60 p-4"
            >
              <h2
                id="stock-bajo"
                className="font-display text-xl font-semibold"
              >
                Stock bajo
              </h2>
              <ul className="mt-3 divide-y divide-crema-oscuro">
                {lowStock.map((variant) => (
                  <li key={variant.variant_id}>
                    <Link
                      href={`/admin/productos/${variant.product_id}#stock`}
                      className="flex min-h-12 items-center justify-between gap-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">
                          {variant.product_name}
                        </span>
                        <span className="block text-sm">
                          {variant.color} · {variant.size}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">
                        {variant.available === 0
                          ? "Agotado"
                          : `Quedan ${variant.available}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

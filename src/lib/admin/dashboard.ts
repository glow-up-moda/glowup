/** Lo que devuelve admin_dashboard() (§7, Inicio del panel). */
export type DashboardSummary = {
  sales_today_cents: number;
  orders_today: number;
  sales_week_cents: number;
  orders_week: number;
  to_prepare: number;
  pending_transfers: number;
  needs_review: number;
  low_stock: number;
};

import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { IconChevronRight, IconPlus } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { couponState, couponValueText } from "@/lib/admin/coupons";
import { param } from "@/lib/admin/params";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Cupones" };

export default async function CouponsPage({
  searchParams,
}: PageProps<"/admin/cupones">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const { data: coupons, error } = await supabase
    .from("coupons")
    .select(
      "id, code, type, value, min_subtotal_cents, starts_at, ends_at, max_uses, used_count",
    )
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Cupones"
        actions={
          <ButtonLink href="/admin/cupones/nuevo">
            <IconPlus />
            Nuevo cupón
          </ButtonLink>
        }
      />

      {param(params.hecho) === "borrado" && (
        <Notice tone="success" className="mb-4">
          Cupón borrado.
        </Notice>
      )}

      {error ? (
        <Notice tone="error">
          No pudimos cargar los cupones. Recargá la página.
        </Notice>
      ) : !coupons?.length ? (
        <Notice>Todavía no hay cupones. Creá el primero.</Notice>
      ) : (
        <ul className="flex flex-col gap-2">
          {coupons.map((coupon) => {
            const state = couponState(coupon);
            return (
              <li key={coupon.id}>
                <Link
                  href={`/admin/cupones/${coupon.id}`}
                  className="flex items-center gap-3 rounded-card bg-crema-oscuro/60 p-3 hover:bg-crema-oscuro"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{coupon.code}</span>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </span>
                    <span className="mt-1 block text-sm">
                      {couponValueText(coupon.type, coupon.value)}
                      {coupon.min_subtotal_cents > 0 &&
                        ` · desde ${formatMoney(coupon.min_subtotal_cents)}`}
                    </span>
                    <span className="block text-sm">
                      {coupon.ends_at
                        ? `Hasta ${formatDateTime(coupon.ends_at)}`
                        : "Sin vencimiento"}
                      {" · "}
                      {coupon.max_uses
                        ? `${coupon.used_count} de ${coupon.max_uses} usos`
                        : `${coupon.used_count} usos`}
                    </span>
                  </span>
                  <IconChevronRight className="hidden shrink-0 sm:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

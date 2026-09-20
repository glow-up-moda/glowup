import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/admin/action-button";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { CouponForm } from "@/components/admin/coupon-form";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { couponState, couponValueText } from "@/lib/admin/coupons";
import { isUuid, param } from "@/lib/params";
import { requireAdmin } from "@/lib/auth/admin";
import { centsToPesosInput, formatDateTime, toLocalInput } from "@/lib/format";

import { deactivateCoupon, deleteCoupon, updateCoupon } from "../actions";

export const metadata: Metadata = { title: "Cupón" };

export default async function CouponPage({
  params,
  searchParams,
}: PageProps<"/admin/cupones/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = await searchParams;

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!coupon) notFound();

  const state = couponState(coupon);
  const expired = state.label === "Vencido";

  return (
    <>
      <PageHeader
        title={coupon.code}
        back={{ href: "/admin/cupones", label: "Cupones" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={state.tone}>{state.label}</Badge>
            <span>{couponValueText(coupon.type, coupon.value)}</span>
          </span>
        }
      />

      {param(query.hecho) === "creado" && (
        <Notice tone="success" className="mb-4">
          Cupón creado. Ya se puede usar en el checkout.
        </Notice>
      )}

      <div className="flex flex-col gap-4">
        <Section title="Datos del cupón">
          <CouponForm
            action={updateCoupon.bind(null, coupon.id)}
            mode="edit"
            initial={{
              code: coupon.code,
              type: coupon.type,
              value:
                coupon.type === "percent"
                  ? String(coupon.value)
                  : centsToPesosInput(coupon.value),
              min_subtotal_cents: coupon.min_subtotal_cents
                ? centsToPesosInput(coupon.min_subtotal_cents)
                : "",
              starts_at: toLocalInput(coupon.starts_at),
              ends_at: toLocalInput(coupon.ends_at),
              max_uses: coupon.max_uses ? String(coupon.max_uses) : "",
            }}
          />
        </Section>

        <Section title="Uso">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt>Usos</dt>
            <dd>
              {coupon.used_count}
              {coupon.max_uses ? ` de ${coupon.max_uses}` : " (sin tope)"}
            </dd>
            <dt>Creado</dt>
            <dd>{formatDateTime(coupon.created_at)}</dd>
          </dl>

          <div className="mt-4 flex flex-col items-start gap-3">
            {!expired && (
              <ActionButton
                action={deactivateCoupon.bind(null, coupon.id)}
                variant="secondary"
                pendingText="Desactivando…"
              >
                Desactivar ahora
              </ActionButton>
            )}
            {coupon.used_count === 0 ? (
              <ConfirmAction
                action={deleteCoupon.bind(null, coupon.id)}
                label="Borrar cupón"
                question="¿Borrar este cupón? Todavía no lo usó nadie."
                confirmLabel="Sí, borrar"
              />
            ) : (
              <p className="text-sm">
                Ya se usó en {coupon.used_count === 1 ? "un pedido" : "pedidos"}
                , así que no se borra: desactivalo.
              </p>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}

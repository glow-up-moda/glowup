import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/admin/action-button";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PageHeader, Section } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { IconPrinter, IconWhatsApp } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import {
  addressLines,
  PAYMENT_LABELS,
  parseOrderNumber,
  SHIPPING_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
  statusActions,
  tabForOrder,
  whatsappLink,
} from "@/lib/admin/orders";
import { param } from "@/lib/params";
import { MOVEMENT_LABELS, movementSign } from "@/lib/admin/stock";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDateTime, formatMoney } from "@/lib/format";

import {
  cancelOrder,
  changeOrderStatus,
  confirmTransfer,
  markReviewed,
} from "../actions";

export async function generateMetadata({
  params,
}: PageProps<"/admin/pedidos/[numero]">): Promise<Metadata> {
  const number = parseOrderNumber((await params).numero);
  return { title: number ? `Pedido ${number}` : "Pedido" };
}

const nextStepTexts: Partial<Record<string, string>> = {
  paid: "Armalo con la hoja y marcá cuando empieces a prepararlo.",
  "preparing-pickup":
    "Cuando esté listo, avisale a la clienta y marcalo como listo para retirar.",
  preparing: "Cuando lo despaches, marcalo como enviado.",
  shipped: "Cuando llegue, marcalo como entregado.",
  ready_for_pickup: "Cuando lo retire, marcalo como entregado.",
  delivered: "Entregado. Si fue un error, podés volver un paso.",
};

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/admin/pedidos/[numero]">) {
  const { supabase } = await requireAdmin();
  const number = parseOrderNumber((await params).numero);
  if (!number) notFound();
  const query = await searchParams;

  const { data: order } = await supabase
    .from("orders")
    .select(
      "*, coupons(code), shipping_zones(name, eta_text), order_items(id, parent_item_id, name_snapshot, unit_price_cents, quantity, product_variants(sku, product_id)), stock_movements(id, type, quantity, note, created_at, product_variants(color, size, products(name)))",
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
  const movements = [...order.stock_movements].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const pending = order.status === "pending_payment";
  const isTransfer = order.payment_method === "transfer";
  const inProgress = !pending && order.status !== "cancelled";
  const address = addressLines(order.shipping_address);
  const whatsapp = whatsappLink(
    order.phone,
    `Hola, te escribimos de GLOW UP por tu pedido ${order.number}.`,
  );

  const doneTexts: Record<string, string> = {
    confirmado:
      "Transferencia confirmada: el pedido pasó a pagado y se descontó el stock.",
    "confirmado-revisar":
      "Transferencia confirmada. El pedido quedó para revisar: mirá el motivo.",
    "ya-confirmado": "Ese pago ya estaba confirmado.",
    cancelado:
      "Pedido cancelado. El stock reservado volvió a estar disponible.",
    estado: `Estado actualizado: ${STATUS_LABELS[order.status].toLowerCase()}.`,
    revisado: "Listo, quedó revisado. El motivo sigue guardado en el pedido.",
  };
  const done = doneTexts[param(query.hecho)];

  return (
    <>
      <PageHeader
        title={`Pedido ${order.number}`}
        back={{
          href: `/admin/pedidos?estado=${tabForOrder(order.status, order.payment_method)}`,
          label: "Pedidos",
        }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONES[order.status]}>
              {STATUS_LABELS[order.status]}
            </Badge>
            {order.needs_review && <Badge tone="error">Para revisar</Badge>}
            <span>Hecho el {formatDateTime(order.created_at)}</span>
          </span>
        }
        actions={
          inProgress && (
            <ButtonLink
              href={`/admin/pedidos/${order.number}/hoja`}
              variant="secondary"
            >
              <IconPrinter />
              Hoja para armar
            </ButtonLink>
          )
        }
      />

      {done && (
        <Notice tone="success" className="mb-4">
          {done}
        </Notice>
      )}

      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
        <div className="flex flex-col gap-4">
          {order.needs_review && (
            <div className="flex flex-col items-start gap-3">
              <Notice tone="error" title="Para revisar" className="w-full">
                {order.review_reason ?? "No quedó registrado el motivo."}
              </Notice>
              <ActionButton
                action={markReviewed.bind(null, order.id)}
                variant="secondary"
              >
                Ya lo revisé
              </ActionButton>
            </div>
          )}

          <Section title="Qué sigue">
            {pending ? (
              <div className="flex flex-col gap-3">
                <p>
                  {isTransfer
                    ? `Esperando la transferencia de ${formatMoney(order.total_cents)}. Confirmala cuando veas el comprobante.`
                    : "Esperando el pago en Mercado Pago. Se confirma solo cuando se acredita."}
                </p>
                {order.reserved_until && (
                  <p className="text-sm">
                    La reserva vence el {formatDateTime(order.reserved_until)}.
                    Si el pago no llega, el pedido se cancela solo y el stock se
                    libera.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {isTransfer && (
                    <ConfirmAction
                      action={confirmTransfer.bind(null, order.id)}
                      variant="primary"
                      label="Confirmar transferencia"
                      question={`¿Ya viste el comprobante por ${formatMoney(order.total_cents)}? El pedido pasa a pagado y se descuenta el stock.`}
                      confirmLabel="Sí, confirmar"
                      pendingText="Confirmando…"
                    />
                  )}
                  <ConfirmAction
                    action={cancelOrder.bind(null, order.id)}
                    label="Cancelar pedido"
                    question="¿Cancelar el pedido? El stock reservado vuelve a estar disponible."
                    confirmLabel="Sí, cancelar"
                    pendingText="Cancelando…"
                  />
                </div>
              </div>
            ) : order.status === "cancelled" ? (
              <div className="flex flex-col gap-3">
                <p>
                  {isTransfer
                    ? "Pedido cancelado y reserva liberada. Si la transferencia llegó igual, confirmala: se descuenta el stock si todavía alcanza; si no, el pedido queda para revisar."
                    : "Pedido cancelado y reserva liberada. Si Mercado Pago acredita el pago igual, se confirma solo y queda para revisar si falta stock."}
                </p>
                {isTransfer && (
                  <ConfirmAction
                    action={confirmTransfer.bind(null, order.id)}
                    label="La transferencia llegó igual"
                    question={`¿Confirmar la transferencia de ${formatMoney(order.total_cents)}? El pedido pasa a pagado.`}
                    confirmLabel="Sí, confirmar"
                    pendingText="Confirmando…"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p>
                  {
                    nextStepTexts[
                      order.status === "preparing" &&
                      order.shipping_method === "pickup"
                        ? "preparing-pickup"
                        : order.status
                    ]
                  }
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  {statusActions(order.status, order.shipping_method).map(
                    (step) => (
                      <ActionButton
                        key={step.to}
                        action={changeOrderStatus.bind(null, order.id, step.to)}
                        variant={step.primary ? "primary" : "quiet"}
                      >
                        {step.label}
                      </ActionButton>
                    ),
                  )}
                </div>
              </div>
            )}
          </Section>

          <Section title="Productos">
            <ul className="divide-y divide-crema-oscuro">
              {lines.map((line) => {
                const parts = partsOf(line.id);
                const variant = line.product_variants;
                return (
                  <li
                    key={line.id}
                    className="flex justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {variant ? (
                          <Link
                            href={`/admin/productos/${variant.product_id}`}
                            className="underline underline-offset-4"
                          >
                            {line.name_snapshot}
                          </Link>
                        ) : (
                          line.name_snapshot
                        )}
                      </p>
                      <p className="text-sm">
                        {line.quantity} × {formatMoney(line.unit_price_cents)}
                        {variant?.sku && ` · ${variant.sku}`}
                      </p>
                      {parts.length > 0 && (
                        <ul className="mt-1 text-sm">
                          {parts.map((part) => (
                            <li key={part.id}>
                              Incluye {part.quantity} × {part.name_snapshot}
                              {part.product_variants?.sku &&
                                ` · ${part.product_variants.sku}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="shrink-0 font-medium">
                      {formatMoney(line.unit_price_cents * line.quantity)}
                    </p>
                  </li>
                );
              })}
            </ul>

            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-crema-oscuro pt-3">
              <dt>Subtotal</dt>
              <dd className="text-right">
                {formatMoney(order.subtotal_cents)}
              </dd>
              {order.coupon_discount_cents > 0 && (
                <>
                  <dt>Cupón {order.coupons?.code}</dt>
                  <dd className="text-right">
                    −{formatMoney(order.coupon_discount_cents)}
                  </dd>
                </>
              )}
              {order.transfer_discount_cents > 0 && (
                <>
                  <dt>Descuento por transferencia</dt>
                  <dd className="text-right">
                    −{formatMoney(order.transfer_discount_cents)}
                  </dd>
                </>
              )}
              <dt>{order.shipping_method === "pickup" ? "Retiro" : "Envío"}</dt>
              <dd className="text-right">
                {order.shipping_cents > 0
                  ? formatMoney(order.shipping_cents)
                  : order.shipping_method === "pickup"
                    ? "Sin cargo"
                    : "Gratis"}
              </dd>
              <dt className="font-display text-xl font-semibold">Total</dt>
              <dd className="text-right font-display text-xl font-semibold">
                {formatMoney(order.total_cents)}
              </dd>
            </dl>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Section title="Clienta">
            <p className="break-all">
              <a
                href={`mailto:${order.email}`}
                className="underline underline-offset-4"
              >
                {order.email}
              </a>
            </p>
            <p className="mt-1">
              <a
                href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}
                className="underline underline-offset-4"
              >
                {order.phone}
              </a>
            </p>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "mt-3 w-full")}
              >
                <IconWhatsApp />
                Escribirle por WhatsApp
              </a>
            )}
          </Section>

          <Section title="Entrega">
            <p className="font-medium">
              {SHIPPING_LABELS[order.shipping_method]}
            </p>
            {order.shipping_zones && (
              <p className="text-sm">
                {order.shipping_zones.name} · {order.shipping_zones.eta_text}
              </p>
            )}
            {address.length > 0 && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {address.map((line) => (
                  <div key={line.label} className="contents">
                    <dt>{line.label}</dt>
                    <dd className="break-words">{line.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {order.is_gift && (
              <Notice className="mt-3" title="Es para regalo">
                Caja sin precios.
                {order.gift_message && (
                  <> Mensaje para la tarjeta: “{order.gift_message}”</>
                )}
              </Notice>
            )}
          </Section>

          <Section title="Pago">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt>Medio</dt>
              <dd>{PAYMENT_LABELS[order.payment_method]}</dd>
              <dt>Pagado</dt>
              <dd>
                {order.paid_at ? formatDateTime(order.paid_at) : "Todavía no"}
              </dd>
              {order.mp_payment_id && (
                <>
                  <dt>Pago en MP</dt>
                  <dd className="break-all">{order.mp_payment_id}</dd>
                </>
              )}
            </dl>
            {!order.needs_review && order.review_reason && (
              <p className="mt-3 text-sm">Se revisó: {order.review_reason}</p>
            )}
          </Section>

          {movements.length > 0 && (
            <details className="rounded-card bg-crema-oscuro/60 p-4">
              <summary className="flex min-h-11 cursor-pointer items-center font-display text-xl font-semibold">
                Movimientos de stock
              </summary>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {movements.map((movement) => (
                  <li key={movement.id}>
                    <span className="font-medium">
                      {MOVEMENT_LABELS[movement.type]}
                    </span>{" "}
                    {movementSign(movement.type, movement.quantity)} ·{" "}
                    {movement.product_variants.products.name}{" "}
                    {movement.product_variants.color} /{" "}
                    {movement.product_variants.size}
                    <span className="block">
                      {formatDateTime(movement.created_at)}
                      {movement.note && ` · ${movement.note}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </>
  );
}

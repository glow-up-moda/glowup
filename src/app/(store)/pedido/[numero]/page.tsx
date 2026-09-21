import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderEmailForm } from "@/components/store/order-email-form";
import { PageShell } from "@/components/store/page-shell";
import { buttonClass } from "@/components/ui/button";
import { IconWhatsApp, Sparkle } from "@/components/ui/icons";
import { formatDateTime, formatMoney } from "@/lib/format";
import { rememberedOrders } from "@/lib/orders/access";
import { parseOrderNumber } from "@/lib/orders/number";
import {
  getBankDetails,
  getPublicOrder,
  type PublicOrder,
} from "@/lib/orders/public";
import { addressLines, SHIPPING_LABELS } from "@/lib/admin/orders";
import { getStoreSettings, storeWhatsappLink } from "@/lib/store/settings";

import { verifyOrderEmail } from "../actions";

export async function generateMetadata({
  params,
}: PageProps<"/pedido/[numero]">): Promise<Metadata> {
  const number = parseOrderNumber((await params).numero);
  return {
    title: number ? `Pedido ${number} · GLOW UP` : "Tu pedido · GLOW UP",
    robots: { index: false, follow: false },
  };
}

const headlines: Record<string, { title: string; text: string }> = {
  paid: {
    title: "¡Pago confirmado!",
    text: "Ya estamos preparando tu pedido. Te avisamos cuando salga.",
  },
  preparing: {
    title: "Estamos preparándolo",
    text: "Lo estamos armando con cuidado. Te avisamos cuando salga.",
  },
  shipped: {
    title: "Tu pedido salió",
    text: "Va en camino. Si necesitás una mano, escribinos.",
  },
  ready_for_pickup: {
    title: "Listo para retirar",
    text: "Podés pasar a buscarlo por nuestro punto de entrega en Paraná.",
  },
  delivered: {
    title: "Entregado",
    text: "¡Gracias por comprarnos! Si algo no salió como esperabas, escribinos.",
  },
  cancelled: {
    title: "Este pedido se canceló",
    text: "Si fue sin querer o venció el plazo para pagar, escribinos y lo armamos de nuevo.",
  },
};

function OrderItems({ order }: { order: PublicOrder }) {
  const lines = order.order_items
    .filter((item) => !item.parent_item_id)
    .sort((a, b) => a.name_snapshot.localeCompare(b.name_snapshot, "es"));
  const partsOf = (id: string) =>
    order.order_items.filter((item) => item.parent_item_id === id);

  return (
    <ul className="divide-y divide-crema-oscuro border-y border-crema-oscuro">
      {lines.map((line) => (
        <li key={line.id} className="flex justify-between gap-3 py-3">
          <span className="min-w-0">
            <span className="font-medium">
              {line.quantity} × {line.name_snapshot}
            </span>
            {partsOf(line.id).length > 0 && (
              <span className="block text-sm">
                Incluye{" "}
                {partsOf(line.id)
                  .map((part) => `${part.quantity} × ${part.name_snapshot}`)
                  .join(", ")}
              </span>
            )}
          </span>
          <span className="shrink-0">
            {formatMoney(line.unit_price_cents * line.quantity)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function OrderPage({
  params,
}: PageProps<"/pedido/[numero]">) {
  const number = parseOrderNumber((await params).numero);
  if (!number) notFound();

  // Si el pedido no se hizo en este navegador, pedimos el email antes de
  // mostrar nada: los números son correlativos (§7).
  const remembered = await rememberedOrders();
  if (!remembered.includes(number)) {
    return (
      <PageShell
        title="Ver tu pedido"
        intro={`Para mostrarte el pedido ${number}, escribí el email con el que compraste.`}
      >
        <OrderEmailForm action={verifyOrderEmail.bind(null, number)} />
      </PageShell>
    );
  }

  const [order, bank, settings] = await Promise.all([
    getPublicOrder(number),
    getBankDetails(),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const pendingTransfer =
    order.status === "pending_payment" && order.payment_method === "transfer";
  const pendingMercadoPago =
    order.status === "pending_payment" &&
    order.payment_method === "mercadopago";
  const headline = headlines[order.status];
  const address = addressLines(order.shipping_address);
  const receipt = storeWhatsappLink(
    settings.whatsappNumber,
    `¡Hola! Te mando el comprobante del pedido ${order.number} por ${formatMoney(order.total_cents)}.`,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Sparkle className="size-8 text-coral" />
        <p className="text-sm">Pedido {order.number}</p>
      </div>

      <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">
        {pendingTransfer
          ? "Reservamos tu pedido"
          : pendingMercadoPago
            ? "Estamos esperando el pago"
            : (headline?.title ?? "Tu pedido")}
      </h1>
      <p className="mt-2 max-w-[60ch]">
        {pendingTransfer
          ? "Te lo guardamos 24 horas. Apenas veamos la transferencia, lo preparamos."
          : pendingMercadoPago
            ? "Cuando Mercado Pago nos confirme el pago, esta misma página lo va a mostrar."
            : (headline?.text ?? "")}
      </p>

      {pendingTransfer && (
        <section className="mt-6 rounded-card bg-rosa p-4 md:p-6">
          <h2 className="font-display text-xl font-semibold">
            Cómo transferir
          </h2>
          <p className="mt-2">
            Transferí exactamente{" "}
            <span className="font-medium">
              {formatMoney(order.total_cents)}
            </span>{" "}
            a:
          </p>

          {bank.alias || bank.cbu ? (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {bank.alias && (
                <>
                  <dt className="font-medium">Alias</dt>
                  <dd className="break-all">{bank.alias}</dd>
                </>
              )}
              {bank.cbu && (
                <>
                  <dt className="font-medium">CBU</dt>
                  <dd className="break-all">{bank.cbu}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="mt-3">
              Escribinos por WhatsApp y te pasamos los datos para transferir.
            </p>
          )}

          {order.reserved_until && (
            <p className="mt-3 text-sm">
              Guardamos el stock hasta el {formatDateTime(order.reserved_until)}
              .
            </p>
          )}

          {receipt && (
            <a
              href={receipt}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("primary", "mt-4")}
            >
              <IconWhatsApp />
              Mandar el comprobante
            </a>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Qué pediste</h2>
        <div className="mt-3">
          <OrderItems order={order} />
        </div>

        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatMoney(order.subtotal_cents)}</dd>
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
          <dt className="mt-2 font-display text-xl font-semibold">Total</dt>
          <dd className="mt-2 text-right font-display text-xl font-semibold">
            {formatMoney(order.total_cents)}
          </dd>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Cómo lo recibís</h2>
        <p className="mt-2">
          {SHIPPING_LABELS[order.shipping_method]}
          {order.shipping_zones && ` · ${order.shipping_zones.name}`}
        </p>
        {order.shipping_zones?.eta_text && (
          <p className="text-sm">{order.shipping_zones.eta_text}</p>
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
          <p className="mt-3 rounded-card bg-crema-oscuro px-4 py-3 text-sm">
            Va como regalo, sin precios
            {order.gift_message && `, con tu mensaje: “${order.gift_message}”`}.
          </p>
        )}
        <p className="mt-3 text-sm">
          Todo viaja en embalaje discreto. Te escribimos a {order.email} en cada
          paso.
        </p>
      </section>

      <p className="mt-8 text-sm">
        ¿Necesitás una mano?{" "}
        <Link href="/contacto" className="underline underline-offset-4">
          Escribinos
        </Link>
        .
      </p>
    </div>
  );
}

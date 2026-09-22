import { Section, Text } from "@react-email/components";

import { formatMoney } from "@/lib/format";

import { colors, Rows, Subtitle } from "./layout";

// Lo que compró y cómo lo recibe, igual que en /pedido/[numero]. Lo comparten
// los emails de pedido recibido, pago aprobado y envío (§13).

export type OrderLine = {
  name: string;
  quantity: number;
  totalCents: number;
  /** Componentes, cuando la línea es un kit. */
  parts: string[];
};

export type OrderEmailData = {
  number: string;
  url: string;
  paymentMethod: "card" | "transfer";
  shippingMethod: "delivery" | "same_day" | "pickup";
  shippingLabel: string;
  zoneName: string | null;
  etaText: string | null;
  address: { label: string; value: string }[];
  isGift: boolean;
  giftMessage: string | null;
  lines: OrderLine[];
  subtotalCents: number;
  couponCode: string | null;
  couponDiscountCents: number;
  transferDiscountCents: number;
  shippingCents: number;
  totalCents: number;
  reservedUntil: string | null;
};

export function OrderSummary({ order }: { order: OrderEmailData }) {
  const totals = [
    { label: "Subtotal", value: formatMoney(order.subtotalCents) },
    ...(order.couponDiscountCents > 0
      ? [
          {
            label: `Cupón ${order.couponCode ?? ""}`.trim(),
            value: `−${formatMoney(order.couponDiscountCents)}`,
          },
        ]
      : []),
    ...(order.transferDiscountCents > 0
      ? [
          {
            label: "Descuento por transferencia",
            value: `−${formatMoney(order.transferDiscountCents)}`,
          },
        ]
      : []),
    {
      label: order.shippingMethod === "pickup" ? "Retiro" : "Envío",
      value:
        order.shippingCents > 0
          ? formatMoney(order.shippingCents)
          : order.shippingMethod === "pickup"
            ? "Sin cargo"
            : "Gratis",
    },
    { label: "Total", value: formatMoney(order.totalCents) },
  ];

  return (
    <>
      <Subtitle>Qué pediste</Subtitle>
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse", width: "100%" }}
      >
        <tbody>
          {order.lines.map((line, index) => (
            <tr key={`${line.name}-${index}`}>
              <td
                style={{
                  borderTop: `1px solid ${colors.cremaOscuro}`,
                  padding: "10px 0",
                }}
              >
                <span style={{ fontWeight: 500 }}>
                  {line.quantity} × {line.name}
                </span>
                {line.parts.length > 0 && (
                  <span
                    style={{ display: "block", fontSize: "14px" }}
                  >{`Incluye ${line.parts.join(", ")}`}</span>
                )}
              </td>
              <td
                style={{
                  borderTop: `1px solid ${colors.cremaOscuro}`,
                  padding: "10px 0",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                {formatMoney(line.totalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Section style={{ marginTop: "16px" }}>
        <Rows rows={totals} strongLast />
      </Section>

      <Subtitle>Cómo lo recibís</Subtitle>
      <Text style={{ margin: "0 0 8px" }}>
        {order.shippingLabel}
        {order.zoneName ? ` · ${order.zoneName}` : ""}
        {order.etaText ? (
          <span style={{ display: "block", fontSize: "14px" }}>
            {order.etaText}
          </span>
        ) : null}
      </Text>

      {order.address.length > 0 && (
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: "collapse", fontSize: "14px" }}
        >
          <tbody>
            {order.address.map((row) => (
              <tr key={row.label}>
                <td style={{ paddingRight: "12px", verticalAlign: "top" }}>
                  {row.label}
                </td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {order.isGift && (
        <Text style={{ fontSize: "14px", margin: "12px 0 0" }}>
          Va como regalo, sin precios
          {order.giftMessage ? `, con tu mensaje: “${order.giftMessage}”` : ""}.
        </Text>
      )}

      <Text style={{ fontSize: "14px", margin: "12px 0 0" }}>
        Todo viaja en embalaje discreto: desde afuera no se ve qué hay adentro.
      </Text>
    </>
  );
}

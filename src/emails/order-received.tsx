import { formatDateTime, formatMoney } from "@/lib/format";

import {
  Button,
  EmailLayout,
  Panel,
  Paragraph,
  Rows,
  Small,
  Subtitle,
  Title,
} from "./layout";
import { OrderSummary, type OrderEmailData } from "./order-summary";

// Pedido recibido (§13). Con transferencia lleva los datos para pagar, porque
// es el paso que falta; con tarjeta solo confirma que quedó tomado.

export type OrderReceivedProps = {
  order: OrderEmailData;
  bank: { alias: string | null; cbu: string | null };
};

export function subject(props: OrderReceivedProps): string {
  return `Tu pedido ${props.order.number} · GLOW UP`;
}

export default function OrderReceived({ order, bank }: OrderReceivedProps) {
  const transfer = order.paymentMethod === "transfer";
  const bankRows = [
    ...(bank.alias ? [{ label: "Alias", value: bank.alias }] : []),
    ...(bank.cbu ? [{ label: "CBU", value: bank.cbu }] : []),
    { label: "Monto", value: formatMoney(order.totalCents) },
  ];

  return (
    <EmailLayout
      preview={
        transfer
          ? `Reservamos tu pedido ${order.number}. Te contamos cómo transferir.`
          : `Tomamos tu pedido ${order.number}.`
      }
    >
      <Title>{transfer ? "Reservamos tu pedido" : "Recibimos tu pedido"}</Title>
      <Paragraph>
        {transfer
          ? "Te lo guardamos 24 horas. Apenas veamos la transferencia lo preparamos y te avisamos."
          : "Cuando se acredite el pago te escribimos y empezamos a prepararlo."}
      </Paragraph>

      {transfer && (
        <Panel>
          <Subtitle>Cómo transferir</Subtitle>
          {bank.alias || bank.cbu ? (
            <Rows rows={bankRows} />
          ) : (
            <Paragraph>
              Escribinos por WhatsApp y te pasamos los datos para transferir.
            </Paragraph>
          )}
          {order.reservedUntil && (
            <Small>
              Guardamos el stock hasta el {formatDateTime(order.reservedUntil)}.
            </Small>
          )}
        </Panel>
      )}

      <Button href={order.url}>
        {transfer ? "Ver el pedido y mandar el comprobante" : "Ver mi pedido"}
      </Button>

      <OrderSummary order={order} />
    </EmailLayout>
  );
}

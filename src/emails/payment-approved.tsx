import { Button, EmailLayout, Paragraph, Title } from "./layout";
import { OrderSummary, type OrderEmailData } from "./order-summary";

// Pago aprobado (§13): vale igual para la tarjeta y para la transferencia
// confirmada a mano desde el panel.

export type PaymentApprovedProps = { order: OrderEmailData };

export function subject({ order }: PaymentApprovedProps): string {
  return `Confirmamos el pago de tu pedido ${order.number} · GLOW UP`;
}

export default function PaymentApproved({ order }: PaymentApprovedProps) {
  return (
    <EmailLayout preview={`Ya cobramos tu pedido ${order.number}.`}>
      <Title>¡Pago confirmado!</Title>
      <Paragraph>
        Ya estamos preparando tu pedido {order.number}. Te avisamos apenas{" "}
        {order.shippingMethod === "pickup"
          ? "esté listo para retirar"
          : "salga"}
        .
      </Paragraph>

      <Button href={order.url}>Ver mi pedido</Button>

      <OrderSummary order={order} />
    </EmailLayout>
  );
}

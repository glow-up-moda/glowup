import { Button, EmailLayout, Paragraph, Title } from "./layout";
import { OrderSummary, type OrderEmailData } from "./order-summary";

// Pedido enviado o listo para retirar (§13).

export type OrderShippedProps = { order: OrderEmailData; pickup: boolean };

export function subject({ order, pickup }: OrderShippedProps): string {
  return pickup
    ? `Tu pedido ${order.number} está listo para retirar · GLOW UP`
    : `Tu pedido ${order.number} salió · GLOW UP`;
}

export default function OrderShipped({ order, pickup }: OrderShippedProps) {
  return (
    <EmailLayout
      preview={
        pickup
          ? `Podés pasar a buscar el pedido ${order.number}.`
          : `El pedido ${order.number} va en camino.`
      }
    >
      <Title>{pickup ? "Listo para retirar" : "Tu pedido salió"}</Title>
      <Paragraph>
        {pickup
          ? "Podés pasar a buscarlo por nuestro punto de entrega en Paraná. Si necesitás coordinar un horario, escribinos."
          : "Va en camino. Si necesitás una mano con la entrega, escribinos."}
      </Paragraph>

      <Button href={order.url}>Ver mi pedido</Button>

      <OrderSummary order={order} />
    </EmailLayout>
  );
}

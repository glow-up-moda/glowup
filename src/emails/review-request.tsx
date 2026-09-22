import { Button, EmailLayout, Paragraph, Small, Title } from "./layout";

// Pedido de reseña, unos días después de la entrega (§13).

export type ReviewRequestProps = {
  number: string;
  productNames: string[];
  url: string;
};

export function subject(): string {
  return "¿Cómo te quedó? · GLOW UP";
}

export default function ReviewRequest({
  number,
  productNames,
  url,
}: ReviewRequestProps) {
  const what =
    productNames.length === 1
      ? productNames[0]
      : productNames.slice(0, -1).join(", ") +
        " y " +
        productNames[productNames.length - 1];

  return (
    <EmailLayout preview="Contanos cómo te quedó lo que compraste.">
      <Title>¿Cómo te quedó?</Title>
      <Paragraph>
        Hace unos días te llegó el pedido {number}
        {what ? `, con ${what}` : ""}. Si tenés un minuto, contanos qué tal:
        ayuda un montón a quien está eligiendo talle.
      </Paragraph>

      <Button href={url}>Dejar mi reseña</Button>

      <Small>
        Si algo no salió como esperabas, respondé este email y lo resolvemos.
      </Small>
    </EmailLayout>
  );
}

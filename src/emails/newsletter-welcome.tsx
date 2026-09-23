import {
  Button,
  colors,
  EmailLayout,
  Panel,
  Paragraph,
  Small,
  Title,
} from "./layout";

// Bienvenida al newsletter, con el cupón de primera compra (§7, inicio).

export type NewsletterWelcomeProps = {
  couponCode: string | null;
  url: string;
  unsubscribeUrl: string;
};

export function subject({ couponCode }: NewsletterWelcomeProps): string {
  return couponCode
    ? "Tu descuento de primera compra · GLOW UP"
    : "Bienvenida a GLOW UP";
}

export default function NewsletterWelcome({
  couponCode,
  url,
  unsubscribeUrl,
}: NewsletterWelcomeProps) {
  return (
    <EmailLayout
      preview={
        couponCode
          ? "Tu código para la primera compra está acá adentro."
          : "Gracias por sumarte."
      }
      footer="marketing"
    >
      <Title>¡Bienvenida!</Title>
      <Paragraph>
        Te vamos a escribir cuando entre algo nuevo o haya una promo. Sin
        llenarte la casilla.
      </Paragraph>

      {couponCode && (
        <Panel>
          <Paragraph>Tu código para la primera compra:</Paragraph>
          <p
            style={{
              fontFamily:
                '"Fredoka", "Trebuchet MS", "Segoe UI", Verdana, sans-serif',
              fontSize: "25px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              margin: "8px 0 0",
            }}
          >
            {couponCode}
          </p>
          <Small>Se escribe en el checkout, en el paso del cupón.</Small>
        </Panel>
      )}

      <Button href={url}>Ver la colección</Button>

      <Small>
        Te escribimos porque pediste recibir novedades. Si te arrepentiste,{" "}
        <a href={unsubscribeUrl} style={{ color: colors.chocolate }}>
          date de baja acá
        </a>
        .
      </Small>
    </EmailLayout>
  );
}

import { formatMoney } from "@/lib/format";

import { colors, Button, EmailLayout, Paragraph, Small, Title } from "./layout";

// Carrito abandonado (§13). Solo se manda a quien dejó su email y aceptó
// recibir novedades (§15): el pie lo dice y lleva el link para darse de baja.

export type AbandonedCartProps = {
  lines: { name: string; quantity: number; totalCents: number }[];
  totalCents: number;
  url: string;
  unsubscribeUrl: string;
};

export function subject(): string {
  return "Te quedó algo en la bolsa · GLOW UP";
}

export default function AbandonedCart({
  lines,
  totalCents,
  url,
  unsubscribeUrl,
}: AbandonedCartProps) {
  return (
    <EmailLayout preview="Guardamos lo que estabas mirando." footer="marketing">
      <Title>Te quedó algo en la bolsa</Title>
      <Paragraph>
        Guardamos lo que estabas mirando. Los precios y los talles se actualizan
        solos cuando entrás.
      </Paragraph>

      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse", width: "100%" }}
      >
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.name}-${index}`}>
              <td
                style={{
                  borderTop: `1px solid ${colors.cremaOscuro}`,
                  padding: "10px 0",
                }}
              >
                {line.quantity} × {line.name}
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

      <Paragraph>
        <strong>Total aproximado: {formatMoney(totalCents)}</strong>
      </Paragraph>

      <Button href={url}>Volver a mi bolsa</Button>

      <Small>
        Te escribimos porque nos dejaste tu email y aceptaste recibir novedades.
        Si no querés más estos avisos,{" "}
        <a href={unsubscribeUrl} style={{ color: colors.chocolate }}>
          date de baja acá
        </a>
        .
      </Small>
    </EmailLayout>
  );
}

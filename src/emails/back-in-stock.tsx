import { formatMoney } from "@/lib/format";

import { Button, EmailLayout, Paragraph, Small, Title } from "./layout";

// "Volvió tu talle" (§9.10): se manda al reponer una variante que tenía avisos
// pendientes. No promete stock: el aviso viaja y el talle se puede agotar de
// nuevo mientras la clienta lo lee.

export type BackInStockProps = {
  productName: string;
  color: string | null;
  size: string | null;
  priceCents: number;
  url: string;
};

export function subject({ productName }: BackInStockProps): string {
  return `Volvió ${productName} · GLOW UP`;
}

export default function BackInStock({
  productName,
  color,
  size,
  priceCents,
  url,
}: BackInStockProps) {
  const detail = [color, size && `talle ${size}`].filter(Boolean).join(" · ");

  return (
    <EmailLayout preview={`Volvió ${productName}. Te lo guardamos un ratito.`}>
      <Title>Volvió tu talle</Title>
      <Paragraph>
        Repusimos <strong>{productName}</strong>
        {detail ? ` (${detail})` : ""}. Está otra vez en la tienda a{" "}
        {formatMoney(priceCents)}.
      </Paragraph>

      <Button href={url}>Verlo en la tienda</Button>

      <Small>
        Nos pediste que te avisáramos por este talle. Se vende rápido, así que
        si lo querés, no lo dejes para mañana.
      </Small>
    </EmailLayout>
  );
}

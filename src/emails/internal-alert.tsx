import { Button, EmailLayout, Panel, Paragraph, Rows, Title } from "./layout";

// Avisos internos (§13): stock bajo, pedido para revisar y transferencia
// pendiente. Van al mail de la tienda, no a una clienta, así que el pie es
// otro y el link entra al panel.

export type InternalAlertProps = {
  title: string;
  lead: string;
  rows: { label: string; value: string }[];
  action: { label: string; url: string };
  tone?: "rosa" | "error";
};

export function subject({ title }: InternalAlertProps): string {
  return `${title} · GLOW UP`;
}

export default function InternalAlert({
  title,
  lead,
  rows,
  action,
  tone = "rosa",
}: InternalAlertProps) {
  return (
    <EmailLayout preview={lead} footer="internal">
      <Title>{title}</Title>
      <Paragraph>{lead}</Paragraph>

      {rows.length > 0 && (
        <Panel tone={tone}>
          <Rows rows={rows} />
        </Panel>
      )}

      <Button href={action.url}>{action.label}</Button>
    </EmailLayout>
  );
}

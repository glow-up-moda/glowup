import type { Metadata } from "next";

import { Block, PageShell } from "@/components/store/page-shell";

// Reducida a pedido de la dueña el 7 de octubre de 2026: quedan qué datos se
// piden y para qué. Se sacaron los apartados de con quién se comparten,
// medición, cuánto se guardan y qué puede hacer la clienta, y también el
// cartel de borrador, que términos y arrepentimiento sí conservan (§15).

export const metadata: Metadata = {
  title: "Privacidad · MAREA",
  description: "Qué datos pedimos y para qué los usamos.",
};

export default function PrivacyPage() {
  return (
    <PageShell title="Privacidad">
      <Block title="Qué datos pedimos">
        <p>
          Para vender y entregar un pedido necesitamos tu email, tu teléfono de
          WhatsApp, tu nombre y, si elegís envío, tu dirección. Guardamos
          también qué compraste, cuánto pagaste y cómo.
        </p>
        <p>
          <strong>No guardamos datos de tarjetas.</strong> Los ingresás en el
          formulario de Ualá Bis; a nosotras nos llega solamente si el pago se
          aprobó.
        </p>
      </Block>

      <Block title="Para qué los usamos">
        <p>
          Para preparar y enviar tu pedido, escribirte sobre él, atender un
          cambio o un reclamo, y cumplir con lo que exige la ley (facturación,
          por ejemplo).
        </p>
        <p>
          Novedades y promociones solo si las pediste. Lo mismo el recordatorio
          de lo que dejaste en la bolsa: se manda únicamente si dejaste tu email
          y marcaste que querés recibirlas, y cada uno de esos emails trae el
          link para darte de baja.
        </p>
      </Block>
    </PageShell>
  );
}

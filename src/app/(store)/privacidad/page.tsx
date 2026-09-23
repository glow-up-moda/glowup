import type { Metadata } from "next";
import Link from "next/link";

import { LegalDraft } from "@/components/store/legal-draft";
import { Block, PageShell } from "@/components/store/page-shell";

// Borrador (§15). Nombra de verdad a quién le pasan los datos, porque es lo
// que una clienta necesita saber y lo que exige la Ley 25.326.

export const metadata: Metadata = {
  title: "Privacidad · GLOW UP",
  description: "Qué datos pedimos, para qué y qué podés hacer con ellos.",
};

const link = "underline underline-offset-4";

export default function PrivacyPage() {
  return (
    <PageShell title="Privacidad">
      <LegalDraft />

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

      <Block title="Con quién los compartimos">
        <p>
          Con quienes hacen falta para que la tienda funcione, y solo para eso:
        </p>
        <ul className="list-disc pl-5">
          <li>Supabase, que guarda la base de datos y las fotos.</li>
          <li>Netlify, donde corre el sitio.</li>
          <li>Ualá Bis, que procesa los pagos con tarjeta.</li>
          <li>Resend, que envía los emails.</li>
          <li>El correo o el servicio de mensajería que lleva tu pedido.</li>
          <li>
            Meta y Google, que miden cómo se usa la tienda (ver más abajo).
          </li>
        </ul>
        <p>
          Algunos de estos servicios están fuera del país. No vendemos ni
          cedemos tus datos a nadie más.
        </p>
      </Block>

      <Block title="Medición">
        <p>
          Usamos Meta Pixel y Google Analytics para saber qué se mira y qué se
          compra. Guardan una cookie en tu navegador. Podés bloquearlas desde la
          configuración del navegador: la tienda funciona igual.
        </p>
      </Block>

      <Block title="Cuánto tiempo los guardamos">
        <p>
          Los datos de un pedido, mientras la ley nos obliga a conservarlos. El
          email de quien se anotó a novedades, hasta que se dé de baja. La copia
          de una bolsa que quedó sin comprar se borra a los 30 días.
        </p>
      </Block>

      <Block title="Qué podés hacer">
        <p>
          Podés pedirnos acceso a tus datos, corregirlos o que los borremos:
          escribinos desde{" "}
          <Link href="/contacto" className={link}>
            contacto
          </Link>
          . El titular de los datos personales tiene la facultad de ejercer el
          derecho de acceso a ellos en forma gratuita a intervalos no inferiores
          a seis meses, salvo que acredite un interés legítimo, según el
          artículo 14 de la Ley 25.326.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública, órgano de control de la
          Ley 25.326, tiene la atribución de atender las denuncias y reclamos
          que se interpongan con relación al incumplimiento de las normas sobre
          protección de datos personales.
        </p>
      </Block>
    </PageShell>
  );
}

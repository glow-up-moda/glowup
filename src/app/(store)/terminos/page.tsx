import type { Metadata } from "next";
import Link from "next/link";

import { LegalDraft } from "@/components/store/legal-draft";
import { Block, PageShell } from "@/components/store/page-shell";

// Borrador (§15). Los datos de la empresa quedan como huecos a completar: no
// se inventan un CUIT ni una razón social.

export const metadata: Metadata = {
  title: "Términos y condiciones · GLOW UP",
  description: "Condiciones de compra en GLOW UP.",
};

const link = "underline underline-offset-4";

export default function TermsPage() {
  return (
    <PageShell title="Términos y condiciones">
      <LegalDraft />

      <Block title="Quiénes somos">
        <p>
          GLOW UP es una tienda de ropa interior y accesorios con base en
          Paraná, Entre Ríos, Argentina. Los datos de la empresa (razón social,
          CUIT y domicilio) se publican acá antes del lanzamiento.
        </p>
        <p>
          Comprar en la tienda implica aceptar estos términos. Si algo no te
          cierra, escribinos antes de comprar.
        </p>
      </Block>

      <Block title="Precios y disponibilidad">
        <p>
          Los precios están en pesos argentinos e incluyen IVA. Pueden cambiar
          sin aviso, pero nunca después de que confirmes un pedido: el precio
          que vale es el que viste al comprar.
        </p>
        <p>
          Mostramos el stock que tenemos. Si algo se agota entre que lo sumás a
          la bolsa y pagás, te avisamos y te devolvemos el dinero de ese
          producto.
        </p>
      </Block>

      <Block title="Cómo se paga">
        <p>
          Con tarjeta de crédito o débito a través de Ualá Bis, o por
          transferencia bancaria. Con transferencia hay un descuento y te
          guardamos el stock 24 horas hasta que la hagas.
        </p>
        <p>
          No guardamos datos de tarjetas: los ingresás en el formulario de Ualá
          Bis, no en nuestro sitio.
        </p>
      </Block>

      <Block title="Envíos y entregas">
        <p>
          Los costos, las zonas y los plazos están en{" "}
          <Link href="/envios-y-cambios" className={link}>
            envíos y cambios
          </Link>
          . Los plazos son estimados y se cuentan en días hábiles desde que
          despachamos.
        </p>
        <p>
          Todo viaja en embalaje discreto. Si te lo entregan dañado o abierto,
          escribinos el mismo día.
        </p>
      </Block>

      <Block title="Botón de arrepentimiento">
        <p>
          Podés arrepentirte de la compra dentro de los 10 días corridos de
          recibirla, sin dar explicaciones y sin costo, como dice el artículo 34
          de la Ley 24.240 de Defensa del Consumidor. Los gastos de devolución
          los pagamos nosotras.
        </p>
        <p>
          Se hace desde el{" "}
          <Link href="/arrepentimiento" className={link}>
            botón de arrepentimiento
          </Link>
          . El producto tiene que volver sin usar y con su etiqueta.
        </p>
      </Block>

      <Block title="Cambios">
        <p>
          Además del arrepentimiento, aceptamos cambios de talle o de color
          dentro de los 15 días, con el producto sin usar y con su etiqueta.
        </p>
        <p>
          Por razones de higiene, las bombachas y los trajes de baño no se
          cambian ni se devuelven, salvo que tengan una falla. Es una excepción
          que la ley permite y que está avisada antes de comprar, en cada
          producto y en{" "}
          <Link href="/envios-y-cambios" className={link}>
            envíos y cambios
          </Link>
          .
        </p>
      </Block>

      <Block title="Fallas">
        <p>
          Si un producto viene fallado, escribinos con fotos dentro de los 30
          días de recibirlo y lo cambiamos o te devolvemos la plata. La garantía
          legal no cubre el desgaste por uso.
        </p>
      </Block>

      <Block title="Cupones">
        <p>
          Cada cupón tiene su vigencia, su mínimo de compra y su cantidad de
          usos. No se acumulan entre sí ni con el descuento por transferencia,
          salvo que digamos lo contrario.
        </p>
      </Block>

      <Block title="Tus datos">
        <p>
          Cómo tratamos tus datos está en{" "}
          <Link href="/privacidad" className={link}>
            privacidad
          </Link>
          .
        </p>
      </Block>

      <Block title="Reclamos">
        <p>
          Escribinos primero a nosotras:{" "}
          <Link href="/contacto" className={link}>
            contacto
          </Link>
          . También podés hacer un reclamo ante{" "}
          <a
            href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario"
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            Defensa del Consumidor
          </a>
          .
        </p>
        <p>
          Para cualquier cuestión judicial se aplican las leyes argentinas y son
          competentes los tribunales de Paraná, Entre Ríos.
        </p>
      </Block>
    </PageShell>
  );
}

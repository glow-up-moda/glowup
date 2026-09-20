import type { Metadata } from "next";

import { Block, PageShell } from "@/components/store/page-shell";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Nosotras · GLOW UP",
  description:
    "Somos GLOW UP, una tienda de ropa interior y accesorios de Paraná, Entre Ríos.",
};

export default function AboutPage() {
  return (
    <PageShell
      title="Nosotras"
      intro="GLOW UP es una tienda de ropa interior y accesorios de Paraná, Entre Ríos."
    >
      <Block title="Qué hacemos">
        <p>
          Elegimos prendas cómodas, de telas suaves y en talles reales, para
          usar todos los días. Cada producto lo probamos antes de sumarlo a la
          tienda: si no nos lo pondríamos nosotras, no va.
        </p>
      </Block>

      <Block title="Cómo trabajamos">
        <p>
          Preparamos cada pedido a mano, en Paraná. En Paraná y Oro Verde lo
          llevamos en el día; al resto del país lo despachamos apenas se
          confirma el pago.
        </p>
        <p>
          Todo viaja en embalaje discreto, sin marcas ni referencias al
          contenido, y si es un regalo lo preparamos sin precios y con tu
          mensaje en una tarjeta.
        </p>
      </Block>

      <Block title="Escribinos">
        <p>
          Nos podés preguntar lo que quieras: talles, telas, cuándo vuelve algo
          que se agotó o cómo hacer un cambio. Contestamos nosotras mismas.
        </p>
        <ButtonLink
          href="/contacto"
          variant="secondary"
          className="mt-2 self-start"
        >
          Ir a contacto
        </ButtonLink>
      </Block>
    </PageShell>
  );
}

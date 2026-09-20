import type { Metadata } from "next";
import Link from "next/link";

import { Block, PageShell } from "@/components/store/page-shell";
import { formatMoney } from "@/lib/format";
import { getStoreSettings } from "@/lib/store/settings";

export const metadata: Metadata = {
  title: "Preguntas frecuentes · GLOW UP",
  description:
    "Envíos, cambios, medios de pago y talles: lo que más nos preguntan.",
};

export default async function FaqPage() {
  const settings = await getStoreSettings();

  return (
    <PageShell
      title="Preguntas frecuentes"
      intro="Si no encontrás lo que buscás, escribinos y te respondemos."
    >
      <Block title="¿Cuánto tarda en llegar?">
        <p>
          En Paraná y Oro Verde hacemos envíos en el día
          {settings.sameDayCutoffTime
            ? ` para los pedidos que entran antes de las ${settings.sameDayCutoffTime}`
            : ""}
          . Al resto del país, el plazo depende de la zona: lo vas a ver en el
          checkout antes de pagar.
        </p>
      </Block>

      <Block title="¿Cuánto cuesta el envío?">
        <p>
          El costo depende de la zona y se calcula en el checkout.
          {settings.freeShippingThresholdCents
            ? ` Desde ${formatMoney(settings.freeShippingThresholdCents)} el envío es gratis.`
            : ""}{" "}
          También podés retirar sin cargo en Paraná.
        </p>
      </Block>

      <Block title="¿Cómo puedo pagar?">
        <p>
          Con Mercado Pago (tarjeta de débito, crédito o dinero en cuenta) o por
          transferencia bancaria
          {settings.transferDiscountPercent > 0
            ? `, que tiene ${settings.transferDiscountPercent}% de descuento`
            : ""}
          . Si elegís transferencia, te mostramos los datos al terminar la
          compra y guardamos tu pedido 24 horas.
        </p>
      </Block>

      <Block title="¿El paquete dice qué hay adentro?">
        <p>
          No. Todo viaja en embalaje discreto: desde afuera no se ve ni la marca
          ni el contenido.
        </p>
      </Block>

      <Block title="¿Puedo cambiar un talle?">
        <p>
          Sí, dentro de los 15 días, con la prenda sin uso y con su etiqueta.
          Por higiene, las bombachas no se cambian: mirá la{" "}
          <Link href="/guia-de-talles" className="underline underline-offset-4">
            guía de talles
          </Link>{" "}
          antes de comprar, y si tenés dudas escribinos.
        </p>
      </Block>

      <Block title="¿Cómo sigo mi pedido?">
        <p>
          Te escribimos por email en cada paso. Si necesitás una mano, mandanos
          el número de pedido por WhatsApp y lo miramos juntas.
        </p>
      </Block>
    </PageShell>
  );
}

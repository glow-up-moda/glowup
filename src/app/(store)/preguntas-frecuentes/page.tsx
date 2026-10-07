import { SAME_DAY_CITIES } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

import { Block, PageShell } from "@/components/store/page-shell";
import { formatMoney } from "@/lib/format";
import { getStoreSettings } from "@/lib/store/settings";

export const metadata: Metadata = {
  title: "Preguntas frecuentes · MAREA",
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
          En {SAME_DAY_CITIES} hacemos envíos en el día
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
          Con tarjeta de crédito, débito o prepaga (el pago lo procesa Ualá Bis)
          o por transferencia bancaria. Si elegís transferencia, te mostramos
          los datos al terminar la compra y guardamos tu pedido 24 horas.
        </p>
      </Block>

      <Block title="¿Puedo cambiar un talle?">
        <p>
          Sí, dentro de las 48 hs, con la prenda sin uso y con su etiqueta. Por
          higiene, la ropa interior y las mallas no se cambian: mirá la{" "}
          <Link href="/guia-de-talles" className="underline underline-offset-4">
            guía de talles
          </Link>{" "}
          antes de comprar, y si tenés dudas escribinos.
        </p>
      </Block>
    </PageShell>
  );
}

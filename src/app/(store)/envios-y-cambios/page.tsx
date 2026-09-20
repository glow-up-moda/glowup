import type { Metadata } from "next";

import { Block, PageShell } from "@/components/store/page-shell";
import { formatMoney } from "@/lib/format";
import { getStoreSettings } from "@/lib/store/settings";
import { createCatalogClient } from "@/lib/supabase/catalog";

export const metadata: Metadata = {
  title: "Envíos y cambios · GLOW UP",
  description:
    "Zonas, costos y plazos de envío, retiro en Paraná, embalaje discreto y cómo hacer un cambio.",
};

export default async function ShippingPage() {
  const supabase = createCatalogClient();
  const [{ data: zones }, settings] = await Promise.all([
    supabase
      .from("shipping_zones")
      .select("id, name, price_cents, eta_text, same_day")
      .order("price_cents"),
    getStoreSettings(),
  ]);

  return (
    <PageShell
      title="Envíos y cambios"
      intro="Enviamos a todo el país. En Paraná y Oro Verde llegamos en el día."
    >
      <Block title="Zonas y costos">
        {settings.freeShippingThresholdCents && (
          <p>
            Desde {formatMoney(settings.freeShippingThresholdCents)} el envío es
            gratis, en cualquier zona.
          </p>
        )}
        {zones && zones.length > 0 ? (
          <ul className="mt-2 divide-y divide-crema-oscuro border-y border-crema-oscuro">
            {zones.map((zone) => (
              <li
                key={zone.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <span>
                  <span className="font-medium">{zone.name}</span>
                  <span className="block text-sm">{zone.eta_text}</span>
                </span>
                <span className="font-medium">
                  {zone.price_cents === 0
                    ? "Sin cargo"
                    : formatMoney(zone.price_cents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Estamos terminando de definir las zonas. Escribinos y te contamos.
          </p>
        )}
        <p className="text-sm">
          El costo exacto lo vas a ver en el checkout, antes de pagar.
        </p>
      </Block>

      <Block title="Envío en el día">
        <p>
          En Paraná y Oro Verde entregamos el mismo día
          {settings.sameDayCutoffTime
            ? ` si comprás antes de las ${settings.sameDayCutoffTime}`
            : ""}
          . Después de esa hora, sale al día siguiente.
        </p>
      </Block>

      <Block title="Retiro">
        <p>
          Podés retirar sin cargo en nuestro punto de entrega en Paraná. Te
          avisamos por email y por WhatsApp cuando tu pedido esté listo.
        </p>
      </Block>

      <Block title="Embalaje discreto">
        <p>
          Todo viaja en un paquete neutro: desde afuera no se ve la marca ni qué
          hay adentro. Si es un regalo, podés pedir la caja sin precios y una
          tarjeta con tu mensaje al hacer el pedido.
        </p>
      </Block>

      <Block title="Cambios">
        <p>
          Tenés 15 días desde que recibís el pedido para cambiar una prenda sin
          uso, con su etiqueta y en su empaque original.
        </p>
        <p>
          Por razones de higiene, las bombachas y los trajes de baño no tienen
          cambio. Los corpiños, bodies, accesorios y toallones sí.
        </p>
        <p>
          Escribinos por WhatsApp con el número de pedido y coordinamos. Si el
          cambio es por una falla nuestra, el envío lo pagamos nosotras.
        </p>
      </Block>
    </PageShell>
  );
}

import type { Metadata } from "next";

import { CheckoutForm } from "@/components/store/checkout-form";
import { getStoreSettings, isSameDayOpen } from "@/lib/store/settings";
import { createCatalogClient } from "@/lib/supabase/catalog";

export const metadata: Metadata = {
  title: "Checkout · MAREA",
  description: "Terminá tu compra en MAREA.",
};

/**
 * Sin caché: el checkout decide si todavía se puede pedir envío en el día
 * comparando con la hora de Argentina (§12). Guardado, seguiría ofreciéndolo
 * pasado el horario de corte y la base terminaría rechazando el pedido con
 * same_day_closed.
 */
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = createCatalogClient();
  const [{ data: zones }, settings] = await Promise.all([
    supabase
      .from("shipping_zones")
      .select(
        "id, name, price_cents, eta_text, same_day, provinces, postal_codes",
      )
      .order("price_cents"),
    getStoreSettings(),
  ]);

  return (
    <CheckoutForm
      zones={zones ?? []}
      sameDayCutoffTime={settings.sameDayCutoffTime}
      sameDayOpen={isSameDayOpen(settings.sameDayCutoffTime)}
      pickup={{
        address: settings.pickupAddress,
        hours: settings.pickupHours,
      }}
    />
  );
}

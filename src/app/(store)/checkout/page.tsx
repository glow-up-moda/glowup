import type { Metadata } from "next";

import { CheckoutForm } from "@/components/store/checkout-form";
import { getStoreSettings, isSameDayOpen } from "@/lib/store/settings";
import { createCatalogClient } from "@/lib/supabase/catalog";

export const metadata: Metadata = {
  title: "Checkout · GLOW UP",
  description: "Terminá tu compra en GLOW UP.",
};

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
      transferDiscountPercent={settings.transferDiscountPercent}
      sameDayCutoffTime={settings.sameDayCutoffTime}
      sameDayOpen={isSameDayOpen(settings.sameDayCutoffTime)}
      pickup={{
        address: settings.pickupAddress,
        hours: settings.pickupHours,
      }}
    />
  );
}

import type { Metadata } from "next";

import { AddToCartButton } from "@/components/store/add-to-cart";
import { ProductImage } from "@/components/store/product-image";
import { Badge } from "@/components/ui/badge";
import { formatMoney, variantText } from "@/lib/format";
import { listKits } from "@/lib/store/catalog";
import { getStoreSettings } from "@/lib/store/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { kitsLabel } = await getStoreSettings();
  return {
    title: `${kitsLabel} · MAREA`,
    description:
      "Combos armados, a un precio mejor que comprando cada cosa por separado.",
  };
}

export default async function KitsPage() {
  const [kits, settings] = await Promise.all([listKits(), getStoreSettings()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold md:text-3xl">
        {settings.kitsLabel}
      </h1>
      <p className="mt-2 max-w-[60ch]">
        Combos armados por nosotras: salen mejor que comprando cada cosa por
        separado y llegan listos para regalar.
      </p>

      {kits.length === 0 ? (
        <p className="mt-6 rounded-card bg-arena/60 px-4 py-6">
          Todavía no hay kits armados. Volvé en unos días.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-8">
          {kits.map((kit) => {
            const onSale =
              kit.compareAtPriceCents != null &&
              kit.compareAtPriceCents > kit.priceCents;
            return (
              <li
                key={kit.id}
                id={kit.slug}
                className="grid gap-5 rounded-card bg-arena/40 p-4 sm:grid-cols-[14rem_1fr] sm:p-6"
              >
                <span className="relative block aspect-4/5 overflow-hidden rounded-card bg-arena">
                  <ProductImage
                    images={kit.images}
                    sizes="(min-width: 640px) 14rem, 90vw"
                  />
                </span>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">
                      {kit.name}
                    </h2>
                    {onSale && <Badge tone="offer">Oferta</Badge>}
                    {!kit.isAvailable ? (
                      <Badge>Sin stock</Badge>
                    ) : (
                      kit.isLastUnits && (
                        <Badge tone="accent">Últimas unidades</Badge>
                      )
                    )}
                  </div>

                  <p className="mt-2 flex flex-wrap items-baseline gap-2">
                    <span
                      className={`font-display text-xl font-semibold ${onSale ? "text-caracola" : ""}`}
                    >
                      {formatMoney(kit.priceCents)}
                    </span>
                    {onSale && (
                      <span className="line-through">
                        {formatMoney(kit.compareAtPriceCents ?? 0)}
                      </span>
                    )}
                  </p>

                  {kit.items.length > 0 && (
                    <>
                      <h3 className="mt-4 font-medium">Qué incluye</h3>
                      <ul className="mt-1 flex flex-col gap-1 text-sm">
                        {kit.items.map((item, index) => (
                          <li key={`${kit.id}-${index}`}>
                            {item.quantity} × {item.name}
                            {variantText(item.color, item.size) &&
                              ` · ${variantText(item.color, item.size)}`}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="mt-5">
                    <AddToCartButton
                      item={{
                        kind: "kit",
                        id: kit.id,
                        href: `/kits#${kit.slug}`,
                        name: kit.name,
                        color: null,
                        size: null,
                        priceCents: kit.priceCents,
                        imagePath: kit.images[0]?.path ?? null,
                      }}
                      disabled={!kit.isAvailable}
                      label={kit.isAvailable ? "Sumar el kit" : "Sin stock"}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

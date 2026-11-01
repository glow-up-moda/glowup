"use client";

import { useMemo, useState } from "react";

import { AddToCartButton } from "@/components/store/add-to-cart";
import { SelectField } from "@/components/ui/field";
import { formatMoney } from "@/lib/format";
import type { KitCard, KitOption } from "@/lib/store/catalog";
import type { KitSelection } from "@/lib/store/cart";

export function DynamicKitBuilder({ kit }: { kit: KitCard }) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const chosen = useMemo(
    () =>
      kit.components.flatMap((component) => {
        const option = component.options.find(
          (item) => item.variantId === selected[component.id],
        );
        return option ? [{ component, option }] : [];
      }),
    [kit.components, selected],
  );

  const allSelected =
    kit.components.length > 0 && chosen.length === kit.components.length;

  const originalPrice = chosen.reduce(
    (total, item) => total + item.option.priceCents * item.component.quantity,
    0,
  );
  const kitPrice = Math.round(originalPrice * (100 - kit.discountPercent) / 100);

  const selections: KitSelection[] = chosen.map(({ component, option }) => ({
    componentId: component.id,
    variantId: option.variantId,
    componentName: component.name,
    productName: option.productName,
    color: option.color,
    size: option.size,
    quantity: component.quantity,
  }));

  const cartKey = allSelected
    ? `kit:${kit.id}:${selections
        .map((item) => `${item.componentId}=${item.variantId}`)
        .sort()
        .join("|")}`
    : undefined;

  const firstImage =
    chosen.find((item) => item.option.imagePath)?.option.imagePath ??
    kit.images[0]?.path ??
    null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {kit.components.map((component) => (
        <SelectField
          key={component.id}
          label={`Elegí ${component.name}`}
          name={`kit-${kit.id}-${component.id}`}
          value={selected[component.id] ?? ""}
          onChange={(event) =>
            setSelected((current) => ({
              ...current,
              [component.id]: event.target.value,
            }))
          }
        >
          <option value="">Seleccioná una opción</option>
          {component.options.map((option: KitOption) => (
            <option key={option.variantId} value={option.variantId}>
              {option.label} · {formatMoney(option.priceCents)}
            </option>
          ))}
        </SelectField>
      ))}

      <div className="flex flex-wrap items-baseline gap-2">
        {allSelected ? (
          <>
            <span className="font-display text-xl font-semibold text-caracola">
              {formatMoney(kitPrice)}
            </span>
            {kit.discountPercent > 0 && (
              <>
                <span className="text-sm text-azul/70 line-through">
                  {formatMoney(originalPrice)}
                </span>
                <span className="text-sm font-medium text-caracola">
                  {kit.discountPercent}% OFF
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-sm text-azul/80">
            Elegí una opción de cada categoría para ver el precio del kit.
          </span>
        )}
      </div>

      <AddToCartButton
        item={
          allSelected && cartKey
            ? {
                kind: "kit",
                id: kit.id,
                cartKey,
                selections,
                href: `/kits#${kit.slug}`,
                name: kit.name,
                color: null,
                size: null,
                priceCents: kitPrice,
                imagePath: firstImage,
              }
            : null
        }
        disabled={!kit.isAvailable || !allSelected}
        label="Sumar mi kit"
      />
    </div>
  );
}

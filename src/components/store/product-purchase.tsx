"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { ProductDetail } from "@/lib/store/product";
import { useFormAction } from "@/lib/use-form-action";

import { AddToCartButton } from "./add-to-cart";

export type NotifyState = { message?: string; error?: string };

function chipClass(selected: boolean, soldOut = false): string {
  const base =
    "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-4 transition-colors duration-150 ease-brand";
  if (selected) return `${base} bg-chocolate text-crema`;
  if (soldOut)
    return `${base} bg-crema-oscuro/60 text-chocolate/60 line-through`;
  return `${base} bg-crema-oscuro hover:bg-rosa`;
}

export function ProductPurchase({
  product,
  transferPriceCents,
  transferDiscountPercent,
  notifyAction,
}: {
  product: ProductDetail;
  transferPriceCents: number;
  transferDiscountPercent: number;
  notifyAction: (
    variantId: string,
    prev: NotifyState,
    formData: FormData,
  ) => Promise<NotifyState>;
}) {
  const firstAvailable = product.variants.find(
    (variant) => variant.isAvailable,
  );
  const [color, setColor] = useState(
    firstAvailable?.color ?? product.colors[0] ?? "",
  );
  const [size, setSize] = useState<string | null>(null);

  const sizesForColor = product.variants.filter(
    (variant) => variant.color === color,
  );
  const variant =
    sizesForColor.find((candidate) => candidate.size === size) ?? null;
  const onSale =
    product.compareAtPriceCents != null &&
    product.compareAtPriceCents > product.priceCents;

  // Con useFormAction, un email mal escrito no borra lo tecleado (§7).
  const {
    state: notifyState,
    pending: notifying,
    formRef: notifyRef,
    onSubmit: onNotify,
  } = useFormAction(notifyAction.bind(null, variant?.id ?? ""));

  const cartItem = variant?.isAvailable
    ? {
        kind: "variant" as const,
        id: variant.id,
        href: `/producto/${product.slug}`,
        name: product.name,
        color: variant.color,
        size: variant.size,
        priceCents: product.priceCents,
        imagePath: product.images[0]?.path ?? null,
      }
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="font-display text-2xl font-semibold">
            {formatMoney(product.priceCents)}
          </span>
          {onSale && (
            <span className="line-through">
              {formatMoney(product.compareAtPriceCents ?? 0)}
            </span>
          )}
          {onSale && <Badge tone="offer">Oferta</Badge>}
        </p>
        {transferDiscountPercent > 0 && (
          <p className="text-sm">
            {formatMoney(transferPriceCents)} pagando por transferencia (
            {transferDiscountPercent}% off)
          </p>
        )}
      </div>

      {product.colors.length > 1 && (
        <fieldset>
          <legend className="font-medium">Color</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((option) => (
              <label key={option} className={chipClass(color === option)}>
                <input
                  type="radio"
                  name="color"
                  value={option}
                  checked={color === option}
                  onChange={() => {
                    setColor(option);
                    setSize(null);
                  }}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <legend className="font-medium">Talle</legend>
          <Link
            href="/guia-de-talles"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Guía de talles
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {sizesForColor.map((option) => (
            <label
              key={option.id}
              className={chipClass(size === option.size, !option.isAvailable)}
            >
              <input
                type="radio"
                name="talle"
                value={option.size}
                checked={size === option.size}
                onChange={() => setSize(option.size)}
                className="sr-only"
              />
              {option.size}
            </label>
          ))}
        </div>
        {product.modelInfo && (
          <p className="mt-2 text-sm">{product.modelInfo}</p>
        )}
      </fieldset>

      {variant?.isLastUnits && variant.isAvailable && (
        <p className="text-sm">Últimas unidades de este talle.</p>
      )}

      {variant && !variant.isAvailable ? (
        <form
          ref={notifyRef}
          onSubmit={onNotify}
          className="flex flex-col gap-2"
        >
          <p>
            Ese talle se agotó. Dejanos tu email y te avisamos apenas vuelva.
          </p>
          <div className="flex flex-wrap gap-2">
            <label htmlFor="email-aviso" className="sr-only">
              Tu email
            </label>
            <input
              id="email-aviso"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="tuemail@ejemplo.com"
              className="min-h-11 flex-1 rounded-input border-2 border-transparent bg-crema-oscuro px-3 text-base"
            />
            <Button type="submit" variant="secondary" disabled={notifying}>
              {notifying ? "Guardando…" : "Avisame"}
            </Button>
          </div>
          {notifyState.error && (
            <p className="text-sm text-error" role="alert">
              {notifyState.error}
            </p>
          )}
          {notifyState.message && (
            <p className="text-sm text-exito" role="status">
              {notifyState.message}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-col items-stretch gap-2 sm:items-start">
          <AddToCartButton
            item={cartItem}
            disabled={!cartItem}
            label="Sumar al carrito"
            className="sm:px-10"
          />
          {!size && <p className="text-sm">Elegí un talle para sumarlo.</p>}
        </div>
      )}

      {/* En el celular el botón queda fijo abajo (§7). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-crema-oscuro bg-crema/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <span className="font-medium">{formatMoney(product.priceCents)}</span>
          {variant && !variant.isAvailable ? (
            <a
              href="#email-aviso"
              className="flex min-h-11 flex-1 items-center justify-center rounded-full border-2 border-chocolate px-5 font-medium"
            >
              Avisame cuando vuelva
            </a>
          ) : (
            <AddToCartButton
              item={cartItem}
              disabled={!cartItem}
              label={size ? "Sumar al carrito" : "Elegí un talle"}
              className="flex-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}

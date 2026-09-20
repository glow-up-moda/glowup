"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { ButtonLink } from "@/components/ui/button";
import { IconClose, IconTrash, Sparkle } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { MAX_PER_LINE, useCart } from "@/lib/store/cart";
import { productImageUrl } from "@/lib/images";

/** Cuánto falta para el envío gratis (§7). null cuando no hay monto configurado. */
function missingForFreeShipping(
  subtotalCents: number,
  thresholdCents: number | null,
): number | null {
  if (thresholdCents == null || thresholdCents <= 0) return null;
  return Math.max(0, thresholdCents - subtotalCents);
}

export function CartDrawer({
  freeShippingThresholdCents,
}: {
  freeShippingThresholdCents: number | null;
}) {
  const { items, subtotalCents, isOpen, close, setQuantity, remove } =
    useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const missing = missingForFreeShipping(
    subtotalCents,
    freeShippingThresholdCents,
  );
  const progress =
    freeShippingThresholdCents && freeShippingThresholdCents > 0
      ? Math.min(
          100,
          Math.round((subtotalCents / freeShippingThresholdCents) * 100),
        )
      : 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      aria-label="Tu carrito"
      className="drawer drawer-right m-0 ml-auto h-dvh max-h-none w-[min(26rem,92vw)] max-w-none bg-crema p-0 text-chocolate shadow-drawer"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-crema-oscuro px-4 py-3">
          <h2 className="font-display text-xl font-semibold">Tu carrito</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar el carrito"
            className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro"
          >
            <IconClose />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p>Tu carrito está vacío.</p>
            <ButtonLink href="/ropa-interior" onClick={close}>
              Ver la colección
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-crema-oscuro overflow-y-auto px-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-input bg-crema-oscuro"
                  >
                    {item.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productImageUrl(item.imagePath, "thumb")}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Sparkle className="size-6 text-rosa" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={item.href}
                      onClick={close}
                      className="font-medium"
                    >
                      {item.name}
                    </Link>
                    {item.color && item.size ? (
                      <p className="text-sm">
                        {item.color} · Talle {item.size}
                      </p>
                    ) : (
                      <p className="text-sm">Kit armado</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <span className="sr-only">
                          Cantidad de {item.name}
                          {item.color
                            ? ` ${item.color} talle ${item.size}`
                            : ""}
                        </span>
                        <select
                          value={item.quantity}
                          onChange={(event) =>
                            setQuantity(item.id, Number(event.target.value))
                          }
                          className="min-h-11 rounded-input border-2 border-transparent bg-crema-oscuro px-2 text-base"
                        >
                          {Array.from(
                            { length: MAX_PER_LINE },
                            (_, index) => index + 1,
                          ).map((quantity) => (
                            <option key={quantity} value={quantity}>
                              {quantity}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="font-medium">
                        {formatMoney(item.priceCents * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Sacar ${item.name} del carrito`}
                    className="flex size-11 shrink-0 items-center justify-center self-start rounded-full hover:bg-crema-oscuro"
                  >
                    <IconTrash />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-crema-oscuro p-4">
              {missing != null && (
                <div className="mb-3">
                  <p className="text-sm">
                    {missing === 0
                      ? "¡Tenés envío gratis!"
                      : `Te faltan ${formatMoney(missing)} para el envío gratis.`}
                  </p>
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-crema-oscuro"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-coral transition-[width] duration-300 ease-brand"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span>Subtotal</span>
                <span className="font-display text-xl font-semibold">
                  {formatMoney(subtotalCents)}
                </span>
              </div>
              <p className="mt-1 text-sm">
                El envío y los descuentos se calculan en el siguiente paso.
              </p>
              <ButtonLink
                href="/checkout"
                onClick={close}
                className="mt-3 w-full"
              >
                Ir a pagar
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

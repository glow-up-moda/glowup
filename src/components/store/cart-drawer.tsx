"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { quoteCart } from "@/app/(store)/actions";
import { ButtonLink } from "@/components/ui/button";
import {
  IconAlert,
  IconClose,
  IconTrash,
  Sparkle,
} from "@/components/ui/icons";
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
  const { items, subtotalCents, isOpen, close, setQuantity, remove, setPrice } =
    useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Qué encontró la última revisión contra la base: qué se agotó y si algún
  // precio cambió desde que se guardó el carrito.
  const [checked, setChecked] = useState<{
    issues: Record<string, "agotado" | "no-disponible">;
    pricesChanged: boolean;
  }>({ issues: {}, pricesChanged: false });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Al abrirlo se revalidan precios y stock contra la base (§7).
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    let active = true;
    quoteCart(
      items.map((line) => ({
        kind: line.kind,
        id: line.id,
        quantity: line.quantity,
      })),
    ).then((quote) => {
      if (!active || !quote) return;
      const issues: Record<string, "agotado" | "no-disponible"> = {};
      let pricesChanged = false;
      for (const line of quote.lines) {
        if (line.unavailable) issues[line.id] = "no-disponible";
        else if (line.outOfStock) issues[line.id] = "agotado";
        const saved = items.find((item) => item.id === line.id);
        if (
          saved &&
          !line.unavailable &&
          line.unitPriceCents > 0 &&
          saved.priceCents !== line.unitPriceCents
        ) {
          pricesChanged = true;
          setPrice(line.id, line.unitPriceCents);
        }
      }
      // El aviso de precios queda mientras el carrito siga abierto: al
      // corregir el precio, la revisión siguiente ya no encuentra diferencia.
      setChecked((previous) => ({
        issues,
        pricesChanged: pricesChanged || previous.pricesChanged,
      }));
    });
    return () => {
      active = false;
    };
  }, [isOpen, items, setPrice]);

  const blocked = Object.keys(checked.issues).length > 0;

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
      onClose={() => {
        close();
        setChecked({ issues: {}, pricesChanged: false });
      }}
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
            {checked.pricesChanged && (
              <p className="mx-4 mt-3 rounded-card bg-rosa px-3 py-2 text-sm">
                Actualizamos los precios: son los de hoy.
              </p>
            )}

            <ul className="flex-1 divide-y divide-crema-oscuro overflow-y-auto px-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                  {/* Repite el link del nombre que está al lado, así que para
                      un lector de pantalla y para el teclado no existe. */}
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-hidden="true"
                    tabIndex={-1}
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
                    {checked.issues[item.id] && (
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-error">
                        <IconAlert
                          width={16}
                          height={16}
                          className="mt-0.5 shrink-0"
                        />
                        {checked.issues[item.id] === "agotado"
                          ? "Se agotó mientras lo tenías guardado. Bajá la cantidad o sacalo."
                          : "Ya no está a la venta. Sacalo para seguir."}
                      </p>
                    )}
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
              {blocked ? (
                <p className="mt-3 rounded-card bg-crema-oscuro px-3 py-2 text-sm">
                  Revisá lo que quedó sin stock arriba y seguí.
                </p>
              ) : (
                <ButtonLink
                  href="/checkout"
                  onClick={close}
                  className="mt-3 w-full"
                >
                  Ir a pagar
                </ButtonLink>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

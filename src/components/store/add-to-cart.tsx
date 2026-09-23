"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { IconCheck, Sparkle } from "@/components/ui/icons";
import { track } from "@/lib/store/analytics";
import { type CartItem, useCart } from "@/lib/store/cart";

/**
 * Suma algo al carrito y avisa con el destello de la marca durante 1,2s (§6).
 * Sirve para una variante y para un kit: los dos son una línea del carrito.
 */
export function AddToCartButton({
  item,
  disabled,
  label = "Sumar al carrito",
  className,
}: {
  item: Omit<CartItem, "quantity"> | null;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      onClick={() => {
        if (!item) return;
        add(item);
        track({
          name: "AddToCart",
          items: [
            {
              id: item.id,
              name: item.name,
              quantity: 1,
              priceCents: item.priceCents,
            },
          ],
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      disabled={disabled || !item}
      className={className}
    >
      {added ? (
        <>
          <Sparkle className="size-5" />
          <IconCheck />
          Agregado
        </>
      ) : (
        label
      )}
    </Button>
  );
}

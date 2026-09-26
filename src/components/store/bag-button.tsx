"use client";

import { IconBag } from "@/components/ui/icons";
import { useCart } from "@/lib/store/cart";

/** Abre el carrito lateral. El contador rebota al sumar algo (§6). */
export function BagButton() {
  const { count, open } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={
        count > 0 ? `Abrir el carrito, ${count} productos` : "Abrir el carrito"
      }
      className="relative flex size-11 items-center justify-center rounded-full hover:bg-arena"
    >
      <IconBag />
      {count > 0 && (
        <span
          key={count}
          className="absolute top-0 right-0 min-w-5 pop rounded-full bg-azul px-1 text-center text-sm font-medium text-crema"
        >
          {count}
        </span>
      )}
    </button>
  );
}

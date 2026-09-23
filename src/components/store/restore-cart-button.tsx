"use client";

import { useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/store/cart";

// Devuelve a la bolsa lo que quedó guardado (§13). Reemplaza el carrito de
// este navegador, así que lo hace solo cuando se toca el botón.

export function RestoreCartButton({ items }: { items: CartItem[] }) {
  const { replace } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return <ButtonLink href="/ropa-interior">Ver la colección</ButtonLink>;
  }

  return (
    <Button
      className="self-start"
      onClick={() => {
        replace(items);
        router.push("/checkout");
      }}
    >
      Seguir con mi compra
    </Button>
  );
}

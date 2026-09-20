"use client";

import { IconHeart } from "@/components/ui/icons";
import { useFavorites } from "@/lib/store/favorites";

/** Corazón de favoritos: rebota al marcarlo (§6). */
export function FavoriteButton({
  productId,
  name,
  className = "",
}: {
  productId: string;
  name: string;
  className?: string;
}) {
  const { has, toggle } = useFavorites();
  const saved = has(productId);

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={saved}
      aria-label={
        saved ? `Sacar ${name} de favoritos` : `Guardar ${name} en favoritos`
      }
      className={`flex size-11 items-center justify-center rounded-full bg-crema/90 text-chocolate hover:bg-crema ${className}`}
    >
      <IconHeart
        key={String(saved)}
        className={saved ? "pop fill-coral" : ""}
        aria-hidden="true"
      />
    </button>
  );
}

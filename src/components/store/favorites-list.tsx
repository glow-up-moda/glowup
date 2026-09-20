"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductCard } from "@/components/store/product-card";
import { ButtonLink } from "@/components/ui/button";
import {
  listProducts,
  type ProductCard as ProductCardData,
} from "@/lib/store/catalog";
import { useFavorites } from "@/lib/store/favorites";

// Los favoritos viven en el navegador (§7), así que esta página se arma acá:
// guarda ids y pide los productos frescos, con su precio y su stock de ahora.

export function FavoritesList() {
  const { ids } = useFavorites();
  const key = ids.join(",");
  const [loaded, setLoaded] = useState<{
    key: string;
    products: ProductCardData[];
  } | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;
    let active = true;
    listProducts({ ids }).then((products) => {
      if (active) setLoaded({ key: ids.join(","), products });
    });
    return () => {
      active = false;
    };
  }, [ids]);

  const products =
    ids.length === 0
      ? []
      : loaded?.key === key
        ? // Se muestran en el orden en que se fueron guardando.
          ids
            .map((id) => loaded.products.find((product) => product.id === id))
            .filter((product): product is ProductCardData => Boolean(product))
        : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold md:text-3xl">
        Tus favoritos
      </h1>
      <p className="mt-2 max-w-[60ch] text-sm">
        Se guardan en este navegador. Si entrás desde otro celular, no van a
        estar.
      </p>

      {products === null ? (
        <ul
          className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          aria-hidden="true"
        >
          {[0, 1, 2, 3].map((index) => (
            <li key={index}>
              <span className="block aspect-4/5 animate-pulse rounded-card bg-crema-oscuro" />
            </li>
          ))}
        </ul>
      ) : products.length === 0 ? (
        <div className="mt-8 flex flex-col items-start gap-4 rounded-card bg-crema-oscuro/50 p-6">
          <p>
            Todavía no guardaste nada. Tocá el corazón de lo que te guste y
            queda acá.
          </p>
          <ButtonLink href="/ropa-interior">Ver la colección</ButtonLink>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm">
        ¿Buscás algo puntual?{" "}
        <Link href="/buscar" className="underline underline-offset-4">
          Usá el buscador
        </Link>
        .
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { IconSearch } from "@/components/ui/icons";
import { plural } from "@/lib/format";
import { param } from "@/lib/params";
import { getNavigation, searchProducts } from "@/lib/store/catalog";

export const metadata: Metadata = {
  title: "Buscar · GLOW UP",
  description: "Encontrá lo que buscás en GLOW UP.",
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/buscar">) {
  const term = param((await searchParams).q);
  const [products, categories] = await Promise.all([
    term ? searchProducts(term) : Promise.resolve([]),
    getNavigation(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold md:text-3xl">
        Buscar
      </h1>

      <form role="search" className="mt-4 flex max-w-lg gap-2">
        <label htmlFor="q" className="sr-only">
          Qué estás buscando
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={term}
          autoFocus={!term}
          placeholder="Corpiño, bombacha, gorra…"
          className="min-h-11 flex-1 rounded-input border-2 border-transparent bg-crema-oscuro px-3 text-base"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-chocolate"
        >
          <IconSearch />
        </button>
      </form>

      {term && (
        <p className="mt-6" role="status">
          {products.length === 0
            ? `No encontramos nada con “${term}”.`
            : `${plural(products.length, "resultado", "resultados")} para “${term}”.`}
        </p>
      )}

      {products.length > 0 ? (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} priority={index < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <p className="font-medium">Mirá por categoría</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/${category.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-crema-oscuro px-4"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/kits"
                className="inline-flex min-h-11 items-center rounded-full bg-crema-oscuro px-4"
              >
                Kits
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

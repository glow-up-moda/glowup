import Link from "next/link";

import { getCategoryFacets, listProducts } from "@/lib/store/catalog";
import { parseFilters, type SearchParams } from "@/lib/store/filters";
import { plural } from "@/lib/format";

import { ProductCard } from "./product-card";
import { ProductFilters } from "./product-filters";

/** Listado de una categoría con sus filtros (§7). */
export async function CategoryListing({
  title,
  description,
  categoryIds,
  basePath,
  subcategories,
  currentSlug,
  searchParams,
}: {
  title: string;
  description?: string;
  categoryIds: string[];
  basePath: string;
  subcategories?: { id: string; name: string; slug: string }[];
  currentSlug?: string;
  searchParams: SearchParams;
}) {
  const { active, query } = parseFilters(searchParams);
  const [products, facets] = await Promise.all([
    listProducts({ categoryIds, ...query }),
    getCategoryFacets(categoryIds),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold md:text-3xl">
        {title}
      </h1>
      {description && <p className="mt-2 max-w-[60ch]">{description}</p>}

      {subcategories && subcategories.length > 0 && (
        <nav aria-label="Subcategorías" className="mt-5">
          <ul className="flex gap-2 overflow-x-auto pb-1">
            <li>
              <Link
                href={basePath}
                aria-current={currentSlug ? undefined : "page"}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 ${
                  currentSlug ? "bg-crema-oscuro" : "bg-chocolate text-crema"
                }`}
              >
                Todo
              </Link>
            </li>
            {subcategories.map((subcategory) => (
              <li key={subcategory.id}>
                <Link
                  href={`${basePath}/${subcategory.slug}`}
                  aria-current={
                    currentSlug === subcategory.slug ? "page" : undefined
                  }
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 ${
                    currentSlug === subcategory.slug
                      ? "bg-chocolate text-crema"
                      : "bg-crema-oscuro"
                  }`}
                >
                  {subcategory.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-6">
        <ProductFilters facets={facets} active={active} basePath={basePath} />
      </div>

      {products.length === 0 ? (
        <p className="rounded-card bg-crema-oscuro/60 px-4 py-6">
          No encontramos nada con esos filtros. Probá sacando alguno o mirá{" "}
          <Link href={basePath} className="underline underline-offset-4">
            toda la categoría
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm" role="status">
            {plural(products.length, "producto", "productos")}
          </p>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} priority={index < 4} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { IconChevronRight, IconPlus, IconSearch } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { likePattern, param } from "@/lib/admin/params";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/images";

export const metadata: Metadata = { title: "Productos" };

const filters = [
  { value: "", label: "Todos" },
  { value: "publicados", label: "Publicados" },
  { value: "borradores", label: "Borradores" },
];

export default async function ProductsPage({
  searchParams,
}: PageProps<"/admin/productos">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const q = param(params.q);
  const estado = param(params.estado);

  let query = supabase
    .from("products")
    .select(
      "id, name, price_cents, compare_at_price_cents, is_published, categories(name), product_variants(stock_on_hand, stock_reserved), product_images(path, sort_order)",
    )
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("name", likePattern(q));
  if (estado === "publicados") query = query.eq("is_published", true);
  if (estado === "borradores") query = query.eq("is_published", false);

  const { data: products, error } = await query;

  function filterHref(value: string): string {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (value) search.set("estado", value);
    const qs = search.toString();
    return qs ? `/admin/productos?${qs}` : "/admin/productos";
  }

  return (
    <>
      <PageHeader
        title="Productos"
        actions={
          <ButtonLink href="/admin/productos/nuevo">
            <IconPlus />
            Nuevo producto
          </ButtonLink>
        }
      />

      {param(params.borrado) && (
        <Notice tone="success" className="mb-4">
          Producto borrado.
        </Notice>
      )}

      <form role="search" className="mb-3 flex gap-2">
        {estado && <input type="hidden" name="estado" value={estado} />}
        <label htmlFor="q" className="sr-only">
          Buscar por nombre
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre"
          className={inputClass}
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-chocolate"
        >
          <IconSearch />
        </button>
      </form>

      <nav
        aria-label="Filtrar productos"
        className="mb-5 flex gap-2 overflow-x-auto pb-1"
      >
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={filterHref(filter.value)}
            aria-current={estado === filter.value ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 ${
              estado === filter.value
                ? "bg-chocolate text-crema"
                : "bg-crema-oscuro"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <Notice tone="error">
          No pudimos cargar los productos. Recargá la página.
        </Notice>
      ) : !products?.length ? (
        <Notice>
          {q
            ? `No hay productos que coincidan con "${q}".`
            : "Todavía no hay productos. Creá el primero."}
        </Notice>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const available = product.product_variants.reduce(
              (total, variant) =>
                total + variant.stock_on_hand - variant.stock_reserved,
              0,
            );
            const cover = [...product.product_images].sort(
              (a, b) => a.sort_order - b.sort_order,
            )[0];
            return (
              <li key={product.id}>
                <Link
                  href={`/admin/productos/${product.id}`}
                  className="flex items-center gap-3 rounded-card bg-crema-oscuro/60 p-3 hover:bg-crema-oscuro"
                >
                  <span className="h-[70px] w-14 shrink-0 overflow-hidden rounded-input bg-crema-oscuro">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productImageUrl(cover.path, "thumb")}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {product.name}
                    </span>
                    <span className="block text-sm">
                      {product.categories?.name} ·{" "}
                      {formatMoney(product.price_cents)}
                    </span>
                    <span className="block text-sm">
                      {product.product_variants.length === 0
                        ? "Sin variantes"
                        : available <= 0
                          ? "Sin stock"
                          : `${available} ${available === 1 ? "disponible" : "disponibles"}`}
                    </span>
                  </span>
                  <Badge tone={product.is_published ? "success" : "neutral"}>
                    {product.is_published ? "Publicado" : "Borrador"}
                  </Badge>
                  <IconChevronRight className="hidden shrink-0 sm:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

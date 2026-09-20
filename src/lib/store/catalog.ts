import { cache } from "react";

import { createCatalogClient } from "@/lib/supabase/catalog";

// Lecturas del catálogo público. Todo pasa por el cliente sin sesión (§8), y
// la disponibilidad sale de las vistas, que devuelven booleanos y nunca
// cantidades.

const CARD_COLUMNS =
  "id, name, slug, price_cents, compare_at_price_cents, created_at, category_id, product_images(path, alt, sort_order), product_variants(id, color, size)";

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  images: { path: string; alt: string }[];
  colors: string[];
  isAvailable: boolean;
  isLastUnits: boolean;
};

export type KitCard = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  images: { path: string; alt: string }[];
  isAvailable: boolean;
  isLastUnits: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  product_images: { path: string; alt: string; sort_order: number }[];
  product_variants: { id: string; color: string; size: string }[];
};

/** Menú de la tienda: las categorías madre con sus subcategorías, en orden. */
export const getNavigation = cache(async (): Promise<Category[]> => {
  const supabase = createCatalogClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order")
    .order("sort_order");
  const categories = data ?? [];

  return categories
    .filter((category) => !category.parent_id)
    .map((parent) => ({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      children: categories
        .filter((child) => child.parent_id === parent.id)
        .map(({ id, name, slug }) => ({ id, name, slug })),
    }));
});

function sortedImages(
  images: { path: string; alt: string; sort_order: number }[],
): { path: string; alt: string }[] {
  return [...images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ path, alt }) => ({ path, alt }));
}

/**
 * Un producto está disponible si le queda algún talle; muestra "últimas
 * unidades" cuando a todos los talles que quedan les queda poco.
 */
async function availabilityByProduct(productIds: string[]) {
  const availability = new Map<
    string,
    { isAvailable: boolean; isLastUnits: boolean }
  >();
  if (productIds.length === 0) return availability;

  const supabase = createCatalogClient();
  const { data } = await supabase
    .from("variant_availability")
    .select("product_id, is_available, is_last_units")
    .in("product_id", productIds);

  for (const row of data ?? []) {
    if (!row.product_id || !row.is_available) continue;
    const current = availability.get(row.product_id);
    availability.set(row.product_id, {
      isAvailable: true,
      isLastUnits: (current?.isLastUnits ?? true) && row.is_last_units === true,
    });
  }
  return availability;
}

function toCard(
  product: ProductRow,
  availability: Map<string, { isAvailable: boolean; isLastUnits: boolean }>,
): ProductCard {
  const state = availability.get(product.id);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    priceCents: product.price_cents,
    compareAtPriceCents: product.compare_at_price_cents,
    images: sortedImages(product.product_images),
    colors: [
      ...new Set(product.product_variants.map((variant) => variant.color)),
    ],
    isAvailable: state?.isAvailable ?? false,
    isLastUnits: state?.isLastUnits ?? false,
  };
}

/** Productos publicados, lo último primero. */
export async function listProducts({
  categoryIds,
  limit,
}: {
  categoryIds?: string[];
  limit?: number;
} = {}): Promise<ProductCard[]> {
  const supabase = createCatalogClient();
  let query = supabase
    .from("products")
    .select(CARD_COLUMNS)
    .order("created_at", { ascending: false });
  if (categoryIds?.length) query = query.in("category_id", categoryIds);
  if (limit) query = query.limit(limit);

  const { data } = await query;
  const products = (data ?? []) as ProductRow[];
  const availability = await availabilityByProduct(
    products.map((product) => product.id),
  );
  return products.map((product) => toCard(product, availability));
}

/** Kits publicados, con la foto del primer producto que los compone. */
export async function listKits(limit?: number): Promise<KitCard[]> {
  const supabase = createCatalogClient();
  let query = supabase
    .from("kits")
    .select(
      "id, name, slug, price_cents, compare_at_price_cents, created_at, kit_items(variant_id, quantity, product_variants(product_id))",
    )
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const [{ data: kits }, { data: availability }] = await Promise.all([
    query,
    supabase
      .from("kit_availability")
      .select("kit_id, is_available, is_last_units"),
  ]);
  if (!kits?.length) return [];

  // Los kits no tienen fotos propias: muestran las de sus productos.
  const productIds = [
    ...new Set(
      kits.flatMap((kit) =>
        kit.kit_items
          .map((item) => item.product_variants?.product_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  ];
  const supabaseImages = await createCatalogClient()
    .from("product_images")
    .select("product_id, path, alt, sort_order")
    .in(
      "product_id",
      productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("sort_order");
  const imagesByProduct = new Map<string, { path: string; alt: string }[]>();
  for (const image of supabaseImages.data ?? []) {
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push({ path: image.path, alt: image.alt });
    imagesByProduct.set(image.product_id, list);
  }

  const states = new Map(
    (availability ?? []).map((row) => [row.kit_id, row] as const),
  );

  return kits.map((kit) => {
    const state = states.get(kit.id);
    const images = kit.kit_items
      .map((item) => item.product_variants?.product_id)
      .filter((id): id is string => Boolean(id))
      .flatMap((productId) => imagesByProduct.get(productId) ?? [])
      .slice(0, 2);
    return {
      id: kit.id,
      name: kit.name,
      slug: kit.slug,
      priceCents: kit.price_cents,
      compareAtPriceCents: kit.compare_at_price_cents,
      images,
      isAvailable: state?.is_available === true,
      isLastUnits: state?.is_last_units === true,
    };
  });
}

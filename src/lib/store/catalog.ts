import { cache } from "react";

import { variantText } from "@/lib/format";
import { compareSizes } from "@/lib/sizes";
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

export type KitOption = {
  variantId: string;
  productName: string;
  label: string;
  color: string | null;
  size: string | null;
  priceCents: number;
  imagePath: string | null;
};

export type KitComponentCard = {
  id: string;
  categoryId: string;
  name: string;
  quantity: number;
  options: KitOption[];
};

export type KitCard = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  isDynamic: boolean;
  discountPercent: number;
  images: { path: string; alt: string }[];
  items: {
    name: string;
    slug: string;
    color: string;
    size: string;
    quantity: number;
  }[];
  components: KitComponentCard[];
  isAvailable: boolean;
  isLastUnits: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  /** La foto de la tarjeta del inicio, o null si no cargó ninguna. */
  imagePath: string | null;
  children: {
    id: string;
    name: string;
    slug: string;
    imagePath: string | null;
  }[];
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
    .select("id, name, slug, parent_id, sort_order, image_path")
    .order("sort_order");
  const categories = data ?? [];

  return categories
    .filter((category) => !category.parent_id)
    .map((parent) => ({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      imagePath: parent.image_path,
      children: categories
        .filter((child) => child.parent_id === parent.id)
        .map(({ id, name, slug, image_path }) => ({
          id,
          name,
          slug,
          imagePath: image_path,
        })),
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

export type ProductSort = "nuevo" | "precio-asc" | "precio-desc";

export type ProductFilters = {
  categoryIds?: string[];
  /** Ids puntuales: lo usa la página de favoritos. */
  ids?: string[];
  sizes?: string[];
  colors?: string[];
  minCents?: number | null;
  maxCents?: number | null;
  onlyAvailable?: boolean;
  sort?: ProductSort;
  limit?: number;
};

/** Productos publicados, con los filtros del listado (§7). */
export async function listProducts({
  categoryIds,
  ids,
  sizes,
  colors,
  minCents,
  maxCents,
  onlyAvailable,
  sort = "nuevo",
  limit,
}: ProductFilters = {}): Promise<ProductCard[]> {
  const supabase = createCatalogClient();
  // Con talle o color, la consulta necesita la variante: !inner deja solo los
  // productos que tienen alguna que coincida.
  const needsVariant = Boolean(sizes?.length || colors?.length);
  let query = supabase
    .from("products")
    .select(
      needsVariant
        ? CARD_COLUMNS.replace("product_variants(", "product_variants!inner(")
        : CARD_COLUMNS,
    );

  if (categoryIds?.length) query = query.in("category_id", categoryIds);
  if (ids?.length) query = query.in("id", ids);
  if (sizes?.length) query = query.in("product_variants.size", sizes);
  if (colors?.length) query = query.in("product_variants.color", colors);
  if (minCents != null) query = query.gte("price_cents", minCents);
  if (maxCents != null) query = query.lte("price_cents", maxCents);

  query =
    sort === "precio-asc"
      ? query.order("price_cents", { ascending: true })
      : sort === "precio-desc"
        ? query.order("price_cents", { ascending: false })
        : query.order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data } = await query;
  // El select se arma según los filtros, así que supabase-js no puede inferir
  // la forma: la declara ProductRow.
  const products = (data ?? []) as unknown as ProductRow[];
  const availability = await availabilityByProduct(
    products.map((product) => product.id),
  );
  const cards = products.map((product) => toCard(product, availability));
  return onlyAvailable ? cards.filter((card) => card.isAvailable) : cards;
}

export type CategoryFacets = {
  sizes: string[];
  colors: string[];
  minCents: number;
  maxCents: number;
};

/**
 * Talles, colores y rango de precios que existen en una categoría, para armar
 * los filtros sin ofrecer opciones que no llevan a ningún lado.
 */
export async function getCategoryFacets(
  categoryIds?: string[],
): Promise<CategoryFacets> {
  const supabase = createCatalogClient();
  let query = supabase
    .from("products")
    .select("price_cents, product_variants(color, size)");
  if (categoryIds?.length) query = query.in("category_id", categoryIds);

  const { data } = await query;
  const products = data ?? [];
  const prices = products.map((product) => product.price_cents);

  // Un producto sin variantes no aporta ni color ni talle a los filtros (§8).
  return {
    sizes: [
      ...new Set(
        products.flatMap((product) =>
          product.product_variants
            .map((variant) => variant.size)
            .filter((size) => size !== null),
        ),
      ),
    ].sort(compareSizes),
    colors: [
      ...new Set(
        products.flatMap((product) =>
          product.product_variants
            .map((variant) => variant.color)
            .filter((color) => color !== null),
        ),
      ),
    ].sort((a, b) => a.localeCompare(b, "es")),
    minCents: prices.length ? Math.min(...prices) : 0,
    maxCents: prices.length ? Math.max(...prices) : 0,
  };
}

/** Una categoría por su slug, con sus subcategorías. */
export async function getCategoryBySlug(slug: string): Promise<{
  category: Category | { id: string; name: string; slug: string };
  parent?: Category;
} | null> {
  const navigation = await getNavigation();
  const parent = navigation.find((category) => category.slug === slug);
  if (parent) return { category: parent };

  for (const category of navigation) {
    const child = category.children.find((item) => item.slug === slug);
    if (child) return { category: child, parent: category };
  }
  return null;
}

/** Kits publicados: fijos y combinables, con opciones que tienen stock. */
export async function listKits(limit?: number): Promise<KitCard[]> {
  const supabase = createCatalogClient();
  let query = supabase
    .from("kits")
    .select(
      "id, name, slug, price_cents, compare_at_price_cents, is_dynamic, discount_percent, created_at, kit_items(quantity, product_variants(product_id, color, size, products(name, slug))), kit_components(id, category_id, quantity, sort_order)",
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

  const states = new Map(
    (availability ?? []).map((row) => [row.kit_id, row] as const),
  );

  const allComponents = kits
    .filter((kit) => kit.is_dynamic)
    .flatMap((kit) => kit.kit_components);
  const categoryIds = [...new Set(allComponents.map((component) => component.category_id))];

  const { data: categories } = categoryIds.length
    ? await supabase
        .from("categories")
        .select("id, name, parent_id")
        .in("id", categoryIds)
    : { data: [] };

  const { data: allCategories } = categoryIds.length
    ? await supabase.from("categories").select("id, parent_id")
    : { data: [] };
  const childCategoryIds = (allCategories ?? [])
    .filter((category) => category.parent_id && categoryIds.includes(category.parent_id))
    .map((category) => category.id);
  const expandedCategoryIds = [...new Set([...categoryIds, ...childCategoryIds])];
  const parentByCategory = new Map(
    (allCategories ?? []).map((category) => [category.id, category.parent_id]),
  );

  const { data: dynamicProducts } = expandedCategoryIds.length
    ? await supabase
        .from("products")
        .select(
          "id, name, category_id, price_cents, product_images(path, alt, sort_order), product_variants(id, color, size)",
        )
        .in("category_id", expandedCategoryIds)
        .eq("is_published", true)
        .order("name")
    : { data: [] };

  const variantIds = (dynamicProducts ?? []).flatMap((product) =>
    product.product_variants.map((variant) => variant.id),
  );
  const { data: variantStates } = variantIds.length
    ? await supabase
        .from("variant_availability")
        .select("variant_id, is_available")
        .in("variant_id", variantIds)
    : { data: [] };

  const availableVariants = new Set(
    (variantStates ?? [])
      .filter((row) => row.is_available)
      .map((row) => row.variant_id),
  );
  const categoryNames = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );

  const dynamicOptionsByCategory = new Map<string, KitOption[]>();
  for (const product of dynamicProducts ?? []) {
    const productImages = [...product.product_images].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    for (const variant of product.product_variants) {
      if (!availableVariants.has(variant.id)) continue;
      const details = variantText(variant.color, variant.size);
      const option = {
        variantId: variant.id,
        productName: product.name,
        label: details ? `${product.name} · ${details}` : product.name,
        color: variant.color,
        size: variant.size,
        priceCents: product.price_cents,
        imagePath: productImages[0]?.path ?? null,
      };
      const matchingCategories = categoryIds.filter(
        (categoryId) =>
          categoryId === product.category_id ||
          parentByCategory.get(product.category_id) === categoryId,
      );
      for (const categoryId of matchingCategories) {
        const options = dynamicOptionsByCategory.get(categoryId) ?? [];
        options.push(option);
        dynamicOptionsByCategory.set(categoryId, options);
      }
    }
  }

  const fixedProductIds = [
    ...new Set(
      kits.flatMap((kit) =>
        kit.kit_items
          .map((item) => item.product_variants?.product_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  ];
  const fixedImages = await createCatalogClient()
    .from("product_images")
    .select("product_id, path, alt, sort_order")
    .in(
      "product_id",
      fixedProductIds.length
        ? fixedProductIds
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("sort_order");

  const imagesByProduct = new Map<string, { path: string; alt: string }[]>();
  for (const image of fixedImages.data ?? []) {
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push({ path: image.path, alt: image.alt });
    imagesByProduct.set(image.product_id, list);
  }

  return kits.map((kit) => {
    const state = states.get(kit.id);
    const components = kit.kit_components
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((component) => ({
        id: component.id,
        categoryId: component.category_id,
        name: categoryNames.get(component.category_id) ?? "Categoría",
        quantity: component.quantity,
        options: dynamicOptionsByCategory.get(component.category_id) ?? [],
      }));

    const fixedImagesForKit = kit.kit_items
      .map((item) => item.product_variants?.product_id)
      .filter((id): id is string => Boolean(id))
      .flatMap((productId) => imagesByProduct.get(productId) ?? [])
      .slice(0, 2);

    const dynamicImages = components
      .flatMap((component) => component.options)
      .filter((option) => option.imagePath)
      .slice(0, 2)
      .map((option) => ({
        path: option.imagePath as string,
        alt: option.productName,
      }));

    const items = kit.kit_items
      .map((item) => ({
        name: item.product_variants?.products?.name ?? "",
        slug: item.product_variants?.products?.slug ?? "",
        color: item.product_variants?.color ?? "",
        size: item.product_variants?.size ?? "",
        quantity: item.quantity,
      }))
      .filter((item) => item.name)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    return {
      id: kit.id,
      name: kit.name,
      slug: kit.slug,
      priceCents: kit.is_dynamic ? 0 : kit.price_cents,
      compareAtPriceCents: kit.is_dynamic ? null : kit.compare_at_price_cents,
      isDynamic: kit.is_dynamic,
      discountPercent: kit.discount_percent,
      images: kit.is_dynamic ? dynamicImages : fixedImagesForKit,
      items,
      components,
      isAvailable:
        state?.is_available === true &&
        (!kit.is_dynamic || components.every((component) => component.options.length > 0)),
      isLastUnits: !kit.is_dynamic && state?.is_last_units === true,
    };
  });
}

/**
 * Búsqueda por nombre y descripción. Los caracteres que tienen sentido para la
 * base (comodines, comillas, comas) se sacan del término: en un buscador de
 * productos no aportan nada y complican el escapado.
 */
export async function searchProducts(
  term: string,
  limit = 24,
): Promise<ProductCard[]> {
  const clean = term
    .trim()
    .slice(0, 60)
    .replace(/[%_\,"()]/g, " ")
    .trim();
  if (clean.length < 2) return [];

  const supabase = createCatalogClient();
  const pattern = `%${clean}%`;
  const { data } = await supabase
    .from("products")
    .select(CARD_COLUMNS)
    .or(`name.ilike.${pattern},description.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const products = (data ?? []) as unknown as ProductRow[];
  const availability = await availabilityByProduct(
    products.map((product) => product.id),
  );
  return products.map((product) => toCard(product, availability));
}

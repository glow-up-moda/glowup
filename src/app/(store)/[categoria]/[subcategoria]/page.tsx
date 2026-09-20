import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryListing } from "@/components/store/category-listing";
import { getNavigation } from "@/lib/store/catalog";

async function findSubcategory(categoria: string, subcategoria: string) {
  const navigation = await getNavigation();
  const parent = navigation.find((item) => item.slug === categoria);
  const child = parent?.children.find((item) => item.slug === subcategoria);
  return parent && child ? { parent, child } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[categoria]/[subcategoria]">): Promise<Metadata> {
  const { categoria, subcategoria } = await params;
  const found = await findSubcategory(categoria, subcategoria);
  if (!found) return {};
  return {
    title: `${found.child.name} · GLOW UP`,
    description: `${found.child.name} de GLOW UP, en ${found.parent.name.toLowerCase()}. Envío a todo el país.`,
  };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: PageProps<"/[categoria]/[subcategoria]">) {
  const { categoria, subcategoria } = await params;
  const found = await findSubcategory(categoria, subcategoria);
  if (!found) notFound();

  return (
    <CategoryListing
      title={found.child.name}
      categoryIds={[found.child.id]}
      basePath={`/${found.parent.slug}`}
      subcategories={found.parent.children}
      currentSlug={found.child.slug}
      searchParams={await searchParams}
    />
  );
}

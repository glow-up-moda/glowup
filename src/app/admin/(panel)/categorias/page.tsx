import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronRight,
} from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { param } from "@/lib/params";
import { plural } from "@/lib/format";

import { moveCategory } from "./actions";

export const metadata: Metadata = { title: "Categorías" };

const done: Record<string, string> = {
  creada: "Categoría creada.",
  guardada: "Categoría guardada.",
  borrada: "Categoría borrada.",
};

/** Las flechas que suben y bajan una categoría dentro de su grupo. */
function MoveButtons({
  id,
  first,
  last,
}: {
  id: string;
  first: boolean;
  last: boolean;
}) {
  return (
    <span className="flex shrink-0">
      <form action={moveCategory.bind(null, id, "up")}>
        <button
          type="submit"
          disabled={first}
          aria-label="Subir"
          className="flex size-11 items-center justify-center rounded-full hover:bg-arena disabled:opacity-40"
        >
          <IconArrowUp />
        </button>
      </form>
      <form action={moveCategory.bind(null, id, "down")}>
        <button
          type="submit"
          disabled={last}
          aria-label="Bajar"
          className="flex size-11 items-center justify-center rounded-full hover:bg-arena disabled:opacity-40"
        >
          <IconArrowDown />
        </button>
      </form>
    </span>
  );
}

export default async function CategoriesPage({
  searchParams,
}: PageProps<"/admin/categorias">) {
  const { supabase } = await requireAdmin();
  const message = done[param((await searchParams).hecho)];

  const [{ data: categories, error }, { data: counts }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, parent_id, sort_order")
      .order("sort_order"),
    supabase.from("products").select("category_id"),
  ]);

  const products = new Map<string, number>();
  for (const row of counts ?? [])
    products.set(row.category_id, (products.get(row.category_id) ?? 0) + 1);

  const all = categories ?? [];
  const parents = all.filter((category) => category.parent_id === null);
  const childrenOf = (id: string) =>
    all.filter((category) => category.parent_id === id);

  return (
    <>
      <PageHeader
        title="Categorías"
        description="El menú de la tienda. Cada categoría es una página, y sus subcategorías cuelgan de ella."
        actions={
          <ButtonLink href="/admin/categorias/nueva">
            Nueva categoría
          </ButtonLink>
        }
      />

      {message && <Notice tone="success">{message}</Notice>}

      {error ? (
        <Notice tone="error">
          No pudimos cargar las categorías. Recargá la página.
        </Notice>
      ) : parents.length === 0 ? (
        <Notice title="Todavía no hay categorías">
          Sin categorías no se puede cargar ningún producto: cada uno tiene que
          estar en una.
        </Notice>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {parents.map((parent, index) => {
            const children = childrenOf(parent.id);
            return (
              <li key={parent.id} className="rounded-card bg-arena/60 p-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/categorias/${parent.id}`}
                    className="flex min-h-14 flex-1 items-center gap-3 rounded-input px-2 hover:bg-arena"
                  >
                    <span className="flex-1">
                      <span className="block font-medium">{parent.name}</span>
                      <span className="block text-sm">
                        /{parent.slug} ·{" "}
                        {plural(
                          products.get(parent.id) ?? 0,
                          "producto",
                          "productos",
                        )}
                      </span>
                    </span>
                    <IconChevronRight className="shrink-0" />
                  </Link>
                  <MoveButtons
                    id={parent.id}
                    first={index === 0}
                    last={index === parents.length - 1}
                  />
                </div>

                {children.length > 0 && (
                  <ul className="mt-1 ml-4 flex flex-col border-l-2 border-arena pl-2">
                    {children.map((child, childIndex) => (
                      <li key={child.id} className="flex items-center gap-2">
                        <Link
                          href={`/admin/categorias/${child.id}`}
                          className="flex min-h-12 flex-1 items-center gap-3 rounded-input px-2 hover:bg-arena"
                        >
                          <span className="flex-1">
                            <span className="block">{child.name}</span>
                            <span className="block text-sm">
                              /{parent.slug}/{child.slug} ·{" "}
                              {plural(
                                products.get(child.id) ?? 0,
                                "producto",
                                "productos",
                              )}
                            </span>
                          </span>
                          <IconChevronRight className="shrink-0" />
                        </Link>
                        <MoveButtons
                          id={child.id}
                          first={childIndex === 0}
                          last={childIndex === children.length - 1}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

import Link from "next/link";

import { IconHeart } from "@/components/ui/icons";
import { getNavigation } from "@/lib/store/catalog";

import { BagButton } from "./bag-button";
import { MenuDrawer } from "./menu-drawer";
import { SearchDialog } from "./search-dialog";

export async function StoreHeader() {
  const categories = await getNavigation();

  return (
    <header className="sticky top-0 z-40 border-b border-crema-oscuro bg-crema/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4">
        <MenuDrawer categories={categories} />

        <Link
          href="/"
          className="flex min-h-11 items-center font-display text-2xl font-semibold whitespace-nowrap"
        >
          GLOW UP
        </Link>

        <nav aria-label="Categorías" className="ml-8 hidden md:block">
          <ul className="flex items-center gap-1">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/${category.slug}`}
                  className="flex min-h-11 items-center rounded-full px-3 hover:bg-crema-oscuro"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/kits"
                className="flex min-h-11 items-center rounded-full px-3 hover:bg-crema-oscuro"
              >
                Kits
              </Link>
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchDialog />
          <Link
            href="/favoritos"
            aria-label="Favoritos"
            className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro"
          >
            <IconHeart />
          </Link>
          <BagButton />
        </div>
      </div>
    </header>
  );
}

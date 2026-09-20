import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Sparkle } from "@/components/ui/icons";
import { getNavigation } from "@/lib/store/catalog";

export default async function NotFound() {
  const categories = await getNavigation();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-4 py-16">
      <Sparkle className="size-10 text-rosa" />
      <h1 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
        No encontramos esta página
      </h1>
      <p className="mt-2 max-w-[60ch]">
        Puede que el link esté viejo o que hayamos movido algo. Probá desde acá.
      </p>
      <ButtonLink href="/" className="mt-6">
        Ir al inicio
      </ButtonLink>
      <ul className="mt-6 flex flex-wrap gap-2">
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
        <li>
          <Link
            href="/buscar"
            className="inline-flex min-h-11 items-center rounded-full bg-crema-oscuro px-4"
          >
            Buscar
          </Link>
        </li>
      </ul>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type FilterItem = {
  href: string;
  label: string;
  active: boolean;
  /** Pendientes de esa vista; se muestra si es mayor que cero. */
  count?: number;
};

/**
 * Filtros en píldoras. En el celular la fila se desplaza de costado, y al
 * cargar se corre hasta el filtro activo para que no quede fuera de la vista.
 */
export function FilterNav({
  label,
  items,
}: {
  label: string;
  items: FilterItem[];
}) {
  const navRef = useRef<HTMLElement>(null);
  const activeHref = items.find((item) => item.active)?.href;

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const navBox = nav.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    if (box.left < navBox.left || box.right > navBox.right) {
      nav.scrollLeft += box.left - navBox.left - 16;
    }
  }, [activeHref]);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className="mb-5 flex gap-2 overflow-x-auto pb-1"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 ${
            item.active ? "bg-chocolate text-crema" : "bg-crema-oscuro"
          }`}
        >
          {item.label}
          {!!item.count && (
            <span className="rounded-full bg-coral px-2 text-sm font-medium text-chocolate">
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

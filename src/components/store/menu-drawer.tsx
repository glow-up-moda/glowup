"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";

import { IconClose, IconMenu } from "@/components/ui/icons";
import type { Category } from "@/lib/store/catalog";

/** Menú de categorías en el celular. Usa <dialog>: foco y Escape ya funcionan. */
export function MenuDrawer({ categories }: { categories: Category[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Al tocar cualquier link el menú se cierra: el contenido ya cambió detrás.
  const closeOnNavigation = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir el menú"
        className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro md:hidden"
      >
        <IconMenu />
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        aria-label="Menú"
        className="drawer m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-crema p-0 text-chocolate shadow-drawer"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-crema-oscuro px-4 py-3">
            <span className="font-display text-xl font-semibold">GLOW UP</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar el menú"
              className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro"
            >
              <IconClose />
            </button>
          </div>

          <nav
            aria-label="Categorías"
            onClick={closeOnNavigation}
            className="flex-1 overflow-y-auto p-4"
          >
            <ul className="flex flex-col gap-1">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/${category.slug}`}
                    className="flex min-h-11 items-center font-display text-lg font-medium"
                  >
                    {category.name}
                  </Link>
                  {category.children.length > 0 && (
                    <ul className="mb-2 flex flex-col gap-1 pl-3">
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/${category.slug}/${child.slug}`}
                            className="flex min-h-11 items-center text-chocolate/80"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link
                  href="/kits"
                  className="flex min-h-11 items-center font-display text-lg font-medium"
                >
                  Kits
                </Link>
              </li>
            </ul>

            <ul className="mt-6 flex flex-col gap-1 border-t border-crema-oscuro pt-4 text-sm">
              <li>
                <Link
                  href="/guia-de-talles"
                  className="flex min-h-11 items-center"
                >
                  Guía de talles
                </Link>
              </li>
              <li>
                <Link
                  href="/envios-y-cambios"
                  className="flex min-h-11 items-center"
                >
                  Envíos y cambios
                </Link>
              </li>
              <li>
                <Link href="/nosotras" className="flex min-h-11 items-center">
                  Nosotras
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="flex min-h-11 items-center">
                  Contacto
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}

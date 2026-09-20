"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { IconClose, IconSearch, Sparkle } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/images";
import { type ProductCard, searchProducts } from "@/lib/store/catalog";

/**
 * Buscador del header: sugiere mientras se escribe (§7). La página /buscar
 * hace lo mismo sin JavaScript, así que esto es una ayuda, no un requisito.
 */
export function SearchDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  // El resultado guarda con qué término se pidió: si lo que se escribe ahora
  // no coincide, todavía no hay nada que mostrar.
  const [results, setResults] = useState<{
    term: string;
    products: ProductCard[];
  } | null>(null);
  const clean = term.trim();
  const products = results?.term === clean ? results.products : [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    const clean = term.trim();
    if (clean.length < 2) return;
    let active = true;
    // Espera a que deje de escribir antes de preguntarle a la base.
    const timer = setTimeout(() => {
      searchProducts(clean, 6).then((products) => {
        if (active) setResults({ term: clean, products });
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Buscar"
        className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro"
      >
        <IconSearch />
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => {
          setIsOpen(false);
          setTerm("");
        }}
        aria-label="Buscar"
        className="mx-auto mt-0 w-full max-w-xl rounded-b-card bg-crema p-0 text-chocolate shadow-drawer backdrop:bg-chocolate/40"
      >
        <form action="/buscar" className="flex items-center gap-2 p-3">
          <label htmlFor="busqueda" className="sr-only">
            Qué estás buscando
          </label>
          <input
            id="busqueda"
            name="q"
            type="search"
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Corpiño, bombacha, gorra…"
            className="min-h-11 flex-1 rounded-input border-2 border-transparent bg-crema-oscuro px-3 text-base"
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar el buscador"
            className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro"
          >
            <IconClose />
          </button>
        </form>

        {products.length > 0 && (
          <ul className="max-h-[60vh] overflow-y-auto border-t border-crema-oscuro">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/producto/${product.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-crema-oscuro"
                >
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-input bg-crema-oscuro">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productImageUrl(product.images[0].path, "thumb")}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Sparkle className="size-5 text-rosa" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{product.name}</span>
                    <span className="block text-sm">
                      {formatMoney(product.priceCents)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="border-t border-crema-oscuro">
              <Link
                href={`/buscar?q=${encodeURIComponent(clean)}`}
                onClick={() => setIsOpen(false)}
                className="flex min-h-11 items-center px-3 underline underline-offset-4"
              >
                Ver todos los resultados
              </Link>
            </li>
          </ul>
        )}

        {clean.length >= 2 &&
          results?.term === clean &&
          products.length === 0 && (
            <p className="border-t border-crema-oscuro px-3 py-4 text-sm">
              No encontramos nada con “{clean}”. Probá con otra palabra.
            </p>
          )}
      </dialog>
    </>
  );
}

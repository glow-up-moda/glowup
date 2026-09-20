"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconClose } from "@/components/ui/icons";
import { centsToPesosInput } from "@/lib/format";
import type { CategoryFacets, ProductSort } from "@/lib/store/catalog";
import type { ActiveFilters } from "@/lib/store/filters";

const sortOptions: { value: ProductSort; label: string }[] = [
  { value: "nuevo", label: "Lo más nuevo" },
  { value: "precio-asc", label: "Precio: de menor a mayor" },
  { value: "precio-desc", label: "Precio: de mayor a menor" },
];

function countActive(active: ActiveFilters): number {
  return (
    active.sizes.length +
    active.colors.length +
    (active.minPesos ? 1 : 0) +
    (active.maxPesos ? 1 : 0) +
    (active.onlyAvailable ? 1 : 0)
  );
}

/**
 * Filtros del listado (§7). Es un formulario GET: los filtros quedan en la
 * dirección, así se pueden compartir y volver atrás funciona.
 */
export function ProductFilters({
  facets,
  active,
  basePath,
}: {
  facets: CategoryFacets;
  active: ActiveFilters;
  basePath: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sortFormRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = countActive(active);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Filtrar
        {activeCount > 0 && (
          <span className="rounded-full bg-coral px-2 text-sm">
            {activeCount}
          </span>
        )}
      </Button>

      <form ref={sortFormRef} className="flex items-center gap-2">
        {active.sizes.map((size) => (
          <input
            key={`talle-${size}`}
            type="hidden"
            name="talle"
            value={size}
          />
        ))}
        {active.colors.map((color) => (
          <input
            key={`color-${color}`}
            type="hidden"
            name="color"
            value={color}
          />
        ))}
        {active.minPesos && (
          <input type="hidden" name="desde" value={active.minPesos} />
        )}
        {active.maxPesos && (
          <input type="hidden" name="hasta" value={active.maxPesos} />
        )}
        {active.onlyAvailable && (
          <input type="hidden" name="disponibles" value="on" />
        )}
        <label htmlFor="orden" className="text-sm">
          Ordenar
        </label>
        <select
          id="orden"
          name="orden"
          defaultValue={active.sort}
          onChange={() => sortFormRef.current?.requestSubmit()}
          className="min-h-11 rounded-input border-2 border-transparent bg-crema-oscuro px-3 text-base"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <noscript>
          <button
            type="submit"
            className="min-h-11 underline underline-offset-4"
          >
            Ordenar
          </button>
        </noscript>
      </form>

      {activeCount > 0 && (
        <Link href={basePath} className="min-h-11 underline underline-offset-4">
          Limpiar filtros
        </Link>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        aria-label="Filtros"
        className="drawer drawer-right m-0 ml-auto h-dvh max-h-none w-[min(22rem,90vw)] max-w-none bg-crema p-0 text-chocolate shadow-drawer"
      >
        <form className="flex h-full flex-col">
          <input type="hidden" name="orden" value={active.sort} />

          <div className="flex items-center justify-between border-b border-crema-oscuro px-4 py-3">
            <h2 className="font-display text-xl font-semibold">Filtrar</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar los filtros"
              className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro"
            >
              <IconClose />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {facets.sizes.length > 0 && (
              <fieldset className="mb-6">
                <legend className="font-medium">Talle</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facets.sizes.map((size) => (
                    <label
                      key={size}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-crema-oscuro px-3"
                    >
                      <input
                        type="checkbox"
                        name="talle"
                        value={size}
                        defaultChecked={active.sizes.includes(size)}
                        className="size-4 accent-chocolate"
                      />
                      {size}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {facets.colors.length > 0 && (
              <fieldset className="mb-6">
                <legend className="font-medium">Color</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facets.colors.map((color) => (
                    <label
                      key={color}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-crema-oscuro px-3"
                    >
                      <input
                        type="checkbox"
                        name="color"
                        value={color}
                        defaultChecked={active.colors.includes(color)}
                        className="size-4 accent-chocolate"
                      />
                      {color}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="mb-6">
              <legend className="font-medium">Precio</legend>
              <div className="mt-2 flex items-center gap-2">
                <label className="flex-1">
                  <span className="text-sm">Desde</span>
                  <input
                    type="text"
                    name="desde"
                    inputMode="numeric"
                    defaultValue={active.minPesos}
                    placeholder={centsToPesosInput(facets.minCents)}
                    className="min-h-11 w-full rounded-input border-2 border-transparent bg-crema-oscuro px-3 text-base"
                  />
                </label>
                <label className="flex-1">
                  <span className="text-sm">Hasta</span>
                  <input
                    type="text"
                    name="hasta"
                    inputMode="numeric"
                    defaultValue={active.maxPesos}
                    placeholder={centsToPesosInput(facets.maxCents)}
                    className="min-h-11 w-full rounded-input border-2 border-transparent bg-crema-oscuro px-3 text-base"
                  />
                </label>
              </div>
            </fieldset>

            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="disponibles"
                defaultChecked={active.onlyAvailable}
                className="size-5 accent-chocolate"
              />
              Solo lo que hay en stock
            </label>
          </div>

          <div className="border-t border-crema-oscuro p-4">
            <Button type="submit" className="w-full">
              Ver resultados
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

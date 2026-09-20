import { parsePesos } from "@/lib/format";
import { param, paramList } from "@/lib/params";

import type { ProductFilters, ProductSort } from "./catalog";

export type SearchParams = Record<string, string | string[] | undefined>;

export type ActiveFilters = {
  sizes: string[];
  colors: string[];
  minPesos: string;
  maxPesos: string;
  onlyAvailable: boolean;
  sort: ProductSort;
};

function toSort(value: string): ProductSort {
  return value === "precio-asc" || value === "precio-desc" ? value : "nuevo";
}

/**
 * Los filtros viven en la dirección (§7): se comparten, se marcan y el botón
 * de volver funciona. Acá se leen tal como los escribe el formulario.
 */
export function parseFilters(params: SearchParams): {
  active: ActiveFilters;
  query: Omit<ProductFilters, "categoryIds" | "limit">;
} {
  const sizes = paramList(params.talle).filter(Boolean);
  const colors = paramList(params.color).filter(Boolean);
  const minPesos = param(params.desde);
  const maxPesos = param(params.hasta);
  const onlyAvailable = param(params.disponibles) === "on";
  const sort = toSort(param(params.orden));

  return {
    active: { sizes, colors, minPesos, maxPesos, onlyAvailable, sort },
    query: {
      sizes,
      colors,
      minCents: parsePesos(minPesos),
      maxCents: parsePesos(maxPesos),
      onlyAvailable,
      sort,
    },
  };
}

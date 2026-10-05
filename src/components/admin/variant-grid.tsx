"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/field";

// Grilla de variantes: se escriben los colores y los talles una sola vez, y el
// stock se carga en cada cruce. Un corpiño de 2 colores y 4 talles entra en un
// solo envío en vez de ocho.
//
// Los dos campos son opcionales y se pueden usar sueltos: solo colores (una
// remera que viene en tres colores y un talle único), solo talles (una bombacha
// de un color en cuatro talles), o los dos cruzados. Lo que quede vacío se
// guarda en null, que en la base significa "este producto no tiene eso" (§8).
//
// No es una tabla: a 375px una de 4 talles pide 443px y hay que scrollear de
// costado para llegar al último. Va un bloque por color con sus talles, que
// acomoda solo a lo ancho que haya.

/** Separa por comas o por líneas, limpia y saca repetidos sin perder el orden. */
function parseList(value: string): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of value.split(/[,\n]/)) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLocaleLowerCase("es-AR");
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(item);
  }
  return list;
}

/** Para armar ids de campo: solo letras y números. */
function slugCell(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Cell = { color: string | null; size: string | null; label: string };
type Group = { legend: string | null; cells: Cell[] };

/**
 * Arma los bloques según lo que se haya escrito: con las dos listas, un bloque
 * por color; con una sola, un bloque suelto con una casilla por ítem.
 */
function buildGroups(colors: string[], sizes: string[]): Group[] {
  if (colors.length > 0 && sizes.length > 0)
    return colors.map((color) => ({
      legend: color,
      cells: sizes.map((size) => ({ color, size, label: size })),
    }));

  if (colors.length > 0)
    return [
      {
        legend: null,
        cells: colors.map((color) => ({ color, size: null, label: color })),
      },
    ];

  return [
    {
      legend: null,
      cells: sizes.map((size) => ({ color: null, size, label: size })),
    },
  ];
}

export type ExistingVariant = { color: string | null; size: string | null };

export function VariantGrid({
  existing = [],
  defaultColors = "",
  defaultSizes = "",
}: {
  /** Las que el producto ya tiene: se muestran marcadas y no se pueden repetir. */
  existing?: ExistingVariant[];
  defaultColors?: string;
  defaultSizes?: string;
}) {
  const [colorsText, setColorsText] = useState(defaultColors);
  const [sizesText, setSizesText] = useState(defaultSizes);

  const colors = parseList(colorsText);
  const sizes = parseList(sizesText);

  const key = (color: string | null, size: string | null) =>
    `${(color ?? "").toLocaleLowerCase("es-AR")}|${(size ?? "").toLocaleLowerCase("es-AR")}`;
  const already = new Set(
    existing.map((variant) => key(variant.color, variant.size)),
  );

  const groups =
    colors.length === 0 && sizes.length === 0 ? [] : buildGroups(colors, sizes);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Colores"
          name="colores"
          value={colorsText}
          onChange={(event) => setColorsText(event.target.value)}
          autoComplete="off"
          hint="Separados por coma. Si no viene en varios colores, dejalo vacío."
        />
        <TextField
          label="Talles"
          name="talles"
          value={sizesText}
          onChange={(event) => setSizesText(event.target.value)}
          autoComplete="off"
          hint="Separados por coma: 85, 90, 95. Si es talle único, dejalo vacío."
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-sm">
          Cargá los colores, los talles o los dos, y acá aparece la grilla para
          poner el stock de cada uno.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Escribí cuántas unidades tenés de cada una. Las que dejes vacías no
            se crean.
          </p>
          {groups.map((group, groupIndex) => (
            <fieldset
              key={group.legend ?? groupIndex}
              className="rounded-card bg-arena/50 px-3 pt-2 pb-3"
            >
              {group.legend && (
                <legend className="px-1 font-medium">{group.legend}</legend>
              )}
              <div className="flex flex-wrap gap-2">
                {group.cells.map((cell) => {
                  const id = `stock-${slugCell(cell.color ?? "")}-${slugCell(cell.size ?? "")}`;
                  const name = [cell.color, cell.size]
                    .filter(Boolean)
                    .join(", talle ");
                  return (
                    <div key={cell.label} className="flex flex-col gap-1">
                      <label htmlFor={id} className="text-sm">
                        {cell.label}
                      </label>
                      {already.has(key(cell.color, cell.size)) ? (
                        <span className="flex min-h-11 w-full min-w-18 items-center justify-center rounded-input bg-arena px-2 text-sm">
                          ya está
                        </span>
                      ) : (
                        <>
                          <input
                            type="hidden"
                            name="combo"
                            value={JSON.stringify([cell.color, cell.size])}
                          />
                          <input
                            id={id}
                            type="number"
                            name="stock"
                            min={0}
                            max={999}
                            inputMode="numeric"
                            placeholder="0"
                            aria-label={`Stock de ${name}`}
                            className="min-h-11 w-full min-w-18 rounded-input bg-crema px-3 text-base"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}

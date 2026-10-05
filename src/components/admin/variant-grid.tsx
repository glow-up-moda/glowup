"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/field";

// Grilla de variantes: se escriben los colores y los talles una sola vez, y el
// stock se carga en cada cruce. Un corpiño de 2 colores y 4 talles entra en un
// solo envío en vez de ocho.
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

  const already = new Set(
    existing.map(
      (variant) =>
        `${(variant.color ?? "").toLocaleLowerCase("es-AR")}|${(variant.size ?? "").toLocaleLowerCase("es-AR")}`,
    ),
  );
  const exists = (color: string, size: string) =>
    already.has(
      `${color.toLocaleLowerCase("es-AR")}|${size.toLocaleLowerCase("es-AR")}`,
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Colores"
          name="colores"
          value={colorsText}
          onChange={(event) => setColorsText(event.target.value)}
          autoComplete="off"
          hint="Separados por coma. Si no tiene colores, poné uno solo: Único."
        />
        <TextField
          label="Talles"
          name="talles"
          value={sizesText}
          onChange={(event) => setSizesText(event.target.value)}
          autoComplete="off"
          hint="Separados por coma. Por ejemplo: 85, 90, 95, 100."
        />
      </div>

      {colors.length > 0 && sizes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Escribí cuántas unidades tenés de cada una. Las que dejes vacías no
            se crean.
          </p>
          {colors.map((color) => (
            <fieldset
              key={color}
              className="rounded-card bg-arena/50 px-3 pt-2 pb-3"
            >
              <legend className="px-1 font-medium">{color}</legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const id = `stock-${slugCell(color)}-${slugCell(size)}`;
                  return (
                    <div key={size} className="flex flex-col gap-1">
                      <label htmlFor={id} className="text-sm">
                        {size}
                      </label>
                      {exists(color, size) ? (
                        <span className="flex min-h-11 w-18 items-center justify-center rounded-input bg-arena text-sm">
                          ya está
                        </span>
                      ) : (
                        <>
                          <input
                            type="hidden"
                            name="combo"
                            value={JSON.stringify([color, size])}
                          />
                          <input
                            id={id}
                            type="number"
                            name="stock"
                            min={0}
                            max={999}
                            inputMode="numeric"
                            placeholder="0"
                            aria-label={`Stock de ${color}, talle ${size}`}
                            className="min-h-11 w-18 rounded-input bg-crema px-3 text-base"
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
      ) : (
        <p className="text-sm">
          Cargá los colores y los talles y acá aparece la grilla para poner el
          stock de cada uno.
        </p>
      )}
    </div>
  );
}

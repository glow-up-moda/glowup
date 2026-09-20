import type { Metadata } from "next";
import Link from "next/link";

import { Block, PageShell } from "@/components/store/page-shell";
import { compareSizes } from "@/lib/sizes";
import { createCatalogClient } from "@/lib/supabase/catalog";

export const metadata: Metadata = {
  title: "Guía de talles · GLOW UP",
  description: "Cómo medirte y qué talle elegir en GLOW UP.",
};

export default async function SizeGuidePage() {
  const supabase = createCatalogClient();
  const { data } = await supabase.from("product_variants").select("size");
  const sizes = [...new Set((data ?? []).map((variant) => variant.size))].sort(
    compareSizes,
  );

  return (
    <PageShell
      title="Guía de talles"
      intro="Medite con una cinta, sin apretar, y elegí con confianza."
    >
      <Block title="Cómo medirte">
        <p>
          <span className="font-medium">Busto:</span> pasá la cinta por la parte
          más ancha del busto, con el corpiño que más usás puesto.
        </p>
        <p>
          <span className="font-medium">Contorno:</span> justo debajo del busto,
          donde apoya la banda del corpiño.
        </p>
        <p>
          <span className="font-medium">Cadera:</span> por la parte más ancha,
          con la cinta paralela al piso.
        </p>
      </Block>

      <Block title="Talles que manejamos">
        {sizes.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <li
                key={size}
                className="inline-flex min-h-11 items-center rounded-full bg-crema-oscuro px-4"
              >
                {size}
              </li>
            ))}
          </ul>
        ) : (
          <p>Estamos cargando el catálogo.</p>
        )}
        <p className="text-sm">
          Cada producto muestra los talles que tiene disponibles y las medidas
          de esa prenda en la pestaña “Medidas”.
        </p>
      </Block>

      <Block title="Entre dos talles">
        <p>
          Si quedás justo en el medio, te conviene el más grande: la ropa
          interior tiene que sentirse cómoda todo el día, sin marcar.
        </p>
        <p>
          ¿Dudás? Escribinos por WhatsApp con tus medidas y te decimos cuál
          pedir. También podés ver{" "}
          <Link
            href="/envios-y-cambios"
            className="underline underline-offset-4"
          >
            cómo funcionan los cambios
          </Link>
          .
        </p>
      </Block>
    </PageShell>
  );
}

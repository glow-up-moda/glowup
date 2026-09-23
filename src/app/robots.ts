import type { MetadataRoute } from "next";

import { absoluteUrl, INDEXABLE } from "@/lib/site";

// robots.txt (§14). Hasta el lanzamiento se pide que no entre nadie; después,
// que no entren el panel, el checkout ni las páginas de un pedido, que no
// tienen nada que buscar y son de una sola persona.

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/checkout",
          "/pedido/",
          "/seguimiento",
          "/bolsa/",
          "/baja/",
          "/favoritos",
          "/buscar",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

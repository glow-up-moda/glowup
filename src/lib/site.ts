// Dirección pública del sitio y si ya puede aparecer en Google.

/**
 * URL base, sin barra al final. Se usa para los links de los emails, los
 * callbacks de Ualá Bis y las direcciones absolutas del Open Graph.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Mientras esté en false, la tienda pide no ser indexada: el catálogo está a
 * medio armar y los pagos son de prueba. Se pone en true al lanzar (§16,
 * fase 9) y con eso cambian a la vez el `noindex` del layout, el robots.txt y
 * el sitemap.
 */
export const INDEXABLE = false;

/**
 * Dónde llega el envío en el día. Vive acá porque lo nombran el inicio, los
 * listados, la ficha de producto, Envíos y cambios, las preguntas frecuentes,
 * Nosotras y los textos que ve Google: escrito en cada lugar, se desincroniza
 * apenas se suma una localidad.
 */
export const SAME_DAY_CITIES =
  "Paraná, Colonia Avellaneda, Oro Verde y San Benito";

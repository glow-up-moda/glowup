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

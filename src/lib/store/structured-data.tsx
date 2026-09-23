import type { ProductDetail } from "@/lib/store/product";
import { productImageUrl } from "@/lib/images";
import { absoluteUrl } from "@/lib/site";

// Datos estructurados (§14). Es lo que lee Google para mostrar precio,
// disponibilidad y estrellas en el resultado de búsqueda.
//
// Los precios van en pesos con dos decimales y punto, como pide schema.org:
// la base los guarda en centavos.

const SCHEMA = "https://schema.org";

function price(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function productJsonLd(product: ProductDetail) {
  const available = product.variants.some((variant) => variant.isAvailable);
  const url = absoluteUrl(`/producto/${product.slug}`);

  return {
    "@context": SCHEMA,
    "@type": "Product",
    name: product.name,
    description: product.seoDescription ?? product.description ?? undefined,
    ...(product.images.length > 0
      ? { image: product.images.map((image) => productImageUrl(image.path)) }
      : {}),
    brand: { "@type": "Brand", name: "GLOW UP" },
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "ARS",
      price: price(product.priceCents),
      availability: `${SCHEMA}/${available ? "InStock" : "OutOfStock"}`,
      itemCondition: `${SCHEMA}/NewCondition`,
    },
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.average.toFixed(1),
            reviewCount: product.rating.count,
          },
        }
      : {}),
    ...(product.reviews.length > 0
      ? {
          review: product.reviews.map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.name ?? "Clienta" },
            datePublished: review.createdAt.slice(0, 10),
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
            },
            reviewBody: review.text,
          })),
        }
      : {}),
  };
}

/** El script que va en la página. El JSON se escapa para no cortar el HTML. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\u003c"),
      }}
    />
  );
}

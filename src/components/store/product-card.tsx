import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type {
  KitCard,
  ProductCard as ProductCardData,
} from "@/lib/store/catalog";
import { formatMoney } from "@/lib/format";

import { ProductImage } from "./product-image";

const CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

function Price({
  priceCents,
  compareAtPriceCents,
}: {
  priceCents: number;
  compareAtPriceCents: number | null;
}) {
  const onSale =
    compareAtPriceCents != null && compareAtPriceCents > priceCents;
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-2">
      <span className="font-medium">{formatMoney(priceCents)}</span>
      {onSale && (
        <span className="text-sm line-through">
          {formatMoney(compareAtPriceCents)}
        </span>
      )}
    </p>
  );
}

export function ProductCard({
  product,
  priority,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const onSale =
    product.compareAtPriceCents != null &&
    product.compareAtPriceCents > product.priceCents;

  return (
    <article>
      <Link
        href={`/producto/${product.slug}`}
        className="group block rounded-card focus-visible:outline-offset-4"
      >
        <span className="relative block aspect-4/5 overflow-hidden rounded-card bg-crema-oscuro">
          <ProductImage
            images={product.images}
            sizes={CARD_SIZES}
            priority={priority}
          />
          <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {onSale && <Badge tone="offer">Oferta</Badge>}
            {!product.isAvailable ? (
              <Badge>Sin stock</Badge>
            ) : (
              product.isLastUnits && (
                <Badge tone="accent">Últimas unidades</Badge>
              )
            )}
          </span>
        </span>
        <h3 className="mt-3 font-medium">{product.name}</h3>
        <Price
          priceCents={product.priceCents}
          compareAtPriceCents={product.compareAtPriceCents}
        />
        {product.colors.length > 1 && (
          <p className="text-sm">{product.colors.length} colores</p>
        )}
      </Link>
    </article>
  );
}

export function KitCardItem({ kit }: { kit: KitCard }) {
  return (
    <article>
      <Link
        href={`/kits#${kit.slug}`}
        className="group block rounded-card focus-visible:outline-offset-4"
      >
        <span className="relative block aspect-4/5 overflow-hidden rounded-card bg-crema-oscuro">
          <ProductImage images={kit.images} sizes={CARD_SIZES} />
          <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
            <Badge tone="accent">Kit</Badge>
            {!kit.isAvailable && <Badge>Sin stock</Badge>}
          </span>
        </span>
        <h3 className="mt-3 font-medium">{kit.name}</h3>
        <Price
          priceCents={kit.priceCents}
          compareAtPriceCents={kit.compareAtPriceCents}
        />
      </Link>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { TrackEvent } from "@/components/store/track-event";
import { IconStar } from "@/components/ui/icons";
import { formatDate, formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/images";
import { getNavigation } from "@/lib/store/catalog";
import { getProductBySlug, listRelatedProducts } from "@/lib/store/product";
import { getStoreSettings, transferPrice } from "@/lib/store/settings";
import { JsonLd, productJsonLd } from "@/lib/store/structured-data";

import { notifyWhenBackInStock } from "./actions";

export async function generateMetadata({
  params,
}: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const title = product.seoTitle ?? `${product.name} · GLOW UP`;
  const description =
    product.seoDescription ??
    product.description?.slice(0, 160) ??
    `${product.name} en GLOW UP. Envío a todo el país.`;
  const photo = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/producto/${product.slug}` },
    // Compartir un producto por WhatsApp muestra la foto y el precio (§14).
    // Sin foto no se declara nada: definir openGraph acá reemplaza el del
    // layout entero, así que el link quedaría sin vista previa. Un producto
    // publicado siempre tiene fotos (§7).
    ...(photo
      ? {
          openGraph: {
            type: "website" as const,
            title,
            description: `${formatMoney(product.priceCents)} · ${description}`,
            url: `/producto/${product.slug}`,
            images: [{ url: productImageUrl(photo.path), alt: photo.alt }],
          },
        }
      : {}),
  };
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-0.5 text-coral"
      aria-label={`${rating.toFixed(1).replace(".", ",")} de 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          className={star <= rounded ? "" : "text-crema-oscuro"}
        />
      ))}
    </span>
  );
}

function Accordion({
  title,
  children,
  open,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="border-b border-crema-oscuro py-2 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-medium">
        {title}
        <span aria-hidden="true" className="text-chocolate/60">
          +
        </span>
      </summary>
      <div className="pb-3 whitespace-pre-line">{children}</div>
    </details>
  );
}

export default async function ProductPage({
  params,
}: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related, navigation] = await Promise.all([
    getStoreSettings(),
    listRelatedProducts(product),
    getNavigation(),
  ]);

  const category = navigation.find(
    (item) =>
      item.id === product.categoryId ||
      item.children.some((child) => child.id === product.categoryId),
  );
  const subcategory = category?.children.find(
    (child) => child.id === product.categoryId,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-10">
      <JsonLd data={productJsonLd(product)} />
      <TrackEvent
        event={{
          name: "ViewContent",
          items: [
            {
              id: product.id,
              name: product.name,
              quantity: 1,
              priceCents: product.priceCents,
            },
          ],
        }}
      />

      <nav aria-label="Migas de pan" className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="underline underline-offset-4">
              Inicio
            </Link>
          </li>
          {category && (
            <li className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link
                href={`/${category.slug}`}
                className="underline underline-offset-4"
              >
                {category.name}
              </Link>
            </li>
          )}
          {category && subcategory && (
            <li className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link
                href={`/${category.slug}/${subcategory.slug}`}
                className="underline underline-offset-4"
              >
                {subcategory.name}
              </Link>
            </li>
          )}
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">
            {product.name}
          </h1>
          {product.rating && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Stars rating={product.rating.average} />
              <a href="#resenas" className="underline underline-offset-4">
                {product.rating.count === 1
                  ? "1 reseña"
                  : `${product.rating.count} reseñas`}
              </a>
            </p>
          )}

          <div className="mt-5">
            <ProductPurchase
              product={product}
              transferPriceCents={transferPrice(
                product.priceCents,
                settings.transferDiscountPercent,
              )}
              transferDiscountPercent={settings.transferDiscountPercent}
              notifyAction={notifyWhenBackInStock}
            />
          </div>

          <div className="mt-8">
            {product.description && (
              <Accordion title="Descripción" open>
                {product.description}
              </Accordion>
            )}
            {product.materialsCare && (
              <Accordion title="Materiales y cuidados">
                {product.materialsCare}
              </Accordion>
            )}
            {product.measurements && (
              <Accordion title="Medidas">{product.measurements}</Accordion>
            )}
            <Accordion title="Envíos y cambios">
              <p>
                Enviamos a todo el país. En Paraná y Oro Verde, envío en el día
                {settings.sameDayCutoffTime
                  ? ` comprando antes de las ${settings.sameDayCutoffTime}`
                  : ""}
                . Todo viaja en embalaje discreto: desde afuera no se ve qué hay
                adentro.
              </p>
              <p className="mt-2">
                <Link
                  href="/envios-y-cambios"
                  className="underline underline-offset-4"
                >
                  Ver zonas, costos y cómo hacer un cambio
                </Link>
              </p>
            </Accordion>
          </div>
        </div>
      </div>

      {product.reviews.length > 0 && (
        <section id="resenas" className="mt-12">
          <h2 className="font-display text-xl font-semibold">
            Lo que dicen las clientas
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {product.reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-card bg-crema-oscuro/50 p-4"
              >
                <Stars rating={review.rating} />
                {review.text && <p className="mt-2">{review.text}</p>}
                <p className="mt-2 text-sm">
                  {review.name ?? "Clienta"} · {formatDate(review.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Combinalo con</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

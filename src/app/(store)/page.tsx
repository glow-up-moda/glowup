import type { Metadata } from "next";
import Link from "next/link";

import { KitCardItem, ProductCard } from "@/components/store/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Sparkle } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { getNavigation, listKits, listProducts } from "@/lib/store/catalog";
import { getStoreSettings } from "@/lib/store/settings";

export const metadata: Metadata = {
  title: "GLOW UP · Ropa interior y accesorios",
  description:
    "Ropa interior y accesorios con envío a todo el país. En Paraná y Oro Verde, envío en el día.",
};

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {href && linkLabel && (
          <Link href={href} className="underline underline-offset-4">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [categories, products, kits, settings] = await Promise.all([
    getNavigation(),
    listProducts({ limit: 8 }),
    listKits(3),
    getStoreSettings(),
  ]);

  const benefits = [
    settings.sameDayCutoffTime
      ? `Envío en el día en Paraná y Oro Verde, comprando antes de las ${settings.sameDayCutoffTime}`
      : "Envío en el día en Paraná y Oro Verde",
    settings.freeShippingThresholdCents
      ? `Envío gratis desde ${formatMoney(settings.freeShippingThresholdCents)}`
      : "Enviamos a todo el país",
    settings.transferDiscountPercent > 0
      ? `${settings.transferDiscountPercent}% de descuento pagando por transferencia`
      : "Pagás con tarjeta o por transferencia",
    "Embalaje discreto: nadie ve qué hay adentro",
    "Cambios sin vueltas dentro de los 15 días",
  ];

  return (
    <>
      {/* Hero: el único momento orquestado del sitio (§6). */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 size-80 rounded-full bg-rosa/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 bottom-0 size-72 rounded-full bg-coral/30 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h1
              className="rise font-display text-3xl font-semibold text-balance md:text-4xl"
              style={{ animationDelay: "60ms" }}
            >
              Ropa interior que se siente tan bien como se ve
            </h1>
            <p
              className="mt-4 max-w-[45ch] rise text-lg"
              style={{ animationDelay: "180ms" }}
            >
              Diseños suaves, talles reales y envío en el día en Paraná y Oro
              Verde.
            </p>
            <div className="mt-6 rise" style={{ animationDelay: "300ms" }}>
              <ButtonLink href="/ropa-interior">Ver la colección</ButtonLink>
            </div>
          </div>

          <div className="relative rise" style={{ animationDelay: "120ms" }}>
            <div className="relative mx-auto flex aspect-4/5 w-full max-w-sm items-center justify-center overflow-hidden arch bg-crema-oscuro">
              <Sparkle
                className="size-20 shine text-rosa"
                style={{ animationDelay: "500ms" }}
              />
            </div>
          </div>
        </div>
      </section>

      <Section title="Qué estás buscando">
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[
            ...categories.map((category) => ({
              href: `/${category.slug}`,
              name: category.name,
            })),
            { href: "/kits", name: "Kits" },
          ].map((category) => (
            <li key={category.href}>
              <Link
                href={category.href}
                className="group flex flex-col gap-3 rounded-card focus-visible:outline-offset-4"
              >
                <span className="flex aspect-square items-center justify-center overflow-hidden rounded-card bg-crema-oscuro transition-transform duration-300 ease-brand group-hover:scale-[1.02]">
                  <Sparkle className="size-10 text-rosa" />
                </span>
                <span className="font-display text-lg font-medium">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {products.length > 0 && (
        <Section title="Lo nuevo" href="/ropa-interior" linkLabel="Ver todo">
          <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
            {products.map((product, index) => (
              <li
                key={product.id}
                className="w-[60vw] shrink-0 snap-start sm:w-[40vw] md:w-auto"
              >
                <ProductCard product={product} priority={index < 2} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {kits.length > 0 && (
        <Section title="Kits armados" href="/kits" linkLabel="Ver los kits">
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {kits.map((kit) => (
              <li key={kit.id}>
                <KitCardItem kit={kit} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <section className="bg-crema-oscuro/50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="font-display text-2xl font-semibold">
            Comprar acá es fácil
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <Sparkle className="mt-1 size-5 shrink-0 text-coral" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Sparkle } from "@/components/ui/icons";
import { productImageUrl } from "@/lib/images";

/**
 * Galería con swipe en el celular y miniaturas en escritorio (§7). Mientras el
 * producto no tenga fotos, muestra el destello de la marca.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: { path: string; alt: string }[];
  name: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-4/5 items-center justify-center rounded-card bg-crema-oscuro">
        <Sparkle className="size-16 text-rosa" />
        <span className="sr-only">{name} todavía no tiene fotos.</span>
      </div>
    );
  }

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * index, behavior: "smooth" });
    setCurrent(index);
  }

  return (
    <div>
      <ul
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          setCurrent(Math.round(track.scrollLeft / track.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-card"
      >
        {images.map((image, index) => (
          <li key={image.path} className="w-full shrink-0 snap-center">
            <span className="relative block aspect-4/5 overflow-hidden bg-crema-oscuro">
              <Image
                src={productImageUrl(image.path)}
                alt={image.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={index === 0}
                className="object-cover"
              />
            </span>
          </li>
        ))}
      </ul>

      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <button
              key={image.path}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ver la foto ${index + 1} de ${images.length}`}
              aria-current={current === index ? "true" : undefined}
              className={`relative size-16 overflow-hidden rounded-input border-2 ${
                current === index ? "border-chocolate" : "border-transparent"
              }`}
            >
              <Image
                src={productImageUrl(image.path, "thumb")}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

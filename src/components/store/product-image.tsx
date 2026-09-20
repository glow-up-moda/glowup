import Image from "next/image";

import { Sparkle } from "@/components/ui/icons";
import { productImageUrl } from "@/lib/images";

/**
 * Foto de producto en proporción 4:5 (§5). La segunda foto aparece al pasar el
 * mouse en escritorio. Mientras un producto no tenga fotos, muestra el
 * destello de la marca en vez de un hueco vacío.
 */
export function ProductImage({
  images,
  sizes,
  priority,
}: {
  images: { path: string; alt: string }[];
  sizes: string;
  priority?: boolean;
}) {
  const [first, second] = images;

  if (!first) {
    return (
      <span className="flex size-full items-center justify-center bg-crema-oscuro">
        <Sparkle className="size-12 text-rosa" />
      </span>
    );
  }

  return (
    <>
      <Image
        src={productImageUrl(first.path)}
        alt={first.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-300 ease-brand group-hover:scale-[1.03]"
      />
      {second && (
        <Image
          src={productImageUrl(second.path)}
          alt=""
          fill
          sizes={sizes}
          className="object-cover opacity-0 transition-opacity duration-[400ms] ease-brand group-hover:opacity-100 motion-reduce:hidden"
        />
      )}
    </>
  );
}

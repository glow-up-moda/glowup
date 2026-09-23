"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Sparkle } from "@/components/ui/icons";

/**
 * Cuando algo falla en la tienda, esto es lo que ve una clienta: un error con
 * la cara de la marca y una salida, en vez de la pantalla de Next.
 *
 * El error se manda a la consola del servidor, que es lo que se lee mientras
 * no haya un servicio de monitoreo (§16, fase 9).
 */
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tienda]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-4 py-16">
      <Sparkle className="size-10 text-rosa" />
      <h1 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
        Se nos rompió algo
      </h1>
      <p className="mt-2 max-w-[60ch]">
        No es culpa tuya. Probá de nuevo; si sigue igual, escribinos y lo
        resolvemos.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset}>Probar de nuevo</Button>
        <ButtonLink href="/contacto" variant="secondary">
          Escribinos
        </ButtonLink>
      </div>
      {error.digest && (
        <p className="mt-6 text-sm">
          Si nos escribís, pasanos este código: {error.digest}
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

/** Un error del panel, con la salida a mano y el código para buscarlo. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-display text-2xl font-semibold">
        No pudimos cargar esto
      </h1>
      <Notice tone="error">
        Algo falló al traer los datos. Probá de nuevo; si sigue igual, recargá
        la página.
        {error.digest ? ` Código: ${error.digest}.` : ""}
      </Notice>
      <Button onClick={reset}>Probar de nuevo</Button>
    </div>
  );
}

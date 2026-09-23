"use client";

import { useEffect } from "react";

/**
 * Último recurso: un error que rompe hasta el layout raíz. Tiene que traer su
 * propio <html> y <body>, y no puede usar los componentes de la app porque
 * quizás fue uno de ellos el que falló. Por eso los estilos van a mano.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="es-AR">
      <body
        style={{
          backgroundColor: "#FFF7EE",
          color: "#3A2925",
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: "64px 16px",
        }}
      >
        <main style={{ margin: "0 auto", maxWidth: "36rem" }}>
          <h1 style={{ fontSize: "25px", margin: "0 0 12px" }}>
            Se nos rompió algo
          </h1>
          <p style={{ lineHeight: 1.6, margin: "0 0 24px" }}>
            No es culpa tuya. Recargá la página; si sigue igual, escribinos y lo
            resolvemos.
          </p>
          {/* A propósito no es <Link>: si se rompió el layout raíz, el router
              puede estar roto también, y acá lo que hace falta es recargar la
              página entera. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              backgroundColor: "#F27F73",
              borderRadius: "999px",
              color: "#3A2925",
              display: "inline-block",
              padding: "12px 24px",
              textDecoration: "none",
            }}
          >
            Ir al inicio
          </a>
          {error.digest && (
            <p style={{ fontSize: "14px", marginTop: "24px" }}>
              Código: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}

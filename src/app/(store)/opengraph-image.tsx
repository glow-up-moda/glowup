import { ImageResponse } from "next/og";

// Imagen que se ve al compartir un link de la tienda por WhatsApp o Instagram
// (§14). Es provisoria: cuando exista el logo en SVG (§17) se reemplaza por
// una imagen de verdad. Las páginas de producto usan la foto del producto.

export const alt = "GLOW UP · Ropa interior y accesorios";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        backgroundColor: "#FFF7EE",
        color: "#3A2925",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: 4 }}>
        GLOW UP
      </div>
      <div style={{ fontSize: 40 }}>Ropa interior y accesorios</div>
      <div style={{ fontSize: 30, color: "#3A2925", opacity: 0.8 }}>
        Paraná, Entre Ríos · Envíos a todo el país
      </div>
    </div>,
    size,
  );
}

import type { NextConfig } from "next";

// Las fotos de productos se sirven desde Supabase Storage.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto. Sin esto, Turbopack sube buscando lockfiles,
  // encuentra uno suelto en la carpeta del usuario y avisa en cada build.
  turbopack: { root: import.meta.dirname },
  experimental: {
    serverActions: {
      // Fotos del panel: el navegador las achica antes de subirlas, así que
      // 5 MB sobra y queda debajo del límite de 6 MB de las funciones de Netlify.
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

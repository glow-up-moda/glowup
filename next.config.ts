import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto. Sin esto, Turbopack sube buscando lockfiles,
  // encuentra uno suelto en la carpeta del usuario y avisa en cada build.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;

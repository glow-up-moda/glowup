import type { Metadata, Viewport } from "next";
import { DM_Sans, Fredoka } from "next/font/google";

import { INDEXABLE, SAME_DAY_CITIES, siteUrl } from "@/lib/site";

import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fredoka",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const description = `Prendas y accesorios. Envío a todo el país, y en el día en ${SAME_DAY_CITIES}.`;

export const metadata: Metadata = {
  // Con esto las direcciones del Open Graph salen absolutas, que es lo que
  // necesitan WhatsApp e Instagram para mostrar la vista previa (§14).
  metadataBase: new URL(siteUrl()),
  // Cada página escribe su título completo, con el "· MAREA" incluido.
  title: "MAREA",
  description,
  openGraph: {
    type: "website",
    siteName: "MAREA",
    locale: "es_AR",
    title: "MAREA",
    description,
  },
  // Hasta el lanzamiento el sitio muestra la tienda a medio armar y pagos de
  // prueba: no queremos que Google lo indexe (§16, fase 9). Se cambia en
  // src/lib/site.ts, que es lo mismo que mira el robots.txt.
  robots: INDEXABLE ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#FFF9F0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fredoka.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

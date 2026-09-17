import type { Metadata, Viewport } from "next";
import { DM_Sans, Fredoka } from "next/font/google";
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

export const metadata: Metadata = {
  title: "GLOW UP",
  description:
    "Ropa interior y accesorios. Envío a todo el país, y en el día en Paraná y Oro Verde.",
  // Hasta el lanzamiento el sitio muestra la tienda a medio armar y pagos de
  // prueba: no queremos que Google lo indexe (ver §16, fase 9).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#FFF7EE",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fredoka.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import Link from "next/link";

import { getStoreSettings, storeWhatsappLink } from "@/lib/store/settings";

const help = [
  { href: "/guia-de-talles", label: "Guía de talles" },
  { href: "/envios-y-cambios", label: "Envíos y cambios" },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { href: "/seguimiento", label: "Seguir mi pedido" },
];

const about = [
  { href: "/nosotras", label: "Nosotras" },
  { href: "/contacto", label: "Contacto" },
];

const legal = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/arrepentimiento", label: "Botón de arrepentimiento" },
];

export async function StoreFooter() {
  const { whatsappNumber } = await getStoreSettings();
  const whatsapp = storeWhatsappLink(
    whatsappNumber,
    "¡Hola! Tengo una consulta.",
  );

  return (
    <footer className="mt-16 border-t border-crema-oscuro bg-crema-oscuro/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-semibold">GLOW UP</p>
          <p className="mt-2 max-w-[30ch] text-sm">
            Ropa interior y accesorios. Paraná, Entre Ríos. Enviamos a todo el
            país.
          </p>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Escribinos por WhatsApp
            </a>
          )}
        </div>

        <nav aria-labelledby="pie-ayuda">
          <h2 id="pie-ayuda" className="font-medium">
            Ayuda
          </h2>
          <ul className="mt-2 flex flex-col">
            {help.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center text-sm underline underline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="pie-marca">
          <h2 id="pie-marca" className="font-medium">
            La marca
          </h2>
          <ul className="mt-2 flex flex-col">
            {about.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center text-sm underline underline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="pie-legales">
          <h2 id="pie-legales" className="font-medium">
            Legales
          </h2>
          <ul className="mt-2 flex flex-col">
            {legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center text-sm underline underline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center text-sm underline underline-offset-4"
              >
                Defensa del Consumidor
              </a>
            </li>
          </ul>
        </nav>
      </div>

      {/* Falta el QR de Data Fiscal de ARCA: necesita el CUIT (§17). */}
      <div className="border-t border-crema-oscuro">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm">
          © {new Date().getFullYear()} GLOW UP
        </p>
      </div>
    </footer>
  );
}

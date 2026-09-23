"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconBag,
  IconChart,
  IconHome,
  IconInfo,
  IconMore,
  IconOrders,
  IconProducts,
  IconSettings,
  IconStar,
  IconStock,
  IconTag,
  IconTicket,
  IconTruck,
} from "@/components/ui/icons";

type Item = {
  href: string;
  label: string;
  icon: typeof IconHome;
  inBottomBar?: boolean;
};

const items: Item[] = [
  { href: "/admin", label: "Inicio", icon: IconHome, inBottomBar: true },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: IconOrders,
    inBottomBar: true,
  },
  {
    href: "/admin/productos",
    label: "Productos",
    icon: IconProducts,
    inBottomBar: true,
  },
  { href: "/admin/stock", label: "Stock", icon: IconStock, inBottomBar: true },
  { href: "/admin/precios", label: "Precios", icon: IconTag },
  { href: "/admin/cupones", label: "Cupones", icon: IconTicket },
  { href: "/admin/kits", label: "Kits", icon: IconBag },
  { href: "/admin/resenas", label: "Reseñas", icon: IconStar },
  { href: "/admin/reposiciones", label: "Reposiciones", icon: IconInfo },
  { href: "/admin/reportes", label: "Reportes", icon: IconChart },
  { href: "/admin/zonas", label: "Zonas de envío", icon: IconTruck },
  { href: "/admin/configuracion", label: "Configuración", icon: IconSettings },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="mt-8">
      <ul className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-full px-4 transition-colors duration-150 ${
                  active ? "bg-rosa font-medium" : "hover:bg-crema-oscuro"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const moreSections = [
  "/admin/precios",
  "/admin/cupones",
  "/admin/configuracion",
  "/admin/mas",
];

/** Barra inferior del celular: lo de todos los días a un toque, el resto en "Más". */
export function BottomNav() {
  const pathname = usePathname();
  const bottom = items.filter((item) => item.inBottomBar);
  const moreActive = moreSections.some((href) => isActive(pathname, href));

  return (
    <nav
      aria-label="Panel"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-crema-oscuro bg-crema pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="grid grid-cols-5">
        {[...bottom, { href: "/admin/mas", label: "Más", icon: IconMore }].map(
          ({ href, label, icon: Icon }) => {
            const active =
              href === "/admin/mas" ? moreActive : isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 text-sm"
                >
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ${
                      active ? "bg-rosa" : ""
                    }`}
                  >
                    <Icon />
                  </span>
                  <span className={active ? "font-medium" : ""}>{label}</span>
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}

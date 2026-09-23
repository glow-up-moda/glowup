import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import {
  IconBag,
  IconChart,
  IconChevronRight,
  IconInfo,
  IconLogOut,
  IconSettings,
  IconStar,
  IconTag,
  IconTicket,
  IconTruck,
} from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/admin";

import { signOut } from "../../actions";

export const metadata: Metadata = { title: "Más" };

const links = [
  {
    href: "/admin/precios",
    label: "Precios",
    description: "Aumentos y descuentos masivos",
    icon: IconTag,
  },
  {
    href: "/admin/cupones",
    label: "Cupones",
    description: "Crear, pausar y ver usos",
    icon: IconTicket,
  },
  {
    href: "/admin/kits",
    label: "Kits",
    description: "Combos armados: qué traen y a qué precio",
    icon: IconBag,
  },
  {
    href: "/admin/reportes",
    label: "Reportes",
    description: "Más vendidos, talles y margen",
    icon: IconChart,
  },
  {
    href: "/admin/reposiciones",
    label: "Avisos de reposición",
    description: "Quién está esperando un talle agotado",
    icon: IconInfo,
  },
  {
    href: "/admin/resenas",
    label: "Reseñas",
    description: "Publicar o rechazar lo que escriben las clientas",
    icon: IconStar,
  },
  {
    href: "/admin/zonas",
    label: "Zonas de envío",
    description: "Costos, plazos y envío en el día",
    icon: IconTruck,
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    description: "Descuentos, envío gratis, datos bancarios y avisos",
    icon: IconSettings,
  },
];

export default async function MorePage() {
  await requireAdmin();

  return (
    <>
      <PageHeader title="Más" />
      <ul className="flex flex-col gap-2">
        {links.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-16 items-center gap-4 rounded-card bg-crema-oscuro/60 px-4 py-3"
            >
              <Icon className="shrink-0" />
              <span className="flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-sm">{description}</span>
              </span>
              <IconChevronRight className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="flex min-h-11 items-center gap-2 rounded-full px-3 underline underline-offset-4"
        >
          <IconLogOut />
          Salir del panel
        </button>
      </form>
    </>
  );
}

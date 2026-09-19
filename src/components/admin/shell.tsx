import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/app/admin/actions";
import { IconLogOut } from "@/components/ui/icons";

import { BottomNav, SideNav } from "./nav";

/** Estructura del panel: barra lateral en escritorio, barra inferior en el celular. */
export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-crema-oscuro px-4 py-6 md:flex print:hidden">
        <Link
          href="/admin"
          className="px-4 font-display text-2xl font-semibold"
        >
          GLOW UP
        </Link>
        <p className="px-4 text-sm">Panel</p>
        <SideNav />
        <div className="mt-auto px-4">
          <p className="truncate text-sm">{name}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-1 -ml-3 flex min-h-11 items-center gap-2 rounded-full px-3 hover:bg-crema-oscuro"
            >
              <IconLogOut />
              Salir
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-crema-oscuro px-4 md:hidden print:hidden">
          <Link href="/admin" className="font-display text-xl font-semibold">
            GLOW UP
          </Link>
          <span className="truncate pl-4 text-sm">{name}</span>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 md:px-8 md:pb-12 print:p-0">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

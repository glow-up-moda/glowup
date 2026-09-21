"use client";

import { usePathname } from "next/navigation";

import { IconWhatsApp } from "@/components/ui/icons";

/** En el checkout no aparece: ahí la clienta está terminando de comprar (§7). */
export function WhatsappFab({ href }: { href: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout")) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-coral text-chocolate shadow-soft transition-colors duration-150 ease-brand hover:bg-rosa"
    >
      <IconWhatsApp width={26} height={26} />
    </a>
  );
}

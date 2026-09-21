import "server-only";

import { cookies } from "next/headers";

// Los números de pedido son correlativos, así que /pedido/[numero] no puede
// mostrarse solo con el número: o el pedido se hizo en este navegador, o hay
// que escribir el email con el que se compró (§7, /seguimiento).

const COOKIE = "glowup-pedidos";
const MAX_REMEMBERED = 20;
const SIX_MONTHS = 60 * 60 * 24 * 180;

export async function rememberedOrders(): Promise<string[]> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  return raw ? raw.split(",").filter(Boolean) : [];
}

export async function rememberOrder(number: string): Promise<void> {
  const current = await rememberedOrders();
  if (current.includes(number)) return;
  const store = await cookies();
  store.set(COOKIE, [number, ...current].slice(0, MAX_REMEMBERED).join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIX_MONTHS,
  });
}

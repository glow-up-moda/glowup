"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { rememberOrder } from "@/lib/orders/access";
import { parseOrderNumber } from "@/lib/orders/number";
import { createAdminClient } from "@/lib/supabase/admin";

// Para ver un pedido que no se hizo en este navegador hay que saber el número
// y el email con el que se compró (§7). El mensaje de error es siempre el
// mismo, así que desde afuera no se puede averiguar qué números existen.

export type FindOrderState = { error?: string };

const NOT_FOUND = "No encontramos un pedido con ese número y ese email.";

const schema = z.object({
  number: z.string(),
  email: z.email().max(120),
});

async function findOrderNumber(
  number: string,
  email: string,
): Promise<string | null> {
  const parsed = schema.safeParse({ number, email });
  const orderNumber = parseOrderNumber(
    parsed.success ? parsed.data.number : "",
  );
  if (!parsed.success || !orderNumber) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("number")
    .eq("number", orderNumber)
    .eq("email", parsed.data.email.toLowerCase())
    .maybeSingle();
  return data?.number ?? null;
}

/** Desde la página del pedido: ya sabemos el número, falta el email. */
export async function verifyOrderEmail(
  number: string,
  _prev: FindOrderState,
  formData: FormData,
): Promise<FindOrderState> {
  const found = await findOrderNumber(
    number,
    String(formData.get("email") ?? ""),
  );
  if (!found) return { error: NOT_FOUND };

  await rememberOrder(found);
  redirect(`/pedido/${found}`);
}

/** Desde /seguimiento: número y email juntos. */
export async function findOrder(
  _prev: FindOrderState,
  formData: FormData,
): Promise<FindOrderState> {
  const found = await findOrderNumber(
    String(formData.get("numero") ?? ""),
    String(formData.get("email") ?? ""),
  );
  if (!found) return { error: NOT_FOUND };

  await rememberOrder(found);
  redirect(`/pedido/${found}`);
}

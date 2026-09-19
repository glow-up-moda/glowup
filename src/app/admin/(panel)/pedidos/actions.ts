"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import type { FormState } from "@/lib/admin/forms";
import type { OrderStatus } from "@/lib/admin/orders";
import { isUuid } from "@/lib/admin/params";
import { requireAdmin } from "@/lib/auth/admin";

// Acciones sobre pedidos. Pasan por las funciones de la base con la sesión de
// la administradora (§8): RLS decide qué puede tocar y las reglas de stock
// (§9) se aplican solas. Si sale bien, vuelven al pedido con un aviso arriba
// (?hecho=), que en el celular se ve sin tener que buscarlo.

const notFound: FormState = {
  error: "No encontramos ese pedido. Recargá la página.",
};

function done(number: string, what: string): never {
  revalidatePath("/admin", "layout");
  redirect(`/admin/pedidos/${number}?hecho=${what}`);
}

export async function confirmTransfer(orderId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(orderId)) return notFound;

  const { data: order } = await supabase
    .from("orders")
    .select("payment_method")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return notFound;
  // Mercado Pago se confirma solo, consultando el pago a su API (§11).
  if (order.payment_method !== "transfer") {
    return { error: "Los pagos con Mercado Pago se confirman solos." };
  }

  const { data, error } = await supabase.rpc("confirm_order_payment", {
    p_order_id: orderId,
  });
  if (error) {
    return {
      error: dbErrorMessage(error, "No se pudo confirmar. Probá de nuevo."),
    };
  }

  const result = data as {
    number: string;
    already_confirmed: boolean;
    needs_review: boolean;
  };
  done(
    result.number,
    result.already_confirmed
      ? "ya-confirmado"
      : result.needs_review
        ? "confirmado-revisar"
        : "confirmado",
  );
}

export async function cancelOrder(orderId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(orderId)) return notFound;

  const { data: order } = await supabase
    .from("orders")
    .select("number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return notFound;

  const { data: released, error } = await supabase.rpc(
    "release_order_reservation",
    {
      p_order_id: orderId,
      p_reason: "Cancelado desde el panel",
    },
  );
  if (error) {
    return {
      error: dbErrorMessage(error, "No se pudo cancelar. Probá de nuevo."),
    };
  }
  if (!released) {
    return {
      error: "Solo se cancelan pedidos pendientes de pago. Recargá la página.",
    };
  }

  done(order.number, "cancelado");
}

const nextStatus = z.enum([
  "paid",
  "preparing",
  "shipped",
  "ready_for_pickup",
  "delivered",
]);

export async function changeOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = nextStatus.safeParse(status);
  if (!isUuid(orderId) || !parsed.success) return notFound;

  const { data, error } = await supabase.rpc("set_order_status", {
    p_order_id: orderId,
    p_status: parsed.data,
  });
  if (error) return { error: dbErrorMessage(error) };

  done((data as { number: string }).number, "estado");
}

export async function markReviewed(orderId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(orderId)) return notFound;

  // El motivo queda guardado: solo se apaga la alerta.
  const { data, error } = await supabase
    .from("orders")
    .update({ needs_review: false })
    .eq("id", orderId)
    .select("number")
    .maybeSingle();
  if (error) return { error: dbErrorMessage(error) };
  if (!data) return notFound;

  done(data.number, "revisado");
}

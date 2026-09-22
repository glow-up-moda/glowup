import "server-only";

import InternalAlert, { subject } from "@/emails/internal-alert";
import { formatMoney, plural } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

import { internalRecipient, sendEmail, siteUrl } from "./send";

// Avisos internos (§13): stock bajo, pedido para revisar y transferencia
// pendiente. Van al mail de la tienda (EMAIL_INTERNAL); sin esa variable no se
// manda nada, igual que el resto.

type Alert = {
  title: string;
  lead: string;
  rows: { label: string; value: string }[];
  action: { label: string; url: string };
  tone?: "rosa" | "error";
};

async function alert(key: string, kind: string, props: Alert): Promise<void> {
  const to = internalRecipient();
  if (!to) return;
  await sendEmail({
    to,
    subject: subject(props),
    element: <InternalAlert {...props} />,
    key,
    kind,
  });
}

/**
 * Stock bajo (§9.9). Se avisa una sola vez por variante: la marca se borra al
 * reponerla (ver `clearLowStockAlert`), así el próximo bajón vuelve a avisar.
 */
export async function sendLowStockAlert(variantIds: string[]): Promise<void> {
  try {
    if (variantIds.length === 0) return;
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("low_stock_variants")
      .select("variant_id, product_name, color, size, available")
      .in("variant_id", variantIds);
    if (!data || data.length === 0) return;

    for (const variant of data) {
      const detail = [variant.color, variant.size].filter(Boolean).join(" · ");
      await alert(`stock-bajo:${variant.variant_id}`, "stock-bajo", {
        title: "Se está por agotar un talle",
        lead: `${variant.product_name}${detail ? ` (${detail})` : ""} quedó con ${plural(variant.available ?? 0, "unidad disponible", "unidades disponibles")}.`,
        rows: [
          { label: "Producto", value: variant.product_name ?? "" },
          ...(detail ? [{ label: "Variante", value: detail }] : []),
          { label: "Disponible", value: String(variant.available ?? 0) },
        ],
        action: { label: "Ir al stock", url: `${siteUrl()}/admin/stock` },
      });
    }
  } catch (error) {
    console.error("[email] stock bajo", error);
  }
}

/** Al reponer, se borra la marca para que un próximo bajón vuelva a avisar. */
export async function clearLowStockAlert(variantId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("sent_emails")
      .delete()
      .eq("key", `stock-bajo:${variantId}`);
  } catch (error) {
    console.error("[email] no se pudo reiniciar el aviso de stock", error);
  }
}

/** Un pedido quedó marcado para revisar (§9.6 y §11). */
export async function sendReviewAlert(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("orders")
      .select("number, email, total_cents, review_reason")
      .eq("id", orderId)
      .maybeSingle();
    if (!data) return;

    await alert(`revisar:${orderId}`, "pedido-para-revisar", {
      title: `Revisá el pedido ${data.number}`,
      lead:
        data.review_reason ??
        "El pago entró pero algo no cerró. Miralo antes de prepararlo.",
      rows: [
        { label: "Pedido", value: data.number },
        { label: "Clienta", value: data.email },
        { label: "Total", value: formatMoney(data.total_cents) },
      ],
      action: {
        label: "Ver el pedido",
        url: `${siteUrl()}/admin/pedidos/${data.number}`,
      },
      tone: "error",
    });
  } catch (error) {
    console.error("[email] pedido para revisar", error);
  }
}

/** Entró un pedido por transferencia: hay que confirmarla a mano (§11). */
export async function sendPendingTransferAlert(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("orders")
      .select("number, email, total_cents, reserved_until")
      .eq("id", orderId)
      .maybeSingle();
    if (!data) return;

    await alert(`transferencia:${orderId}`, "transferencia-pendiente", {
      title: `Transferencia por confirmar: ${data.number}`,
      lead: `Entró un pedido por transferencia. El stock queda reservado hasta que la confirmes o venzan las 24 horas.`,
      rows: [
        { label: "Pedido", value: data.number },
        { label: "Clienta", value: data.email },
        { label: "Monto", value: formatMoney(data.total_cents) },
      ],
      action: {
        label: "Ver el pedido",
        url: `${siteUrl()}/admin/pedidos/${data.number}`,
      },
    });
  } catch (error) {
    console.error("[email] transferencia pendiente", error);
  }
}

/** Las variantes que salieron en un pedido, para revisar si quedaron bajas. */
export async function sendLowStockAlertForOrder(
  orderId: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("order_items")
      .select("variant_id")
      .eq("order_id", orderId)
      .not("variant_id", "is", null);
    await sendLowStockAlert(
      (data ?? [])
        .map((item) => item.variant_id)
        .filter((id): id is string => id !== null),
    );
  } catch (error) {
    console.error("[email] stock bajo del pedido", error);
  }
}

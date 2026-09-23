import "server-only";

import { render } from "@react-email/components";
import type { ReactElement } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

// Envío de emails con Resend (§13).
//
// Es un solo POST a su API, así que va con fetch y sin dependencias, igual que
// Ualá Bis (§11). Nada de lo que pasa acá puede romper lo que lo llamó: un
// pago confirmado vale más que un email, así que los errores se registran y
// la función sigue.
//
// Sin RESEND_API_KEY o sin EMAIL_FROM no se manda nada y queda anotado en la
// consola: así el entorno local funciona sin cuenta de Resend.

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;

/** Adónde van los avisos internos (§13). Sin esto, no se mandan. */
export function internalRecipient(): string | null {
  return process.env.EMAIL_INTERNAL?.trim() || null;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export type SendEmail = {
  to: string;
  subject: string;
  element: ReactElement;
  /**
   * Clave única de este envío (`review:<order_id>`, `shipped:<order_id>`…).
   * Con ella el mismo email no sale dos veces aunque se repita la acción.
   */
  key?: string;
  /** Para agrupar en los reportes de Resend y en `sent_emails`. */
  kind: string;
};

/** true si el email salió; false si se salteó o falló. */
export async function sendEmail({
  to,
  subject,
  element,
  key,
  kind,
}: SendEmail): Promise<boolean> {
  if (!apiKey || !from) {
    console.info(`[email] sin configurar, no se manda "${subject}" a ${to}`);
    return false;
  }

  const supabase = createAdminClient();

  // La marca se toma antes de mandar, así dos disparos a la vez no mandan dos
  // veces; si el envío falla se suelta, y el próximo intento lo vuelve a
  // agarrar. Un 23505 quiere decir que ya está mandado.
  if (key) {
    const { error } = await supabase
      .from("sent_emails")
      .insert({ key, kind, recipient: to });
    if (error) {
      if (error.code !== "23505")
        console.error("[email] no se pudo anotar", error);
      return false;
    }
  }

  async function release() {
    if (key) await supabase.from("sent_emails").delete().eq("key", key);
  }

  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!response.ok) {
      console.error(
        `[email] Resend ${response.status}: ${await response.text()}`,
      );
      await release();
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] no se pudo enviar", error);
    await release();
    return false;
  }
}

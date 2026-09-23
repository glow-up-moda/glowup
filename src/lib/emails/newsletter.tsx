import "server-only";

import NewsletterWelcome, { subject } from "@/emails/newsletter-welcome";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmail, siteUrl } from "./send";

// Bienvenida al newsletter (§7, inicio). Sale en el momento, no con el job
// diario: el cupón es la razón por la que dejó el email.

export async function sendNewsletterWelcome(id: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const [{ data: subscriber }, { data: setting }] = await Promise.all([
      supabase
        .from("newsletter_subscribers")
        .select("id, email")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "welcome_coupon_code")
        .maybeSingle(),
    ]);
    if (!subscriber) return;

    const code = setting?.value;
    const props = {
      couponCode:
        typeof code === "string" && code.trim() !== ""
          ? code.trim().toUpperCase()
          : null,
      url: `${siteUrl()}/ropa-interior`,
      unsubscribeUrl: `${siteUrl()}/baja/${subscriber.id}`,
    };

    const ok = await sendEmail({
      to: subscriber.email,
      subject: subject(props),
      element: <NewsletterWelcome {...props} />,
      key: `bienvenida:${subscriber.id}`,
      kind: "newsletter-bienvenida",
    });
    if (ok) {
      await supabase
        .from("newsletter_subscribers")
        .update({ welcomed_at: new Date().toISOString() })
        .eq("id", subscriber.id);
    }
  } catch (error) {
    console.error("[email] bienvenida al newsletter", error);
  }
}

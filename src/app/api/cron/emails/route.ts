import { sendReviewRequests } from "@/lib/emails/reviews";

// Emails que dependen del calendario (§13). Lo llama una vez por día el job
// `daily-emails` de la base (ver la migración 20260922210000), que manda el
// secreto en una cabecera. Sin CRON_SECRET cargado, la ruta no atiende a
// nadie: es preferible no mandar nada a mandarle a cualquiera.

const secret = process.env.CRON_SECRET;

export async function POST(request: Request) {
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return new Response("no", { status: 401 });
  }

  const reviews = await sendReviewRequests();
  return Response.json({ ok: true, resenas: reviews });
}

// Chequeo temporal para ver qué variables llegan al servidor publicado.
// No devuelve ningún valor secreto, solo si está cargada o no. Se borra
// apenas terminemos de probar el pago con tarjeta.
export async function GET() {
  return Response.json({
    uala_username: Boolean(process.env.UALA_USERNAME),
    uala_client_id: Boolean(process.env.UALA_CLIENT_ID),
    uala_client_secret: Boolean(process.env.UALA_CLIENT_SECRET),
    uala_environment: process.env.UALA_ENVIRONMENT ?? null,
    supabase_secret: Boolean(process.env.SUPABASE_SECRET_KEY),
    site_url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  });
}

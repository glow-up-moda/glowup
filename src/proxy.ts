import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Renueva la sesión de Supabase en el panel. Las páginas del servidor no
 * pueden escribir cookies, así que el token vencido se renueva acá, antes de
 * que la página lo lea. No decide quién entra: eso lo hacen cada página y cada
 * acción con requireAdmin(), y la base con RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
        // Una respuesta que escribe la sesión no se puede cachear en la CDN.
        for (const [key, value] of Object.entries(headers))
          response.headers.set(key, value);
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

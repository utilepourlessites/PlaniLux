import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Rafraîchit la session Supabase et protège /app et /api.
 * (Next.js 16 : le « middleware » s'appelle « proxy ».)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = pathname === "/app" || pathname.startsWith("/app/");
  const isProtectedApi = pathname.startsWith("/api/") && pathname !== "/api/health";
  const env = getSupabaseEnv();

  if (!env) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
    }
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  if (isProtectedPage && !user) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if ((pathname === "/login" || pathname === "/") && user) {
    const redirect = NextResponse.redirect(new URL("/app", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login", "/api/:path*", "/auth/:path*", "/"],
};

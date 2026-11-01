import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Rafraîchit la session Supabase et protège /app.
 * (Next.js 16 : le « middleware » s'appelle « proxy ».)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = pathname === "/app" || pathname.startsWith("/app/");
  const env = getSupabaseEnv();

  if (!env) {
    // Configuration absente : on ne laisse jamais /app ouvert.
    if (isProtectedPage) return NextResponse.redirect(new URL("/login", request.url));
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

  // getUser() valide le jeton auprès de Supabase (ne jamais se fier à getSession() côté serveur).
  const { data: { user } } = await supabase.auth.getUser();

  if (isProtectedPage && !user) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  if (pathname === "/login" && user) {
    const redirect = NextResponse.redirect(new URL("/app", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login", "/api/:path*", "/auth/:path*"],
};

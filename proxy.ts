import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";

/**
 * Keeps the admin's Supabase session fresh (refreshed tokens are written back to
 * cookies here, since Server Components can't set cookies) and bounces signed-out
 * visitors to the login page. This is only an optimistic check: every admin page
 * and server action verifies the admin again via lib/auth.ts.
 */
export async function proxy(request: NextRequest) {
  // Strict CSP for the lead inbox: a fresh nonce per request. Next.js reads it from the request's
  // Content-Security-Policy header and tags its own scripts with it (see lib/csp.ts).
  const csp = buildCsp({ nonce: Buffer.from(crypto.randomUUID()).toString("base64") });
  request.headers.set("Content-Security-Policy", csp);
  const withCsp = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return withCsp(NextResponse.next({ request })); // local mode, see lib/env.ts

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isLogin = request.nextUrl.pathname.startsWith("/admin/login");
  if (!data?.claims && !isLogin) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return withCsp(NextResponse.redirect(login));
  }
  return withCsp(response);
}

export const config = {
  matcher: ["/admin/:path*"],
};

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";

function requireConfig() {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  return cfg;
}

/** Service-role client: full database access, no user session. Server only. */
export function createServiceClient() {
  const { url, serviceRoleKey } = requireConfig();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anon-key client bound to the request's auth cookies, for signing admins in and out. */
export async function createAuthClient() {
  const { url, anonKey } = requireConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy
          // refreshes the session instead.
        }
      },
    },
  });
}

import "server-only";
import { redirect } from "next/navigation";
import { adminEmails, isLocalMode } from "@/lib/env";
import { createAuthClient } from "@/lib/supabase/server";

export type Admin = { email: string; local: boolean };

export function isAllowedAdmin(email: string | null | undefined, allowlist = adminEmails()): boolean {
  return !!email && allowlist.includes(email.trim().toLowerCase());
}

/**
 * The signed-in admin, or null. Verifies the session JWT (getClaims) rather than
 * trusting the cookie, then checks the email against ADMIN_EMAILS.
 */
export async function getAdmin(): Promise<Admin | null> {
  if (isLocalMode()) return { email: "local dev", local: true };
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (error || typeof email !== "string" || !isAllowedAdmin(email)) return null;
  return { email, local: false };
}

/** For admin pages and server actions: every action is its own public endpoint, so each one checks. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

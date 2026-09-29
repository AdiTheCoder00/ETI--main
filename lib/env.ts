import "server-only";
import { SITE_URL } from "@/lib/site";
import { uploadMode } from "@/lib/uploads";

/**
 * Server configuration. Everything backend-related is optional in development so the
 * site runs with `npm run dev` and no accounts: leads go to a local JSON file, emails
 * are printed to the console, and /admin is open. In production, missing Supabase
 * config is an error rather than a silent fallback.
 */

export type SupabaseConfig = { url: string; anonKey: string; serviceRoleKey: string };

export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && anonKey && serviceRoleKey) return { url, anonKey, serviceRoleKey };
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return null;
}

/**
 * Whether Supabase is configured, without the production guard. Public pages read site content
 * through this, so a build without Supabase still renders (from the defaults) instead of failing.
 * Anything that writes, or that needs a signed-in admin, goes through supabaseConfig() instead.
 */
export function hasSupabase(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** Vercel Blob read-write token; set automatically on Vercel once a Blob store is connected. */
export const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN ?? "";

/** How /admin/work uploads media right now; see lib/uploads.ts. */
export const currentUploadMode = () =>
  uploadMode({ blobToken: blobToken(), hasSupabase: hasSupabase(), production: process.env.NODE_ENV === "production" });

/** True when running locally without Supabase: file-backed leads and an unlocked admin. */
export function isLocalMode(): boolean {
  return supabaseConfig() === null;
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const mailConfig = () => ({
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // || not ??: .env.example lists these, and a copied empty value must still mean "use the default".
  /** Must be on a domain verified in Resend. */
  from: process.env.ENQUIRY_FROM_EMAIL || "ETI Drone Visuals <enquiries@etidronevisuals.com>",
  studioInbox: process.env.STUDIO_EMAIL || "contact@etidronevisuals.com",
  siteUrl: SITE_URL,
});

export const turnstileSecret = () => process.env.TURNSTILE_SECRET_KEY ?? "";

/** Salt for hashing visitor IPs; the raw IP is never stored. */
export const ipSalt = () => process.env.LEAD_IP_SALT || "eti-local-dev-salt";

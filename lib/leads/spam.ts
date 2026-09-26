import { createHash } from "node:crypto";

/** Name of the hidden field people never see. Anything in it means a bot filled the form. */
export const HONEYPOT_FIELD = "website";

export const RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** First address in x-forwarded-for (set by Vercel and most proxies), else x-real-ip. */
export function clientIp(headers: Pick<Headers, "get">): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return headers.get("x-real-ip")?.trim() || null;
}

/**
 * Cloudflare Turnstile server-side check. Only used when TURNSTILE_SECRET_KEY is set.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

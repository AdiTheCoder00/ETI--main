/**
 * Content-Security-Policy, built in one place for next.config.ts (the public pages) and proxy.ts (/admin).
 *
 * Two strengths, because of how the site renders:
 * - Public pages are prerendered once at build time. Next.js puts each page's data in inline <script>
 *   tags whose content (and so hash) changes per page and per build, and a static page can't carry a
 *   per-request nonce. So they allow inline scripts and lock down everything else: no script from another
 *   origin, no framing, forms post only here, media and connections only to this site and the configured
 *   CDN. These pages render no visitor input, and React escapes everything it renders.
 * - /admin is rendered per request anyway, and it is the page that shows visitor-supplied text (the leads).
 *   It gets a fresh nonce each request and 'strict-dynamic': only scripts Next.js itself tagged can run.
 *
 * Nonces for every page would force the homepage out of static rendering, which CLAUDE.md rules out.
 */

const TURNSTILE = "https://challenges.cloudflare.com";

/** The origin of an absolute URL from the environment, or nothing for a relative path / unset value. */
function originOf(value: string | undefined): string | null {
  if (!value || !/^https?:\/\//.test(value)) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * The public origin of this project's own Vercel Blob store, which holds media uploaded from /admin/work.
 * The store id is the fourth part of the read-write token (vercel_blob_rw_<storeId>_<secret>), which is
 * how the SDK builds the store's URLs, so the policy can name this store rather than every public store.
 */
export function blobStoreOrigin(token = process.env.BLOB_READ_WRITE_TOKEN): string | null {
  const storeId = token?.split("_")[3];
  return storeId && /^[a-z0-9]+$/i.test(storeId) ? `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/** Where the Blob SDK sends client uploads (VERCEL_BLOB_API_URL overrides it, as in the SDK). */
const BLOB_API = "https://vercel.com";

export function buildCsp({ nonce, dev = process.env.NODE_ENV === "development" }: { nonce?: string; dev?: boolean } = {}) {
  const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? TURNSTILE : null;
  // Uploaded stills reach the page through /_next/image (same origin), but a case page's clip poster
  // and every uploaded clip load straight from the store.
  const blob = blobStoreOrigin();
  const media = [originOf(process.env.NEXT_PUBLIC_CLIPS_BASE_URL), originOf(process.env.NEXT_PUBLIC_HERO_VIDEO_URL), blob];
  const images = [originOf(process.env.NEXT_PUBLIC_HERO_POSTER_URL), blob];
  // Only /admin (the nonce policy) uploads, straight from the browser to the Blob API.
  const uploads = nonce && blob ? (originOf(process.env.VERCEL_BLOB_API_URL) ?? BLOB_API) : null;

  const script = nonce
    ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]
    : ["'self'", "'unsafe-inline'"];
  // React uses eval in development only, to rebuild server error stacks in the browser.
  if (dev) script.push("'unsafe-eval'");

  const directives: Record<string, (string | null)[]> = {
    "default-src": ["'self'"],
    "script-src": [...script, turnstile],
    // GSAP, SplitText and React style props write inline styles; style injection is low risk.
    "style-src": ["'self'", "'unsafe-inline'"],
    // data: for next/image blur placeholders, blob: for three.js textures
    "img-src": ["'self'", "data:", "blob:", ...images],
    "media-src": ["'self'", ...media],
    "font-src": ["'self'"],
    "connect-src": ["'self'", turnstile, uploads, dev ? "ws:" : null],
    "frame-src": turnstile ? [turnstile] : ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${[...new Set(v.filter(Boolean))].join(" ")}`)
    .join("; ");
}

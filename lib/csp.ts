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

export function buildCsp({ nonce, dev = process.env.NODE_ENV === "development" }: { nonce?: string; dev?: boolean } = {}) {
  const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? TURNSTILE : null;
  const media = [originOf(process.env.NEXT_PUBLIC_CLIPS_BASE_URL), originOf(process.env.NEXT_PUBLIC_HERO_VIDEO_URL)];
  const images = [originOf(process.env.NEXT_PUBLIC_HERO_POSTER_URL)];

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
    "connect-src": ["'self'", turnstile, dev ? "ws:" : null],
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

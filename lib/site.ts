import type { Metadata } from "next";

const SITE_NAME = "ETI Drone Visuals";

/**
 * The public origin, no trailing slash, for the sitemap, robots.txt, canonical URLs and the inbox link
 * in emails. Set NEXT_PUBLIC_SITE_URL in production; on Vercel the production domain is used when it
 * is missing, so the sitemap never hands search engines localhost links.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/**
 * The default share image (app/opengraph-image.jpg). A page that sets its own `openGraph` loses the
 * file-based image too, so pages without a still of their own list it explicitly.
 */
export const defaultShareImage = {
  url: "/opengraph-image.jpg",
  width: 1200,
  height: 630,
  alt: "ETI Drone Visuals: we fly cameras where cranes and helicopters can’t go.",
};

/**
 * Open Graph fields every page shares. A page that sets its own `openGraph` replaces the parent's
 * object instead of merging with it, so pages spread this in rather than lose the site name and locale.
 */
export const baseOpenGraph = {
  siteName: SITE_NAME,
  locale: "en_IN",
  type: "website",
} satisfies Metadata["openGraph"];

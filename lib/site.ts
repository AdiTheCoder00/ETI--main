import type { Metadata } from "next";

export const SITE_NAME = "ETI Drone Visuals";

/**
 * Open Graph fields every page shares. A page that sets its own `openGraph` replaces the parent's
 * object instead of merging with it, so pages spread this in rather than lose the site name and locale.
 */
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

export const baseOpenGraph = {
  siteName: SITE_NAME,
  locale: "en_IN",
  type: "website",
} satisfies Metadata["openGraph"];

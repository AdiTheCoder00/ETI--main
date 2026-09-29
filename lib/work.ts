import type { StaticImageData } from "next/image";

/**
 * Flights: the types and the few helpers the browser needs. Kept free of zod and of the flight data on
 * purpose, because the gallery and the reel import this in the browser (see lib/leads/constants.ts for
 * what shipping zod cost). The form schema and the launch flights live in lib/content/.
 */

/** Clips live outside the repo: locally in public/media/clips, on a CDN in production. `||`: empty means unset. */
const clipBase = process.env.NEXT_PUBLIC_CLIPS_BASE_URL || "/media/clips";

export const CATEGORIES = ["Industrial", "Urban and transit", "Scenic and heritage", "Construction"] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * A flight as it is stored, and edited at /admin/work. Empty strings mean "none" throughout.
 * Supabase in production, .data/flights.json locally (lib/content/).
 */
export type Flight = {
  id: string;
  /** URL of its case page, /work/[slug]. Keep stable once published: it is what search engines index. */
  slug: string;
  title: string;
  location: string;
  category: Category;
  /** What it was flown and finished on. Straight from the job sheet, no invented specs. */
  kit: string;
  alt: string;
  note: string;
  /** A bundled still by file name ("plant-fpv.jpg", lib/stills.ts) or an uploaded one's URL. */
  still: string;
  /** Uploaded stills only: their size and a tiny blur placeholder, recorded in the browser at upload. */
  stillWidth: number;
  stillHeight: number;
  stillBlur: string;
  /** A file name in the clip store (NEXT_PUBLIC_CLIPS_BASE_URL), a /media path, or an uploaded URL. */
  clip: string;
  /** Wide frames take more of the horizontal reel. */
  wide: boolean;
  onHomepage: boolean;
  /** Hidden flights stay in the admin but appear nowhere on the site. */
  visible: boolean;
  position: number;
};

/** A flight as the public pages render it: the still resolved to something next/image can take. */
export type Shot = {
  id: string;
  slug: string;
  title: string;
  location: string;
  category: Category;
  kit: string;
  image?: StaticImageData;
  alt: string;
  clip?: string;
  wide?: boolean;
  note?: string;
  onHomepage: boolean;
};

export function clipUrl(clip: string) {
  return clip.startsWith("/") || clip.startsWith("https://") ? clip : `${clipBase}/${clip}`;
}

/** A case page slug from a title: "Chimney stack audit" → "chimney-stack-audit". */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** The flight after this one, wrapping round, so every case page links on to another. */
export function nextShot(shots: Shot[], slug: string): Shot | undefined {
  if (shots.length < 2) return undefined;
  const i = shots.findIndex((s) => s.slug === slug);
  return shots[(i + 1) % shots.length];
}

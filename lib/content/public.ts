import "server-only";
import { cache } from "react";
import { toShot } from "./shots";
import { getContentStore } from "./store";

/** Reads for the public pages. cache() so a page and its metadata share one round trip. */

export const getSiteSettings = cache(async () => (await getContentStore()).getSettings());

/** Everything on /work, and the flights with case pages: the visible ones, in order. */
export const getPublishedShots = cache(async () =>
  (await (await getContentStore()).listFlights()).filter((f) => f.visible).map(toShot),
);

/** The homepage reel: visible flights marked for the homepage. */
export const getReelShots = cache(async () => (await getPublishedShots()).filter((s) => s.onHomepage));

export const getPublishedShot = cache(async (slug: string) => (await getPublishedShots()).find((s) => s.slug === slug));

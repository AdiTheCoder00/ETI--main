import type { StaticImageData } from "next/image";
import { BUNDLED_STILLS } from "@/lib/stills";
import type { Flight, Shot } from "@/lib/work";

/**
 * One pixel in the rule colour (#D6D1C4). The components ask next/image for placeholder="blur", which
 * throws when an image object has no blurDataURL; the browser records a real one at upload, and this
 * covers the upload whose blur somehow didn't come through, so it can never take a page down.
 */
const FALLBACK_BLUR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGO4dvEIAATsAmxvVnUVAAAAAElFTkSuQmCC";

/**
 * A stored flight as the public pages render it. A bundled still comes back as its import (blur and
 * all); an uploaded one as the same shape built from what the browser recorded at upload, so the
 * components treat both alike.
 */
export function toShot(f: Flight): Shot {
  let image: StaticImageData | undefined = BUNDLED_STILLS[f.still];
  if (!image && f.still && f.stillWidth > 0 && f.stillHeight > 0) {
    image = { src: f.still, width: f.stillWidth, height: f.stillHeight, blurDataURL: f.stillBlur || FALLBACK_BLUR };
  }
  return {
    id: f.id,
    slug: f.slug,
    title: f.title,
    location: f.location,
    category: f.category,
    kit: f.kit,
    image,
    alt: f.alt,
    clip: f.clip || undefined,
    wide: f.wide,
    note: f.note || undefined,
    onHomepage: f.onHomepage,
  };
}

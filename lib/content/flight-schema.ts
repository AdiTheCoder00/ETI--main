import "server-only";
import { z } from "zod";
import { BUNDLED_STILLS } from "@/lib/stills";
import { CATEGORIES } from "@/lib/work";

// Only sources the site can actually serve. A still on any other host would make next/image throw and
// take the whole page down, and nothing here may ever end up in a src as javascript:.
// Must stay in step with images.remotePatterns in next.config.ts.
const BLOB_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/work\/[\w./%-]+$/i;
/** Local-mode uploads (lib/uploads.ts): public/media/uploads/work/... */
const LOCAL_UPLOAD = /^\/media\/uploads\/work\/[\w/.-]+$/;
const CLIP_FILE = /^[a-z0-9][\w.-]*\.(mp4|webm)$/i;
const BLUR = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

// ".." anywhere is refused: URL parsing would resolve it out of the folders allowed above.
const uploaded = (v: string) => !v.includes("..") && (BLOB_URL.test(v) || LOCAL_UPLOAD.test(v));
export const isBundledStill = (v: string) => Object.hasOwn(BUNDLED_STILLS, v);
export const isAllowedStill = (v: string) => v === "" || isBundledStill(v) || uploaded(v);
export const isAllowedClip = (v: string) => v === "" || uploaded(v) || CLIP_FILE.test(v);

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const size = z.coerce.number().int().min(0).max(20000).catch(0);

/** The admin's flight form, field names as in the form. */
export const flightInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "Give it a web address.")
      .max(80, "Keep the address under 80 characters.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes only."),
    title: text(80).min(1, "Give the flight a title."),
    location: text(80).min(1, "Add where it was flown."),
    category: z.enum(CATEGORIES, { error: "Pick a category." }),
    kit: text(80).min(1, "Add what it was shot on."),
    alt: text(200).min(1, "Describe the frame for people who can’t see it."),
    note: text(300).default(""),
    still: z.string().trim().default("").refine(isAllowedStill, "That still isn’t from an upload."),
    stillWidth: size,
    stillHeight: size,
    stillBlur: z.string().max(3000).catch("").transform((v) => (BLUR.test(v) ? v : "")),
    clip: z.string().trim().default("").refine(isAllowedClip, "That clip isn’t from an upload."),
    wide: checkbox,
    onHomepage: checkbox,
    visible: checkbox,
  })
  .refine((f) => f.still || f.clip, { message: "Add a still or a clip: a flight needs something to show.", path: ["still"] })
  .refine((f) => !uploaded(f.still) || (f.stillWidth > 0 && f.stillHeight > 0), {
    message: "Upload the still again: its size didn’t come through.",
    path: ["still"],
  })
  // A bundled still brings its own size and blur; none means none.
  .transform((f) => (uploaded(f.still) ? f : { ...f, stillWidth: 0, stillHeight: 0, stillBlur: "" }));

export type FlightInput = z.infer<typeof flightInputSchema>;
export type FlightField = keyof z.input<typeof flightInputSchema>;

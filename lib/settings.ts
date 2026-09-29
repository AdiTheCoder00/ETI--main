import { z } from "zod";

/**
 * The facts about the studio that change without a redeploy, edited at /admin/site.
 *
 * The year and the phone start empty and stay off the site until the owner types a real one: the old
 * site gave neither a founding year nor a believable number, and the site states nothing it can't back
 * (see "Facts not on the site" in CLAUDE.md). The admin is where a real figure gets added, not a default.
 */
export type SiteSettings = {
  /** "flying across India since …" in the hero. Empty: the line ends at "India". */
  foundedYear: string;
  /** Shown on the site. Enquiry notifications still go to STUDIO_EMAIL. */
  email: string;
  /** International format, e.g. +91 98200 00000. Empty hides the phone and WhatsApp links. */
  phone: string;
  office: string;
  instagram: string;
  youtube: string;
  linkedin: string;
};

/** What the site showed before settings existed. Profiles start empty: the old bare links went nowhere. */
export const DEFAULT_SETTINGS: SiteSettings = {
  foundedYear: "",
  email: "contact@etidronevisuals.com",
  phone: "",
  office: "Mumbai, India",
  instagram: "",
  youtube: "",
  linkedin: "",
};

// A profile link has to be an https URL on that network, so a settings field can never
// become a javascript: href or send visitors somewhere unexpected.
const profile = (label: string, ...hosts: string[]) =>
  z
    .string()
    .trim()
    .max(200, "That link is too long.")
    .refine((v) => {
      if (v === "") return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" && hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
      } catch {
        return false;
      }
    }, `Paste the full ${label} link, starting with https://`);

export const settingsSchema = z.object({
  foundedYear: z
    .string()
    .trim()
    .refine((y) => y === "" || /^\d{4}$/.test(y), "Use a four-digit year, like 2016, or leave it empty.")
    .refine((y) => y === "" || (+y >= 1990 && +y <= new Date().getFullYear()), "That year doesn’t look right."),
  email: z.string().trim().max(254).pipe(z.email("That email address doesn’t look right.")),
  phone: z
    .string()
    .trim()
    .max(24, "That number is too long.")
    .refine((v) => v === "" || /^\+[1-9][\d ()-]{7,}$/.test(v), "Start with + and the country code, e.g. +91 98200 00000."),
  office: z.string().trim().min(1, "Add where the office is.").max(80, "Keep this under 80 characters."),
  instagram: profile("Instagram", "instagram.com"),
  youtube: profile("YouTube", "youtube.com", "youtu.be"),
  linkedin: profile("LinkedIn", "linkedin.com"),
});

export type SettingsField = keyof SiteSettings;

/** Stored settings may predate a field or a rule; anything invalid falls back field by field. */
export function readSettings(stored: unknown): SiteSettings {
  const raw = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const out = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingsField[]) {
    const field = settingsSchema.shape[key].safeParse(raw[key] ?? DEFAULT_SETTINGS[key]);
    if (field.success) out[key] = field.data;
  }
  return out;
}

const digits = (phone: string) => phone.replace(/\D/g, "");
export const telHref = (phone: string) => `tel:+${digits(phone)}`;
export const whatsappHref = (phone: string) => `https://wa.me/${digits(phone)}`;

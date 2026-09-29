import { z } from "zod";
import { JOB_TYPES, type EnquiryField } from "./constants";

export const LEAD_STATUSES = ["new", "quoted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const STATUS_LABELS: Record<LeadStatus, string> = { new: "New", quoted: "Quoted", won: "Won", lost: "Lost" };

export type Lead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  jobType: string;
  whereWhen: string;
  message: string;
  status: LeadStatus;
  source: string;
  /** Private to the studio, written in the inbox. Never shown to the client or emailed. */
  notes: string;
};

export type NewLead = Pick<Lead, "name" | "email" | "jobType" | "whereWhen" | "message" | "source"> & {
  ipHash: string | null;
  userAgent: string | null;
};

const trimmed = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);

/** Contact form fields, named as they are in the form. */
export const enquirySchema = z.object({
  fullname: trimmed(120).min(1, "Add your name so we know who to reply to."),
  email: z
    .string()
    .trim()
    .min(1, "Add your email so we can reply.")
    .max(254, "That email address is too long.")
    .pipe(z.email("That email address doesn’t look right.")),
  type: z.enum(JOB_TYPES).catch("Something else"),
  where: trimmed(300).default(""),
  msg: trimmed(5000).default(""),
});

export type { EnquiryField };

export const statusSchema = z.enum(LEAD_STATUSES);

export const NOTES_MAX = 5000;
export const notesSchema = z.string().max(NOTES_MAX, `Keep notes under ${NOTES_MAX} characters.`);

/**
 * The inbox search box. The Supabase store puts this inside a double-quoted PostgREST value,
 * where only `"` and `\` can break out of the quotes, and `*` is PostgREST's wildcard; those
 * three are dropped. `%` and `_` stay: at worst they widen a match, and emails contain `_`.
 */
export function normaliseQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/["\\*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

/** The columns search looks in, as Lead fields. */
export const SEARCH_FIELDS = ["name", "email", "jobType", "whereWhen", "message", "notes"] as const;

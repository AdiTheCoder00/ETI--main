import { z } from "zod";
import { JOB_TYPES, type EnquiryField } from "./constants";

export { JOB_TYPES } from "./constants";

export const LEAD_STATUSES = ["new", "quoted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

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

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type { EnquiryField };

export const statusSchema = z.enum(LEAD_STATUSES);

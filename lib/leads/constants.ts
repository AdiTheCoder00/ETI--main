/**
 * Constants the contact form needs in the browser. Kept free of imports on purpose: pulling them
 * from schema.ts or spam.ts shipped zod and a Node crypto polyfill (~87 KB gzipped) to every visitor.
 */

/** Options in the contact form's "Type of job" select. The stored value is the label. */
export const JOB_TYPES = [
  "Film, ad or music video",
  "FPV",
  "Real estate",
  "Inspection",
  "Survey and mapping",
  "Plant monitoring",
  "Something else",
] as const;

/** Name of the hidden field people never see. Anything in it means a bot filled the form. */
export const HONEYPOT_FIELD = "website";

/** Contact form field names, as they are in the form and the schema. */
export const ENQUIRY_FIELDS = ["fullname", "email", "type", "where", "msg"] as const;
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];

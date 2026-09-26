import { z } from "zod";
import { enquirySchema, type EnquiryField, type Lead } from "./schema";
import { HONEYPOT_FIELD, RATE_LIMIT } from "./spam";
import type { LeadStore } from "./store";

export type EnquiryState = {
  status: "idle" | "ok" | "error";
  message: string;
  fieldErrors?: Partial<Record<EnquiryField, string>>;
  /** Echoed back on error so the form keeps what the visitor typed. */
  values?: Partial<Record<EnquiryField, string>>;
};

export type EnquiryDeps = {
  store: Pick<LeadStore, "create" | "countFromIpSince">;
  /** Hashed client IP, or null if unknown (rate limit is skipped). */
  ipHash: string | null;
  userAgent: string | null;
  /** Resolves true when bot checks beyond the honeypot pass (Turnstile, if enabled). */
  verifyHuman: () => Promise<boolean>;
  /** Sends the studio notification and auto-reply. Runs after the lead is saved. */
  notify: (lead: Lead) => void;
  now?: () => Date;
  studioEmail: string;
};

const FIELDS: EnquiryField[] = ["fullname", "email", "type", "where", "msg"];

export async function handleEnquiry(form: FormData, deps: EnquiryDeps): Promise<EnquiryState> {
  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? "")])) as Record<EnquiryField, string>;
  const ok: EnquiryState = {
    status: "ok",
    message: "Thanks, it’s with us. We’ll reply by email, usually within a couple of hours.",
  };

  // Bots fill every field they find. Pretend it worked so they don't adapt.
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim() !== "") return ok;

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    const first = Object.fromEntries(
      Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? "Check this field."]),
    ) as EnquiryState["fieldErrors"];
    return {
      status: "error",
      message: Object.values(first ?? {})[0] ?? "Check the highlighted fields.",
      fieldErrors: first,
      values: raw,
    };
  }

  const fallback = `Or email us directly at ${deps.studioEmail}.`;

  if (!(await deps.verifyHuman())) {
    return { status: "error", message: `We couldn’t confirm the form was sent by a person. Try again. ${fallback}`, values: raw };
  }

  const now = deps.now?.() ?? new Date();
  try {
    if (deps.ipHash) {
      const recent = await deps.store.countFromIpSince(deps.ipHash, new Date(now.getTime() - RATE_LIMIT.windowMs));
      if (recent >= RATE_LIMIT.max) {
        return {
          status: "error",
          message: `You’ve sent several enquiries in the last hour, so we’ve paused the form for now. ${fallback}`,
          values: raw,
        };
      }
    }

    const { fullname, email, type, where, msg } = parsed.data;
    const lead = await deps.store.create({
      name: fullname,
      email,
      jobType: type,
      whereWhen: where,
      message: msg,
      source: "contact_form",
      ipHash: deps.ipHash,
      userAgent: deps.userAgent?.slice(0, 400) ?? null,
    });
    deps.notify(lead);
    return ok;
  } catch (e) {
    console.error("[enquiry] could not save lead", e);
    return { status: "error", message: `Something went wrong on our side and it didn’t send. ${fallback}`, values: raw };
  }
}

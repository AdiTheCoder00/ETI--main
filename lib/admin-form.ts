import type { z } from "zod";

/** What every admin form action returns. `ok` is null before the first submit. */
export type AdminFormState<F extends string = string> = {
  ok: boolean | null;
  message: string | null;
  fieldErrors?: Partial<Record<F, string>>;
};

export const idle: AdminFormState = { ok: null, message: null };

/** The first message for each field, keyed by field name. */
export function fieldErrorsFrom<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as F | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}

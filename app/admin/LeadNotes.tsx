"use client";

import { NOTES_MAX } from "@/lib/leads/schema";
import { saveLeadNotes } from "./actions";
import { useAdminForm } from "./useAdminForm";

const NO_FIELDS = [] as const;

export function LeadNotes({ id, notes }: { id: string; notes: string }) {
  const { state, pending, formProps } = useAdminForm(saveLeadNotes, NO_FIELDS);
  return (
    <details className="adm-notes" open={notes !== ""}>
      <summary>{notes ? "Private notes" : "Add a private note"}</summary>
      <form {...formProps}>
        <input type="hidden" name="id" value={id} />
        <label className="sr" htmlFor={`notes-${id}`}>
          Private notes
        </label>
        <textarea id={`notes-${id}`} name="notes" rows={3} maxLength={NOTES_MAX} defaultValue={notes} placeholder="Quoted ₹, follow-up date, who’s handling it…" />
        <div className="adm-notes-bar">
          <p className={`form-note${state.ok === false ? " is-error" : ""}`} aria-live="polite">
            {state.message ?? "Only visible here."}
          </p>
          <button type="submit" className="adm-link" disabled={pending}>
            {pending ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>
    </details>
  );
}

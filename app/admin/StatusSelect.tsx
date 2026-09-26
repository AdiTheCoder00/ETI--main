"use client";

import { useOptimistic, useTransition } from "react";
import type { LeadStatus } from "@/lib/leads/schema";
import { LEAD_STATUSES } from "@/lib/leads/schema";
import { setLeadStatus } from "./actions";

export function StatusSelect({ id, status, labels }: { id: string; status: LeadStatus; labels: Record<LeadStatus, string> }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={setLeadStatus}
      className="adm-status"
      onChange={(e) => {
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          setOptimistic(data.get("status") as LeadStatus);
          await setLeadStatus(data);
        });
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <input type="hidden" name="id" value={id} />
      <label className="sr" htmlFor={`status-${id}`}>
        Status
      </label>
      <select id={`status-${id}`} name="status" value={optimistic} data-status={optimistic} aria-busy={pending} onChange={() => {}}>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {labels[s]}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="adm-link">
          Save
        </button>
      </noscript>
    </form>
  );
}

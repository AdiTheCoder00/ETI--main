"use client";

import type { SettingsField, SiteSettings } from "@/lib/settings";
import { FieldError } from "../FieldError";
import { useAdminForm } from "../useAdminForm";
import { saveSettings } from "./actions";

const ORDER: readonly SettingsField[] = ["foundedYear", "email", "phone", "office", "instagram", "youtube", "linkedin"];

type Row = { field: SettingsField; label: string; hint: string; type?: string; placeholder?: string; inputMode?: "numeric" | "tel" | "email" | "url" };

const GROUPS: { legend: string; rows: Row[] }[] = [
  {
    legend: "The studio",
    rows: [
      {
        field: "foundedYear",
        label: "Flying since",
        hint: "Adds “since …” to the hero line. Only a real year: left empty, the line just ends at “India”.",
        inputMode: "numeric",
        placeholder: "Leave empty unless you have the year",
      },
      { field: "office", label: "Office", hint: "Contact section. The part before the comma is also used in the footer.", placeholder: "Mumbai, India" },
    ],
  },
  {
    legend: "Contact",
    rows: [
      {
        field: "email",
        label: "Public email",
        hint: "Shown on the site. Enquiry notifications still go to the STUDIO_EMAIL inbox.",
        type: "email",
        inputMode: "email",
      },
      {
        field: "phone",
        label: "Phone or WhatsApp",
        hint: "With the country code. Adds call and WhatsApp links; leave empty to show neither.",
        type: "tel",
        inputMode: "tel",
        placeholder: "+91 98200 00000",
      },
    ],
  },
  {
    legend: "Profiles",
    rows: [
      { field: "instagram", label: "Instagram", hint: "Leave empty to hide it from the footer.", type: "url", inputMode: "url", placeholder: "https://instagram.com/…" },
      { field: "youtube", label: "YouTube", hint: "Leave empty to hide it from the footer.", type: "url", inputMode: "url", placeholder: "https://youtube.com/@…" },
      { field: "linkedin", label: "LinkedIn", hint: "Leave empty to hide it from the footer.", type: "url", inputMode: "url", placeholder: "https://linkedin.com/company/…" },
    ],
  },
];

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const { state, pending, formProps, err, invalid } = useAdminForm(saveSettings, ORDER);

  return (
    <form {...formProps} className="form adm-form">
      {GROUPS.map((g) => (
        <fieldset key={g.legend} className="full adm-group">
          <legend>{g.legend}</legend>
          {g.rows.map((r) => (
            <div className="f" key={r.field}>
              <label htmlFor={`st-${r.field}`}>{r.label}</label>
              <input
                id={`st-${r.field}`}
                name={r.field}
                type={r.type ?? "text"}
                inputMode={r.inputMode}
                defaultValue={settings[r.field]}
                placeholder={r.placeholder}
                {...invalid(r.field)}
              />
              <p className="form-note">{r.hint}</p>
              <FieldError field={r.field} message={err(r.field)} />
            </div>
          ))}
        </fieldset>
      ))}

      <div className="send full">
        <p className={`form-note${state.ok === false ? " is-error" : ""}`} aria-live="polite" role={state.ok === false ? "alert" : undefined}>
          {state.message ?? "Changes go live on the homepage and /work as soon as you save."}
        </p>
        <button type="submit" className="btn btn-accent" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

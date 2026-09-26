"use client";

import Script from "next/script";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { submitEnquiry } from "@/app/actions";
import type { EnquiryState } from "@/lib/leads/enquiry";
import { JOB_TYPES, type EnquiryField } from "@/lib/leads/schema";
import { HONEYPOT_FIELD } from "@/lib/leads/spam";

const initial: EnquiryState = { status: "idle", message: "We usually reply within a couple of hours." };
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm() {
  const [state, action, pending] = useActionState(submitEnquiry, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    const form = formRef.current;
    if (!form || state.status === "idle") return;
    if (state.status === "ok") form.reset();
    // Move focus to the first field that needs fixing, like the old mailto form did.
    const errs = state.fieldErrors ?? {};
    const first = (["fullname", "email", "type", "where", "msg"] as EnquiryField[]).find((f) => errs[f]);
    if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    // Turnstile tokens are single-use; get a fresh one for the next submit.
    (window as { turnstile?: { reset: () => void } }).turnstile?.reset();
  }, [state]);

  // Submit through a transition instead of letting React auto-reset the form, so an
  // error keeps what was typed. Without JS the form still posts to the action.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  }

  const invalid = (f: EnquiryField) => (err[f] ? { "aria-invalid": true, "aria-describedby": `${f}-err` } : {});

  return (
    <form className="form" id="enquiry" ref={formRef} action={action} onSubmit={onSubmit} noValidate>
      <div className="f">
        <label htmlFor="q-name">Name</label>
        <input id="q-name" name="fullname" type="text" autoComplete="name" required maxLength={120} defaultValue={v.fullname} {...invalid("fullname")} />
      </div>
      <div className="f">
        <label htmlFor="q-email">Email</label>
        <input id="q-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} defaultValue={v.email} {...invalid("email")} />
      </div>
      <div className="f">
        <label htmlFor="q-type">Type of job</label>
        <select id="q-type" name="type" defaultValue={v.type}>
          {JOB_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="f">
        <label htmlFor="q-where">Where and when</label>
        <input id="q-where" name="where" type="text" placeholder="Pune, mid-November" maxLength={300} defaultValue={v.where} {...invalid("where")} />
      </div>
      <div className="f full">
        <label htmlFor="q-msg">What do you need?</label>
        <textarea id="q-msg" name="msg" rows={5} maxLength={5000} defaultValue={v.msg} {...invalid("msg")} />
      </div>

      <div className="hp" aria-hidden="true">
        <label htmlFor="q-website">Leave this empty</label>
        <input id="q-website" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile full" data-sitekey={turnstileSiteKey} data-appearance="interaction-only" />
        </>
      )}

      <div className="send full">
        <p className={`form-note${state.status === "error" ? " is-error" : ""}`} id="form-note" aria-live="polite" role={state.status === "error" ? "alert" : undefined}>
          {state.message}
        </p>
        <button type="submit" className="btn btn-accent" disabled={pending}>
          {pending ? "Sending…" : "Send enquiry"}
        </button>
      </div>
      {Object.entries(err).map(([f, msg]) => (
        <span key={f} id={`${f}-err`} className="sr">
          {msg}
        </span>
      ))}
    </form>
  );
}

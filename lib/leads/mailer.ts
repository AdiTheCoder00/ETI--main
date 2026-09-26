import "server-only";
import { Resend } from "resend";
import { mailConfig } from "@/lib/env";
import { clientAutoReply, studioNotification, type Email } from "./email";
import type { Lead } from "./schema";

/** Emails the studio and auto-replies to the client. Failures are logged; the lead is already saved. */
export async function sendLeadEmails(lead: Lead): Promise<void> {
  const cfg = mailConfig();
  const emails = [studioNotification(lead, cfg), clientAutoReply(lead, cfg)];

  if (!cfg.resendApiKey) {
    const hint = process.env.NODE_ENV === "production" ? "RESEND_API_KEY is not set; " : "";
    for (const e of emails) console.info(`[mail] ${hint}not sent (no Resend key)\n  to: ${e.to}\n  subject: ${e.subject}\n\n${e.text}\n`);
    return;
  }

  const resend = new Resend(cfg.resendApiKey);
  const results = await Promise.allSettled(emails.map((e) => send(resend, e)));
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[mail] failed to send "${emails[i].subject}" for lead ${lead.id}`, r.reason);
  });
}

async function send(resend: Resend, e: Email) {
  const { error } = await resend.emails.send({
    from: e.from,
    to: e.to,
    replyTo: e.replyTo,
    subject: e.subject,
    text: e.text,
    html: e.html,
  });
  if (error) throw new Error(`${error.name}: ${error.message}`);
}

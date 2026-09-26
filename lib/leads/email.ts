import type { Lead } from "./schema";

export type Email = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

export type MailSettings = { from: string; studioInbox: string; siteUrl: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Keep header values on one line; form input must never be able to add headers.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

const wrap = (inner: string) =>
  `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:#16150F;max-width:560px">${inner}</div>`;

/** Notification to the studio. Reply-To is the client, so hitting reply answers them directly. */
export function studioNotification(lead: Lead, mail: MailSettings): Email {
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Type of job", lead.jobType],
    ["Where and when", lead.whereWhen || "Not given"],
  ];
  const inbox = `${mail.siteUrl.replace(/\/$/, "")}/admin`;
  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    lead.message || "(No message)",
    "",
    `Lead inbox: ${inbox}`,
  ].join("\n");
  const html = wrap(
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#5E5A50;font-family:Arial,sans-serif;font-size:13px;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`,
      )
      .join("")}</table>` +
      `<p style="white-space:pre-wrap;border-top:1px solid #D6D1C4;padding-top:16px;margin:0 0 24px">${esc(lead.message || "(No message)")}</p>` +
      `<p style="font-family:Arial,sans-serif;font-size:14px;margin:0"><a href="${esc(inbox)}" style="color:#C2410C">Open the lead inbox</a></p>`,
  );
  return {
    from: mail.from,
    to: mail.studioInbox,
    replyTo: lead.email,
    subject: oneLine(`New enquiry: ${lead.jobType} from ${lead.name}`).slice(0, 200),
    text,
    html,
  };
}

const JOB_PHRASES: Record<string, string> = {
  "Film, ad or music video": "a film, ad or music video shoot",
  FPV: "an FPV shoot",
  "Real estate": "a real estate shoot",
  Inspection: "an inspection",
  "Survey and mapping": "a survey",
  "Plant monitoring": "plant monitoring",
};

/**
 * Auto-reply to the client. Deliberately contains no text the visitor typed (only the
 * job type, which comes from a fixed list), so the form can't be used to send
 * arbitrary content to someone else's address.
 */
export function clientAutoReply(lead: Lead, mail: MailSettings): Email {
  const paras = [
    `Thanks for getting in touch about ${JOB_PHRASES[lead.jobType] ?? "your project"}. Your enquiry has reached the studio.`,
    "We’ll come back to you, usually within a couple of hours, with whether it’s flyable, what permissions it needs, and a price.",
    "If anything changes in the meantime, just reply to this email.",
    "ETI Drone Visuals\nBandra-Kurla Complex, Mumbai",
  ];
  return {
    from: mail.from,
    to: lead.email,
    replyTo: mail.studioInbox,
    subject: "We’ve got your enquiry",
    text: paras.join("\n\n"),
    html: wrap(paras.map((p) => `<p style="white-space:pre-line">${esc(p)}</p>`).join("")),
  };
}

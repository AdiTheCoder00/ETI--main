"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { ipSalt, mailConfig, turnstileSecret } from "@/lib/env";
import { handleEnquiry, type EnquiryState } from "@/lib/leads/enquiry";
import { sendLeadEmails } from "@/lib/leads/mailer";
import { clientIp, hashIp, verifyTurnstile } from "@/lib/leads/spam";
import { getLeadStore } from "@/lib/leads/store";

export async function submitEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  const h = await headers();
  const ip = clientIp(h);
  const secret = turnstileSecret();

  return handleEnquiry(form, {
    store: await getLeadStore(),
    ipHash: ip ? hashIp(ip, ipSalt()) : null,
    userAgent: h.get("user-agent"),
    verifyHuman: async () =>
      !secret || verifyTurnstile(secret, String(form.get("cf-turnstile-response") ?? ""), ip),
    // Send after the response so the visitor isn't waiting on two email API calls.
    notify: (lead) => after(() => sendLeadEmails(lead)),
    studioEmail: mailConfig().studioInbox,
  });
}

import { describe, expect, it, vi } from "vitest";
import { isAllowedAdmin } from "@/lib/auth";
import { clientAutoReply, studioNotification } from "@/lib/leads/email";
import type { Lead } from "@/lib/leads/schema";
import { clientIp, hashIp, verifyTurnstile } from "@/lib/leads/spam";

vi.mock("@/lib/supabase/server", () => ({}));

const mail = { from: "ETI <enquiries@eti.test>", studioInbox: "studio@eti.test", siteUrl: "https://eti.test/" };
const lead: Lead = {
  id: "1",
  createdAt: "2026-09-26T00:00:00Z",
  updatedAt: "2026-09-26T00:00:00Z",
  name: "Mallory\r\nBcc: victim@example.com",
  email: "client@example.com",
  jobType: "FPV",
  whereWhen: "<b>Goa</b>",
  message: '<img src=x onerror="alert(1)">\nsecond line',
  status: "new",
  source: "contact_form",
};

describe("studio notification", () => {
  const e = studioNotification(lead, mail);

  it("goes to the studio with the client as reply-to", () => {
    expect(e.to).toBe("studio@eti.test");
    expect(e.replyTo).toBe("client@example.com");
  });

  it("keeps the subject on one line", () => {
    expect(e.subject).not.toMatch(/[\r\n]/);
    expect(e.subject).toContain("FPV");
  });

  it("escapes visitor input in HTML", () => {
    expect(e.html).not.toContain("<img");
    expect(e.html).not.toContain("<b>Goa");
    expect(e.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("links to the lead inbox", () => {
    expect(e.text).toContain("https://eti.test/admin");
  });
});

describe("client auto-reply", () => {
  const e = clientAutoReply(lead, mail);

  it("goes to the client with the studio as reply-to", () => {
    expect(e.to).toBe("client@example.com");
    expect(e.replyTo).toBe("studio@eti.test");
  });

  it("contains nothing the visitor typed", () => {
    for (const body of [e.text, e.html, e.subject]) {
      expect(body).not.toContain("Mallory");
      expect(body).not.toContain("Goa");
      expect(body).not.toContain("onerror");
    }
    expect(e.text).toContain("an FPV shoot");
  });
});

describe("spam helpers", () => {
  it("hashes IPs with a salt", () => {
    expect(hashIp("1.2.3.4", "a")).toBe(hashIp("1.2.3.4", "a"));
    expect(hashIp("1.2.3.4", "a")).not.toBe(hashIp("1.2.3.4", "b"));
    expect(hashIp("1.2.3.4", "a")).not.toContain("1.2.3.4");
  });

  it("reads the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(new Headers())).toBeNull();
  });

  it("verifies Turnstile tokens and fails closed", async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    expect(await verifyTurnstile("s", "tok", "1.1.1.1", ok as typeof fetch)).toBe(true);
    const body = (ok.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams;
    expect(body.get("remoteip")).toBe("1.1.1.1");

    const no = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    expect(await verifyTurnstile("s", "tok", null, no as typeof fetch)).toBe(false);
    const down = vi.fn(async () => Promise.reject(new Error("offline")));
    expect(await verifyTurnstile("s", "tok", null, down as typeof fetch)).toBe(false);
    expect(await verifyTurnstile("s", "", null, ok as typeof fetch)).toBe(false);
  });
});

describe("admin allowlist", () => {
  it("matches case-insensitively and rejects everyone else", () => {
    const list = ["owner@eti.test"];
    expect(isAllowedAdmin("Owner@ETI.test", list)).toBe(true);
    expect(isAllowedAdmin("someone@eti.test", list)).toBe(false);
    expect(isAllowedAdmin(null, list)).toBe(false);
    expect(isAllowedAdmin("owner@eti.test", [])).toBe(false);
  });
});

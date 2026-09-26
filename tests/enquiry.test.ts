import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleEnquiry, type EnquiryDeps } from "@/lib/leads/enquiry";
import { createFileLeadStore } from "@/lib/leads/store-file";
import { RATE_LIMIT } from "@/lib/leads/spam";
import type { LeadStore } from "@/lib/leads/store";
import type { Lead } from "@/lib/leads/schema";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const valid = {
  fullname: "Asha Rao",
  email: "asha@example.com",
  type: "Inspection",
  where: "Pune, mid-November",
  msg: "Chimney stack, 120 m, need thermal.",
};

let dir: string;
let store: LeadStore;
let deps: EnquiryDeps;
let notify: ReturnType<typeof vi.fn<(lead: Lead) => void>>;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "eti-leads-"));
  store = createFileLeadStore(path.join(dir, "leads.json"));
  notify = vi.fn<(lead: Lead) => void>();
  deps = {
    store,
    ipHash: "ip-a",
    userAgent: "test",
    verifyHuman: async () => true,
    notify,
    studioEmail: "contact@etidronevisuals.com",
  };
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("handleEnquiry", () => {
  it("saves a valid enquiry as a new lead and notifies", async () => {
    const res = await handleEnquiry(form(valid), deps);
    expect(res.status).toBe("ok");
    const leads = await store.list();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      name: "Asha Rao",
      email: "asha@example.com",
      jobType: "Inspection",
      whereWhen: "Pune, mid-November",
      status: "new",
      source: "contact_form",
    });
    expect(notify).toHaveBeenCalledWith(leads[0]);
  });

  it("returns field errors and keeps what was typed", async () => {
    const res = await handleEnquiry(form({ ...valid, fullname: "  ", email: "not-an-email" }), deps);
    expect(res.status).toBe("error");
    expect(res.fieldErrors?.fullname).toBeTruthy();
    expect(res.fieldErrors?.email).toBeTruthy();
    expect(res.values?.msg).toBe(valid.msg);
    expect(await store.list()).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("maps an unknown job type to 'Something else'", async () => {
    await handleEnquiry(form({ ...valid, type: "<script>" }), deps);
    expect((await store.list())[0].jobType).toBe("Something else");
  });

  it("silently drops honeypot submissions", async () => {
    const res = await handleEnquiry(form({ ...valid, website: "http://spam.example" }), deps);
    expect(res.status).toBe("ok");
    expect(await store.list()).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("rejects when the human check fails", async () => {
    const res = await handleEnquiry(form(valid), { ...deps, verifyHuman: async () => false });
    expect(res.status).toBe("error");
    expect(await store.list()).toHaveLength(0);
  });

  it("rate-limits per IP within the window", async () => {
    for (let i = 0; i < RATE_LIMIT.max; i++) {
      expect((await handleEnquiry(form(valid), deps)).status).toBe("ok");
    }
    const blocked = await handleEnquiry(form(valid), deps);
    expect(blocked.status).toBe("error");
    expect(blocked.message).toContain("contact@etidronevisuals.com");

    // a different visitor is unaffected
    expect((await handleEnquiry(form(valid), { ...deps, ipHash: "ip-b" })).status).toBe("ok");

    // and the limit lifts once the window has passed
    const later = () => new Date(Date.now() + RATE_LIMIT.windowMs + 1000);
    expect((await handleEnquiry(form(valid), { ...deps, now: later })).status).toBe("ok");
  });

  it("reports a storage failure with the fallback email instead of throwing", async () => {
    const broken = { ...store, create: async () => Promise.reject(new Error("db down")) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleEnquiry(form(valid), { ...deps, store: broken });
    expect(res.status).toBe("error");
    expect(res.message).toContain("contact@etidronevisuals.com");
  });
});

describe("file lead store", () => {
  it("filters, counts and updates status", async () => {
    await handleEnquiry(form(valid), deps);
    await handleEnquiry(form({ ...valid, fullname: "Vikram" }), { ...deps, ipHash: "ip-b" });
    const [newest] = await store.list();
    expect(newest.name).toBe("Vikram");

    expect(await store.setStatus(newest.id, "quoted")).toBe(true);
    expect(await store.setStatus("missing", "won")).toBe(false);
    expect(await store.countByStatus()).toEqual({ new: 1, quoted: 1, won: 0, lost: 0 });
    expect((await store.list({ status: "quoted" })).map((l) => l.name)).toEqual(["Vikram"]);
  });

  it("does not expose IP hashes or user agents", async () => {
    await handleEnquiry(form(valid), deps);
    const [lead] = await store.list();
    expect(lead).not.toHaveProperty("ipHash");
    expect(lead).not.toHaveProperty("userAgent");
  });
});

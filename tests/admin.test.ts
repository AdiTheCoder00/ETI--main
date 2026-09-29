import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_FLIGHTS } from "@/lib/content/defaults";
import { flightInputSchema, isAllowedClip, isAllowedStill } from "@/lib/content/flight-schema";
import { toShot } from "@/lib/content/shots";
import { createFileContentStore } from "@/lib/content/store-file";
import type { ContentStore } from "@/lib/content/store";
import { blobStoreOrigin, buildCsp } from "@/lib/csp";
import { csvCell, leadsToCsv } from "@/lib/leads/csv";
import type { Lead } from "@/lib/leads/schema";
import { normaliseQuery } from "@/lib/leads/schema";
import { niceScale, summarise, weekStart } from "@/lib/leads/stats";
import { createFileLeadStore } from "@/lib/leads/store-file";
import { DEFAULT_SETTINGS, readSettings, settingsSchema, telHref, whatsappHref } from "@/lib/settings";
import { BUNDLED_STILLS } from "@/lib/stills";
import { storageName, uploadMode } from "@/lib/uploads";
import { clipUrl, nextShot, slugify } from "@/lib/work";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "eti-admin-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const upload = "https://abc123xyz.public.blob.vercel-storage.com/work/stills/deck-Ab12Cd.jpg";
const blur = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD";

const flightForm = {
  slug: "bridge-deck-survey",
  title: "Bridge deck survey",
  location: "Pune",
  category: "Construction",
  kit: "RTK, 4K",
  alt: "Top-down view of a bridge deck under construction",
  note: "",
  still: "plant-fpv.jpg",
  clip: "",
  wide: "on",
  onHomepage: "on",
  visible: "on",
};

describe("media sources", () => {
  it("accepts bundled stills, uploads and clip-store file names", () => {
    expect(isAllowedStill("")).toBe(true);
    for (const name of Object.keys(BUNDLED_STILLS)) expect(isAllowedStill(name), name).toBe(true);
    expect(isAllowedStill(upload)).toBe(true);
    expect(isAllowedStill("/media/uploads/work/stills/deck-1a2b.jpg")).toBe(true);
    expect(isAllowedClip("plant-fpv.mp4")).toBe(true);
    expect(isAllowedClip("https://abc.public.blob.vercel-storage.com/work/clips/x-1.mp4")).toBe(true);
  });

  it("refuses anything the site couldn't serve safely", () => {
    for (const bad of [
      "javascript:alert(1)",
      "https://evil.example/work/x.jpg",
      "http://abc.public.blob.vercel-storage.com/work/x.jpg",
      "https://abc.public.blob.vercel-storage.com/other/x.jpg",
      "https://abc.public.blob.vercel-storage.com/work/../other/x.jpg",
      "/media/../../etc/passwd",
      "/media/work/plant-fpv.jpg",
      "//evil.example/x.jpg",
      "data:image/png;base64,AAAA",
      "not-a-bundled-still.jpg",
      "constructor",
    ]) {
      expect(isAllowedStill(bad), bad).toBe(false);
    }
    for (const bad of ["javascript:alert(1)", "https://evil.example/work/x.mp4", "clip.mov", "sub/dir.mp4", "//evil.example/x.mp4"]) {
      expect(isAllowedClip(bad), bad).toBe(false);
    }
  });

  it("resolves clip file names against the clip store, and leaves URLs alone", () => {
    expect(clipUrl("plant-fpv.mp4")).toBe("/media/clips/plant-fpv.mp4");
    expect(clipUrl("/media/uploads/work/clips/a.mp4")).toBe("/media/uploads/work/clips/a.mp4");
    expect(clipUrl("https://x.public.blob.vercel-storage.com/work/clips/a.mp4")).toBe("https://x.public.blob.vercel-storage.com/work/clips/a.mp4");
  });
});

describe("flight form", () => {
  it("parses checkboxes and trims text", () => {
    const r = flightInputSchema.safeParse({ ...flightForm, title: "  Bridge deck survey  ", wide: undefined });
    expect(r.success && r.data).toMatchObject({ title: "Bridge deck survey", wide: false, onHomepage: true, visible: true });
  });

  it("needs a still or a clip", () => {
    const r = flightInputSchema.safeParse({ ...flightForm, still: "", clip: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["still"]);
  });

  it("rejects an unknown category, a bad address and a smuggled media URL", () => {
    expect(flightInputSchema.safeParse({ ...flightForm, category: "Weddings" }).success).toBe(false);
    expect(flightInputSchema.safeParse({ ...flightForm, still: "javascript:alert(1)" }).success).toBe(false);
    for (const slug of ["", "Bridge Deck", "bridge--deck", "-bridge", "../admin", "bridge/deck"]) {
      expect(flightInputSchema.safeParse({ ...flightForm, slug }).success, slug).toBe(false);
    }
  });

  it("needs an uploaded still's size, keeps a valid blur and drops a bad one", () => {
    expect(flightInputSchema.safeParse({ ...flightForm, still: upload }).success).toBe(false);
    const ok = flightInputSchema.parse({ ...flightForm, still: upload, stillWidth: "1280", stillHeight: "720", stillBlur: blur });
    expect(ok).toMatchObject({ stillWidth: 1280, stillHeight: 720, stillBlur: blur });
    const bad = flightInputSchema.parse({ ...flightForm, still: upload, stillWidth: "1280", stillHeight: "720", stillBlur: "javascript:x" });
    expect(bad.stillBlur).toBe("");
  });

  it("forgets size and blur for a bundled still, which brings its own", () => {
    const r = flightInputSchema.parse({ ...flightForm, stillWidth: "99", stillHeight: "99", stillBlur: blur });
    expect(r).toMatchObject({ stillWidth: 0, stillHeight: 0, stillBlur: "" });
  });

  it("keeps the launch flights valid under the same rules the form uses", () => {
    for (const f of DEFAULT_FLIGHTS) expect(flightInputSchema.safeParse(f).success, f.title).toBe(true);
    expect(new Set(DEFAULT_FLIGHTS.map((f) => f.slug)).size).toBe(DEFAULT_FLIGHTS.length);
    for (const f of DEFAULT_FLIGHTS) expect(BUNDLED_STILLS[f.still], f.still).toBeDefined();
  });

  it("makes an address from a title", () => {
    expect(slugify("Chimney stack audit")).toBe("chimney-stack-audit");
    expect(slugify("  Café & Crane — 4K!  ")).toBe("cafe-crane-4k");
  });
});

describe("shots for the public pages", () => {
  it("gives a bundled still its import, and an upload the size and blur recorded for it", () => {
    const [launch] = DEFAULT_FLIGHTS;
    expect(toShot(launch).image).toBe(BUNDLED_STILLS[launch.still]);
    const uploaded = toShot({ ...launch, still: upload, stillWidth: 1280, stillHeight: 720, stillBlur: blur });
    expect(uploaded.image).toEqual({ src: upload, width: 1280, height: 720, blurDataURL: blur });
  });

  it("never hands next/image a blur-less upload, and drops a still with no size", () => {
    const [launch] = DEFAULT_FLIGHTS;
    expect(toShot({ ...launch, still: upload, stillWidth: 1280, stillHeight: 720, stillBlur: "" }).image?.blurDataURL).toMatch(/^data:image\/png/);
    expect(toShot({ ...launch, still: upload, stillWidth: 0, stillHeight: 0 }).image).toBeUndefined();
  });

  it("links each case page on to the next, and stops when there is only one", () => {
    const shots = DEFAULT_FLIGHTS.slice(0, 3).map(toShot);
    expect(nextShot(shots, shots[2].slug)?.slug).toBe(shots[0].slug);
    expect(nextShot(shots.slice(0, 1), shots[0].slug)).toBeUndefined();
  });
});

describe("content security policy", () => {
  const token = "vercel_blob_rw_AbC123xyz_s3cr3tS3cr3t";

  it("names this project's Blob store, from its token", () => {
    expect(blobStoreOrigin(token)).toBe("https://abc123xyz.public.blob.vercel-storage.com");
    expect(blobStoreOrigin("")).toBeNull();
    expect(blobStoreOrigin("vercel_blob_rw_evil.example/x_y")).toBeNull();
  });

  it("lets pages load uploads, and only /admin talk to the upload API", () => {
    const before = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = token;
    try {
      const pub = buildCsp({ dev: false });
      const admin = buildCsp({ nonce: "n0nce", dev: false });
      for (const csp of [pub, admin]) {
        expect(csp).toMatch(/img-src [^;]*https:\/\/abc123xyz\.public\.blob\.vercel-storage\.com/);
        expect(csp).toMatch(/media-src [^;]*https:\/\/abc123xyz\.public\.blob\.vercel-storage\.com/);
      }
      expect(admin).toMatch(/connect-src [^;]*https:\/\/vercel\.com/);
      expect(pub).not.toMatch(/connect-src [^;]*vercel\.com/);
    } finally {
      if (before === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
      else process.env.BLOB_READ_WRITE_TOKEN = before;
    }
  });
});

describe("site settings", () => {
  const valid = { ...DEFAULT_SETTINGS, phone: "+91 98200 00000", instagram: "https://www.instagram.com/etidrone" };

  it("starts with no year and no phone: the site states only what the owner gives it", () => {
    expect(DEFAULT_SETTINGS.foundedYear).toBe("");
    expect(DEFAULT_SETTINGS.phone).toBe("");
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });

  it("accepts real details", () => {
    expect(settingsSchema.safeParse({ ...valid, foundedYear: "2016" }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...valid, foundedYear: "21" }).success).toBe(false);
  });

  it("only takes profile links on that network, over https", () => {
    for (const bad of ["javascript:alert(1)", "http://instagram.com/eti", "https://instagram.com.evil.example/x", "https://evil.example/instagram.com"]) {
      expect(settingsSchema.safeParse({ ...valid, instagram: bad }).success, bad).toBe(false);
    }
  });

  it("wants the phone with its country code", () => {
    expect(settingsSchema.safeParse({ ...valid, phone: "98200 00000" }).success).toBe(false);
    expect(telHref("+91 98200 00000")).toBe("tel:+919820000000");
    expect(whatsappHref("+91 (98200) 00000")).toBe("https://wa.me/919820000000");
  });

  it("falls back field by field when stored settings are partial or stale", () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({ email: "studio@eti.test", instagram: "javascript:x", extra: 1 })).toEqual({ ...DEFAULT_SETTINGS, email: "studio@eti.test" });
  });
});

describe("file content store", () => {
  let store: ContentStore;
  beforeEach(() => {
    store = createFileContentStore(dir);
  });

  it("serves the launch flights until the first edit", async () => {
    expect((await store.listFlights()).map((f) => f.id)).toEqual(DEFAULT_FLIGHTS.map((f) => f.id));
  });

  it("adds, edits, reorders, flags and deletes", async () => {
    const input = flightInputSchema.parse(flightForm);
    const added = await store.createFlight(input);
    let list = await store.listFlights();
    expect(list.at(-1)?.id).toBe(added.id);

    expect(await store.moveFlight(added.id, 1)).toBe(false); // already last
    expect(await store.moveFlight(added.id, -1)).toBe(true);
    list = await store.listFlights();
    expect(list.at(-2)?.id).toBe(added.id);

    expect(await store.updateFlight(added.id, { ...input, title: "Renamed" })).toBe(true);
    expect(await store.setFlightFlags(added.id, { visible: false })).toBe(true);
    expect(await store.getFlight(added.id)).toMatchObject({ title: "Renamed", visible: false, onHomepage: true });

    expect(await store.deleteFlight(added.id)).toBe(true);
    expect(await store.getFlight(added.id)).toBeNull();
    expect(await store.updateFlight("missing", input)).toBe(false);
    expect(await store.listFlights()).toHaveLength(DEFAULT_FLIGHTS.length);
  });

  it("round-trips settings", async () => {
    expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS);
    const next = { ...DEFAULT_SETTINGS, foundedYear: "2019", phone: "+91 98200 00000" };
    await store.saveSettings(next);
    expect(await createFileContentStore(dir).getSettings()).toEqual(next);
  });
});

describe("lead tools", () => {
  const base = { jobType: "Inspection", whereWhen: "", source: "contact_form", ipHash: null, userAgent: null };

  it("searches across fields and notes, keeps notes, deletes", async () => {
    const store = createFileLeadStore(path.join(dir, "leads.json"));
    const a = await store.create({ ...base, name: "Asha Rao", email: "asha_rao@studio.in", message: "Chimney stack" });
    await store.create({ ...base, name: "Vikram", email: "v@example.com", message: "Wedding teaser" });

    expect(a.notes).toBe("");
    expect(await store.setNotes(a.id, "Quoted ₹85k, follow up Friday")).toBe(true);
    expect((await store.list({ q: "follow up" })).map((l) => l.name)).toEqual(["Asha Rao"]);
    expect((await store.list({ q: "ASHA_RAO@" })).map((l) => l.name)).toEqual(["Asha Rao"]);
    expect((await store.list({ q: "wedding", status: "won" })).length).toBe(0);

    expect(await store.remove(a.id)).toBe(true);
    expect(await store.remove(a.id)).toBe(false);
    expect((await store.list()).map((l) => l.name)).toEqual(["Vikram"]);
  });

  it("normalises the search box so it can't escape a quoted filter value", () => {
    expect(normaliseQuery('  asha"),name.eq.x  ')).toBe("asha ),name.eq.x");
    expect(normaliseQuery("a\\b*c")).toBe("a b c");
    expect(normaliseQuery("first_last@studio.in")).toBe("first_last@studio.in");
    expect(normaliseQuery(["array"])).toBe("");
    expect(normaliseQuery("x".repeat(300))).toHaveLength(100);
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas and quotes properly", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csvCell("+91 98200")).toBe("'+91 98200");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("Pune, November")).toBe('"Pune, November"');
    expect(csvCell("plain")).toBe("plain");
  });

  it("starts with a BOM and a header row", () => {
    const lead: Lead = {
      id: "1", createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", name: "Asha", email: "a@x.in",
      jobType: "FPV", whereWhen: "", message: "line one\nline two", status: "new", source: "contact_form", notes: "",
    };
    const csv = leadsToCsv([lead]);
    expect(csv.startsWith("﻿Received,Status,Name")).toBe(true);
    expect(csv).toContain('"line one\nline two"');
  });
});

describe("dashboard numbers", () => {
  it("starts weeks on Monday midnight in Mumbai", () => {
    // Sunday 23:00 IST is still the old week; Monday 00:30 IST is the new one.
    const sundayLate = Date.parse("2026-09-27T17:30:00Z");
    const mondayEarly = Date.parse("2026-09-27T19:00:00Z");
    expect(weekStart(mondayEarly)).toBe(Date.parse("2026-09-27T18:30:00Z"));
    expect(weekStart(sundayLate)).toBe(Date.parse("2026-09-20T18:30:00Z"));
  });

  it("counts weeks, job types and the win rate", () => {
    const now = Date.parse("2026-09-29T06:00:00Z");
    const rows = [
      { createdAt: "2026-09-28T05:00:00Z", jobType: "FPV", status: "won" as const },
      { createdAt: "2026-09-22T05:00:00Z", jobType: "FPV", status: "lost" as const },
      { createdAt: "2026-09-21T05:00:00Z", jobType: "Inspection", status: "won" as const },
      { createdAt: "2025-01-01T05:00:00Z", jobType: "Old form value", status: "new" as const },
    ];
    const s = summarise(rows, now);
    expect(s.total).toBe(4);
    expect(s.last30).toBe(3);
    expect(s.weekly).toHaveLength(12);
    expect(s.weekly.at(-1)?.count).toBe(1);
    expect(s.weekly.at(-2)?.count).toBe(2);
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.byJobType[0]).toEqual({ jobType: "FPV", count: 2 });
    expect(s.byJobType.find((r) => r.jobType === "Old form value")?.count).toBe(1);
    expect(summarise([], now).winRate).toBeNull();
  });

  it("draws count axes with clean ticks", () => {
    expect(niceScale(0)).toEqual({ top: 4, ticks: [0, 1, 2, 3, 4] });
    expect(niceScale(7)).toEqual({ top: 8, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(37).top).toBe(40);
  });
});

describe("uploads", () => {
  it("picks where uploads go", () => {
    expect(uploadMode({ blobToken: "t", hasSupabase: true, production: true })).toBe("blob");
    expect(uploadMode({ blobToken: "", hasSupabase: false, production: false })).toBe("local");
    // a shared database must never point at files on one laptop
    expect(uploadMode({ blobToken: "", hasSupabase: true, production: false })).toBe("off");
    expect(uploadMode({ blobToken: "", hasSupabase: false, production: true })).toBe("off");
  });

  it("names files by kind and type, keeping only a safe stem", () => {
    expect(storageName("image", "../../Chimney Stack (final).JPG", "image/jpeg")).toBe("work/stills/chimney-stack-final.jpg");
    expect(storageName("video", "clip.mp4", "video/quicktime")).toBeNull();
    expect(storageName("image", ".png", "image/png")).toBe("work/stills/image.png");
  });
});

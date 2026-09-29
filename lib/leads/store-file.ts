import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { LEAD_STATUSES, SEARCH_FIELDS, type Lead, type LeadStatus } from "./schema";
import type { LeadStore } from "./store";

type StoredLead = Lead & { ipHash: string | null; userAgent: string | null };

/**
 * Local development only: leads in .data/leads.json (git-ignored). Not safe for
 * concurrent writers or serverless hosts, which is why production requires Supabase.
 */
export function createFileLeadStore(file = path.join(process.cwd(), ".data", "leads.json")): LeadStore {
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<StoredLead[]> {
    try {
      // leads saved before notes existed have no notes field
      return (JSON.parse(await readFile(file, "utf8")) as StoredLead[]).map((l) => ({ ...l, notes: l.notes ?? "" }));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }

  async function save(leads: StoredLead[]) {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(leads, null, 2));
    await rename(tmp, file);
  }

  // Serialise read-modify-write cycles within this process.
  function locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
  }

  /** Change one lead in place; false when it doesn't exist. */
  const update = (id: string, patch: (lead: StoredLead) => void) =>
    locked(async () => {
      const leads = await load();
      const lead = leads.find((l) => l.id === id);
      if (!lead) return false;
      patch(lead);
      lead.updatedAt = new Date().toISOString();
      await save(leads);
      return true;
    });

  const matches = (lead: Lead, q: string) => {
    const needle = q.toLowerCase();
    return SEARCH_FIELDS.some((f) => lead[f].toLowerCase().includes(needle));
  };

  const strip = (stored: StoredLead): Lead => {
    const { ipHash, userAgent, ...lead } = stored;
    void ipHash;
    void userAgent;
    return lead;
  };

  return {
    create: (input) =>
      locked(async () => {
        const leads = await load();
        const now = new Date().toISOString();
        const lead: StoredLead = { id: randomUUID(), createdAt: now, updatedAt: now, status: "new", notes: "", ...input };
        leads.push(lead);
        await save(leads);
        return strip(lead);
      }),

    async countFromIpSince(ipHash, since) {
      const leads = await load();
      return leads.filter((l) => l.ipHash === ipHash && new Date(l.createdAt) >= since).length;
    },

    async list(filter) {
      const leads = await load();
      // Leads are appended, so reversing first puts the later of two same-millisecond leads first:
      // the sort is stable and a timestamp tie keeps that order.
      return leads
        .filter((l) => !filter?.status || l.status === filter.status)
        .filter((l) => !filter?.q || matches(l, filter.q))
        .reverse()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, filter?.limit ?? 500)
        .map(strip);
    },

    async statRows() {
      return (await load()).map(({ createdAt, jobType, status }) => ({ createdAt, jobType, status }));
    },

    async countByStatus() {
      const leads = await load();
      const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
      for (const l of leads) counts[l.status]++;
      return counts;
    },

    setStatus: (id, status) =>
      update(id, (lead) => {
        lead.status = status;
      }),

    setNotes: (id, notes) =>
      update(id, (lead) => {
        lead.notes = notes;
      }),

    remove: (id) =>
      locked(async () => {
        const leads = await load();
        const i = leads.findIndex((l) => l.id === id);
        if (i < 0) return false;
        leads.splice(i, 1);
        await save(leads);
        return true;
      }),
  };
}

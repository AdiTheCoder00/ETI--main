import "server-only";
import { supabaseConfig } from "@/lib/env";
import type { Lead, LeadStatus, NewLead } from "./schema";

/** `limit` defaults to the 500 newest, enough for the inbox; the CSV export asks for more. */
export type LeadFilter = { status?: LeadStatus; q?: string; limit?: number };
/** Just what the dashboard counts, for every lead. */
export type LeadStatRow = Pick<Lead, "createdAt" | "jobType" | "status">;

export interface LeadStore {
  create(lead: NewLead): Promise<Lead>;
  /** Submissions from one (hashed) IP since a point in time, for rate limiting. */
  countFromIpSince(ipHash: string, since: Date): Promise<number>;
  /** Newest first. `q` is an already-normalised search (see normaliseQuery). */
  list(filter?: LeadFilter): Promise<Lead[]>;
  countByStatus(): Promise<Record<LeadStatus, number>>;
  setStatus(id: string, status: LeadStatus): Promise<boolean>;
  setNotes(id: string, notes: string): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  statRows(): Promise<LeadStatRow[]>;
}

let store: Promise<LeadStore> | null = null;

export function getLeadStore(): Promise<LeadStore> {
  store ??= supabaseConfig()
    ? import("./store-supabase").then((m) => m.createSupabaseLeadStore())
    : import("./store-file").then((m) => m.createFileLeadStore());
  return store;
}

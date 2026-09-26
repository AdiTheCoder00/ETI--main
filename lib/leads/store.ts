import "server-only";
import { supabaseConfig } from "@/lib/env";
import type { Lead, LeadStatus, NewLead } from "./schema";

export interface LeadStore {
  create(lead: NewLead): Promise<Lead>;
  /** Submissions from one (hashed) IP since a point in time, for rate limiting. */
  countFromIpSince(ipHash: string, since: Date): Promise<number>;
  list(filter?: { status?: LeadStatus }): Promise<Lead[]>;
  countByStatus(): Promise<Record<LeadStatus, number>>;
  setStatus(id: string, status: LeadStatus): Promise<boolean>;
}

let store: Promise<LeadStore> | null = null;

export function getLeadStore(): Promise<LeadStore> {
  store ??= supabaseConfig()
    ? import("./store-supabase").then((m) => m.createSupabaseLeadStore())
    : import("./store-file").then((m) => m.createFileLeadStore());
  return store;
}

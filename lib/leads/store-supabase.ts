import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "./schema";
import type { LeadStore } from "./store";

type LeadRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  job_type: string;
  where_when: string;
  message: string;
  status: LeadStatus;
  source: string;
};

const COLUMNS = "id, created_at, updated_at, name, email, job_type, where_when, message, status, source";

const toLead = (r: LeadRow): Lead => ({
  id: r.id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  name: r.name,
  email: r.email,
  jobType: r.job_type,
  whereWhen: r.where_when,
  message: r.message,
  status: r.status,
  source: r.source,
});

/**
 * Uses the service-role key, so it bypasses row level security. Only call it from
 * server code that has already checked who is asking (see lib/auth.ts).
 */
export function createSupabaseLeadStore(): LeadStore {
  const db = createServiceClient();

  return {
    async create(lead) {
      const { data, error } = await db
        .from("leads")
        .insert({
          name: lead.name,
          email: lead.email,
          job_type: lead.jobType,
          where_when: lead.whereWhen,
          message: lead.message,
          source: lead.source,
          ip_hash: lead.ipHash,
          user_agent: lead.userAgent,
        })
        .select(COLUMNS)
        .single<LeadRow>();
      if (error) throw new Error(`Saving lead failed: ${error.message}`);
      return toLead(data);
    },

    async countFromIpSince(ipHash, since) {
      const { count, error } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since.toISOString());
      if (error) throw new Error(`Rate-limit lookup failed: ${error.message}`);
      return count ?? 0;
    },

    async list(filter) {
      let q = db.from("leads").select(COLUMNS).order("created_at", { ascending: false }).limit(500);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q.returns<LeadRow[]>();
      if (error) throw new Error(`Loading leads failed: ${error.message}`);
      return data.map(toLead);
    },

    async countByStatus() {
      const entries = await Promise.all(
        LEAD_STATUSES.map(async (status) => {
          const { count, error } = await db
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          if (error) throw new Error(`Counting leads failed: ${error.message}`);
          return [status, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<LeadStatus, number>;
    },

    async setStatus(id, status) {
      const { data, error } = await db.from("leads").update({ status }).eq("id", id).select("id");
      if (error) throw new Error(`Updating lead failed: ${error.message}`);
      return data.length > 0;
    },
  };
}

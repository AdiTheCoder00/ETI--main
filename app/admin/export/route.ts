import { getAdmin } from "@/lib/auth";
import { leadsToCsv } from "@/lib/leads/csv";
import { normaliseQuery, statusSchema } from "@/lib/leads/schema";
import { getLeadStore } from "@/lib/leads/store";

/** The inbox as CSV, with the same status filter and search the page was showing. */
export async function GET(request: Request): Promise<Response> {
  if (!(await getAdmin())) return new Response("Sign in first.", { status: 401 });

  const params = new URL(request.url).searchParams;
  const status = statusSchema.safeParse(params.get("status"));
  const q = normaliseQuery(params.get("q"));
  const store = await getLeadStore();
  const leads = await store.list({ status: status.success ? status.data : undefined, q, limit: 10000 });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(leadsToCsv(leads), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eti-leads-${day}.csv"`,
      // lead data: never kept by a browser or shared cache
      "Cache-Control": "private, no-store",
    },
  });
}

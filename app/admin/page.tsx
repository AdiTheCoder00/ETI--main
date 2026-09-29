import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { LEAD_STATUSES, STATUS_LABELS as LABELS, normaliseQuery, statusSchema, type Lead, type LeadStatus } from "@/lib/leads/schema";
import { getLeadStore } from "@/lib/leads/store";
import { deleteLead } from "./actions";
import { AdminHeader } from "./AdminHeader";
import { ConfirmButton } from "./ConfirmButton";
import { LeadNotes } from "./LeadNotes";
import { StatusSelect } from "./StatusSelect";

const when = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** A link back to this page with the filters changed, keeping whichever are unchanged. */
function inboxHref(status: LeadStatus | undefined, q: string, base = "/admin") {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}

export default async function LeadInbox({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const { status: rawStatus, q: rawQ } = await searchParams;
  const parsed = statusSchema.safeParse(rawStatus);
  const status = parsed.success ? parsed.data : undefined;
  const q = normaliseQuery(rawQ);

  const store = await getLeadStore();
  const [leads, counts] = await Promise.all([store.list({ status, q }), store.countByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <AdminHeader admin={admin} current="leads" />

      <div className="adm-title">
        <h1 className="display">Leads</h1>
        <nav className="adm-tabs" aria-label="Filter by status">
          <Tab href={inboxHref(undefined, q)} active={!status} label="All" count={total} />
          {LEAD_STATUSES.map((s) => (
            <Tab key={s} href={inboxHref(s, q)} active={status === s} label={LABELS[s]} count={counts[s]} />
          ))}
        </nav>
      </div>

      <div className="adm-tools">
        <form role="search" action="/admin" method="get" className="adm-search">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="sr" htmlFor="lead-q">
            Search leads
          </label>
          <input id="lead-q" name="q" type="search" defaultValue={q} placeholder="Search name, email, message, notes" maxLength={100} />
          <button type="submit" className="btn adm-btn">
            Search
          </button>
          {q && (
            <Link href={inboxHref(status, "")} className="adm-link">
              Clear
            </Link>
          )}
        </form>
        {/* A plain link on purpose: the export route sends a download, not a page. */}
        <a href={inboxHref(status, q, "/admin/export")} className="adm-link" download>
          Export {q || status ? "these" : "all"} as CSV
        </a>
      </div>

      {leads.length === 0 ? (
        <p className="adm-empty">
          {q ? `Nothing matches “${q}”${status ? ` in ${LABELS[status].toLowerCase()}` : ""}.` : status ? `No leads marked ${LABELS[status].toLowerCase()}.` : "No enquiries yet."}
        </p>
      ) : (
        <ol className="adm-list">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </ol>
      )}
    </>
  );
}

function Tab({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link href={href} className="adm-tab" aria-current={active ? "page" : undefined}>
      {label} <span>{count}</span>
    </Link>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const reply = `mailto:${lead.email}?subject=${encodeURIComponent(`Re: your ${lead.jobType.toLowerCase()} enquiry`)}`;
  return (
    <li className="adm-lead" data-status={lead.status}>
      <div className="adm-meta">
        <time dateTime={lead.createdAt}>{when.format(new Date(lead.createdAt))}</time>
        <StatusSelect id={lead.id} status={lead.status} labels={LABELS} />
        <form action={deleteLead}>
          <input type="hidden" name="id" value={lead.id} />
          <ConfirmButton question={`Delete the enquiry from ${lead.name}? This can’t be undone.`}>Delete</ConfirmButton>
        </form>
      </div>
      <div className="adm-body">
        <div className="adm-who-line">
          <h2>{lead.name}</h2>
          <a href={reply}>{lead.email}</a>
        </div>
        <dl className="adm-facts">
          <div>
            <dt>Type of job</dt>
            <dd>{lead.jobType}</dd>
          </div>
          <div>
            <dt>Where and when</dt>
            <dd>{lead.whereWhen || "Not given"}</dd>
          </div>
        </dl>
        {lead.message ? <p className="adm-msg">{lead.message}</p> : <p className="adm-msg is-empty">No message.</p>}
        <LeadNotes id={lead.id} notes={lead.notes} />
      </div>
    </li>
  );
}

import Link from "next/link";
import { Mark } from "@/components/Mark";
import { requireAdmin } from "@/lib/auth";
import { LEAD_STATUSES, statusSchema, type Lead, type LeadStatus } from "@/lib/leads/schema";
import { getLeadStore } from "@/lib/leads/store";
import { signOut } from "./actions";
import { StatusSelect } from "./StatusSelect";

const LABELS: Record<LeadStatus, string> = { new: "New", quoted: "Quoted", won: "Won", lost: "Lost" };

const when = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function LeadInbox({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const { status: rawStatus } = await searchParams;
  const parsed = statusSchema.safeParse(rawStatus);
  const status = parsed.success ? parsed.data : undefined;

  const store = await getLeadStore();
  const [leads, counts] = await Promise.all([store.list({ status }), store.countByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <header className="adm-head">
        <Link href="/" className="brand">
          <Mark />
          <b>ETI</b>
          <span>Drone Visuals</span>
        </Link>
        <div className="adm-who">
          <span>{admin.email}</span>
          {!admin.local && (
            <form action={signOut}>
              <button type="submit" className="adm-link">
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>

      {admin.local && (
        <p className="adm-note">
          Local mode: Supabase isn’t configured, so leads are read from <code>.data/leads.json</code> and this page has no
          login. Production requires Supabase.
        </p>
      )}

      <div className="adm-title">
        <h1 className="display">Leads</h1>
        <nav className="adm-tabs" aria-label="Filter by status">
          <Tab href="/admin" active={!status} label="All" count={total} />
          {LEAD_STATUSES.map((s) => (
            <Tab key={s} href={`/admin?status=${s}`} active={status === s} label={LABELS[s]} count={counts[s]} />
          ))}
        </nav>
      </div>

      {leads.length === 0 ? (
        <p className="adm-empty">{status ? `No leads marked ${LABELS[status].toLowerCase()}.` : "No enquiries yet."}</p>
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
      </div>
    </li>
  );
}

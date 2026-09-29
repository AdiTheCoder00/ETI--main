import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/leads/schema";
import { niceScale, summarise } from "@/lib/leads/stats";
import { getLeadStore } from "@/lib/leads/store";
import { AdminHeader } from "../AdminHeader";

const weekLabel = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;

export default async function Dashboard() {
  const admin = await requireAdmin();
  const s = summarise(await (await getLeadStore()).statRows());
  const decided = s.byStatus.won + s.byStatus.lost;

  return (
    <>
      <AdminHeader admin={admin} current="dashboard" />
      <div className="adm-title">
        <h1 className="display">Dashboard</h1>
      </div>

      {s.total === 0 ? (
        <p className="adm-empty">No enquiries yet. The numbers start with the first one through the contact form.</p>
      ) : (
        <>
          <section className="adm-stats" aria-label="Summary">
            <div className="adm-hero-stat">
              <p className="adm-stat-label">Enquiries in the last 30 days</p>
              <p className="adm-hero-value">{s.last30.toLocaleString("en-IN")}</p>
            </div>
            <Stat label="All enquiries" value={s.total.toLocaleString("en-IN")} href="/admin" />
            <Stat label="Waiting for a reply" value={s.byStatus.new.toLocaleString("en-IN")} href="/admin?status=new" />
            <Stat label="Quoted, no decision yet" value={s.byStatus.quoted.toLocaleString("en-IN")} href="/admin?status=quoted" />
            <Stat
              label="Win rate"
              value={s.winRate === null ? "–" : `${Math.round(s.winRate * 100)}%`}
              note={decided ? `${s.byStatus.won} won of ${decided} decided` : "No leads marked won or lost yet"}
            />
          </section>

          <section className="adm-chart-block" aria-labelledby="weekly-h">
            <h2 id="weekly-h">Enquiries per week</h2>
            <p className="adm-sub">The last 12 weeks, Monday to Sunday. The last column is this week so far.</p>
            <WeeklyChart weekly={s.weekly} />
          </section>

          <section className="adm-chart-block" aria-labelledby="jobs-h">
            <h2 id="jobs-h">What people ask for</h2>
            <p className="adm-sub">Every enquiry by the type of job picked on the form.</p>
            <JobChart rows={s.byJobType} />
          </section>

          <details className="adm-table-view">
            <summary>Show these numbers as tables</summary>
            <table>
              <caption>Enquiries per week</caption>
              <thead>
                <tr>
                  <th scope="col">Week of</th>
                  <th scope="col">Enquiries</th>
                </tr>
              </thead>
              <tbody>
                {s.weekly.map((w) => (
                  <tr key={w.start}>
                    <th scope="row">{weekLabel.format(w.start)}</th>
                    <td>{w.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table>
              <caption>By type of job</caption>
              <thead>
                <tr>
                  <th scope="col">Type of job</th>
                  <th scope="col">Enquiries</th>
                </tr>
              </thead>
              <tbody>
                {s.byJobType.map((r) => (
                  <tr key={r.jobType}>
                    <th scope="row">{r.jobType}</th>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table>
              <caption>By status</caption>
              <tbody>
                {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((k) => (
                  <tr key={k}>
                    <th scope="row">{STATUS_LABELS[k]}</th>
                    <td>{s.byStatus[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </>
  );
}

function Stat({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  const body = (
    <>
      <p className="adm-stat-label">{label}</p>
      <p className="adm-stat-value">{value}</p>
      {note && <p className="adm-stat-note">{note}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="adm-stat">
      {body}
    </Link>
  ) : (
    <div className="adm-stat">{body}</div>
  );
}

/** Columns from one baseline, with hover and focus tooltips in CSS; the table view carries the same numbers. */
function WeeklyChart({ weekly }: { weekly: { start: number; count: number }[] }) {
  const { top, ticks } = niceScale(Math.max(...weekly.map((w) => w.count)));
  return (
    <div className="adm-cols" role="group" aria-label="Enquiries per week, last 12 weeks">
      <div className="adm-cols-plot">
        {ticks.map((t) => (
          <div key={t} className="adm-grid" style={{ bottom: `${(t / top) * 100}%` }}>
            <span>{t}</span>
          </div>
        ))}
        {weekly.map((w, i) => {
          const current = i === weekly.length - 1;
          const text = `${current ? "This week so far" : `Week of ${weekLabel.format(w.start)}`}: ${plural(w.count, "enquiry", "enquiries")}`;
          return (
            <div key={w.start} className="adm-col" tabIndex={0} aria-label={text}>
              {w.count > 0 && <i style={{ height: `${(w.count / top) * 100}%` }} />}
              <span className="adm-tip" aria-hidden="true">
                {text}
              </span>
            </div>
          );
        })}
      </div>
      <div className="adm-cols-axis" aria-hidden="true">
        {weekly.map((w, i) => {
          // Every other week (every fourth on a phone), plus this one. The week just before this
          // one stays unlabelled: its date would sit on top of "This wk".
          const last = i === weekly.length - 1;
          const shown = last || (i % 2 === 0 && i < weekly.length - 2);
          return (
            <span key={w.start} data-minor={!last && i % 4 !== 0 ? "" : undefined}>
              {last ? "This wk" : shown ? weekLabel.format(w.start) : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function JobChart({ rows }: { rows: { jobType: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="adm-bars">
      {rows.map((r) => (
        <li key={r.jobType} tabIndex={0} aria-label={`${r.jobType}: ${plural(r.count, "enquiry", "enquiries")}`}>
          <span className="adm-bar-label" aria-hidden="true">
            {r.jobType}
          </span>
          <span className="adm-bar-track" aria-hidden="true">
            {r.count > 0 && <i style={{ width: `${(r.count / max) * 100}%` }} />}
            <b>{r.count}</b>
          </span>
        </li>
      ))}
    </ul>
  );
}

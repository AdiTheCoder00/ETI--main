import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { toShot } from "@/lib/content/shots";
import { getContentStore } from "@/lib/content/store";
import { clipUrl, type Flight } from "@/lib/work";
import { AdminHeader } from "../AdminHeader";
import { moveFlight, setFlightFlag } from "./actions";

export default async function WorkAdmin() {
  const admin = await requireAdmin();
  const flights = await (await getContentStore()).listFlights();
  const live = flights.filter((f) => f.visible);

  return (
    <>
      <AdminHeader admin={admin} current="work" />
      <div className="adm-title">
        <h1 className="display">Work</h1>
        <Link href="/admin/work/new" className="btn btn-accent">
          Add a flight
        </Link>
      </div>
      <p className="adm-sub">
        {live.length} of {flights.length} on the site, {live.filter((f) => f.onHomepage).length} in the homepage reel. The order here is
        the order on the site.
      </p>

      {flights.length === 0 ? (
        <p className="adm-empty">No flights yet. The reel and /work are empty until you add one.</p>
      ) : (
        <ol className="adm-flights">
          {flights.map((f, i) => (
            <FlightRow key={f.id} flight={f} first={i === 0} last={i === flights.length - 1} />
          ))}
        </ol>
      )}
    </>
  );
}

function FlightRow({ flight: f, first, last }: { flight: Flight; first: boolean; last: boolean }) {
  const image = toShot(f).image;
  return (
    <li className="adm-flight" data-hidden={!f.visible || undefined}>
      <div className="adm-thumb">
        {image ? (
          <Image src={image} alt="" fill sizes="120px" quality={90} />
        ) : (
          f.clip && <video src={`${clipUrl(f.clip)}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
        )}
      </div>

      <div className="adm-flight-body">
        <h2>
          <Link href={`/admin/work/${f.id}`}>{f.title}</Link>
        </h2>
        <p>
          {f.location} · {f.category}
        </p>
        <p className="adm-badges">
          {!f.visible && <span>Hidden</span>}
          {f.visible && !f.onHomepage && <span>Only on /work</span>}
          {!f.clip && <span>No clip</span>}
        </p>
      </div>

      <div className="adm-flight-actions">
        <form action={moveFlight} className="adm-move">
          <input type="hidden" name="id" value={f.id} />
          <button type="submit" name="direction" value="up" className="adm-icon" disabled={first} aria-label={`Move ${f.title} up`}>
            ↑
          </button>
          <button type="submit" name="direction" value="down" className="adm-icon" disabled={last} aria-label={`Move ${f.title} down`}>
            ↓
          </button>
        </form>
        <FlagToggle flight={f} flag="visible" on="Hide" off="Show" />
        {f.visible && <FlagToggle flight={f} flag="onHomepage" on="Take off homepage" off="Put on homepage" />}
        <Link href={`/admin/work/${f.id}`} className="adm-link">
          Edit
        </Link>
      </div>
    </li>
  );
}

function FlagToggle({ flight, flag, on, off }: { flight: Flight; flag: "visible" | "onHomepage"; on: string; off: string }) {
  const current = flight[flag];
  return (
    <form action={setFlightFlag}>
      <input type="hidden" name="id" value={flight.id} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={String(!current)} />
      <button type="submit" className="adm-link">
        {current ? on : off}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { INDIA_PATH, INDIA_VIEWBOX, project } from "@/lib/map/india";
import { flightsAt, places, unplaced } from "@/lib/places";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

/**
 * The map of flown places on /work. The list is the real interface (keyboard, screen readers, phones);
 * the map mirrors it for the eye, and hovering either one lights up its partner. Map markers are
 * mouse-only shortcuts to the same case pages, so they are hidden from assistive tech and the tab order.
 */
export function PlacesMap() {
  const [active, setActive] = useState<string | null>(null);
  const on = (id: string) => () => setActive(id);
  const off = () => setActive(null);

  return (
    <div className="places-body">
      <figure className="places-map" data-wipe>
        <svg viewBox={INDIA_VIEWBOX} role="img" aria-label="Map of India marking the places in the list beside it">
          <path className="land" d={INDIA_PATH} />
          {places.map((p) => {
            const [x, y] = project(p.lon, p.lat);
            const slug = flightsAt(p).find((f) => f.shot)?.shot?.slug;
            const pin = (
              <g
                className={`pin ${p.kind}${active === p.id ? " is-on" : ""}`}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                onMouseEnter={on(p.id)}
                onMouseLeave={off}
              >
                {p.kind === "region" && <circle className="area" r="34" />}
                <circle className="hit" r="22" />
                <circle className="dot" r="8" />
                <text className="label" x="18" y="9">
                  {p.name}
                </text>
              </g>
            );
            return slug ? (
              <a key={p.id} href={`/work/${slug}`} tabIndex={-1} aria-hidden="true">
                {pin}
              </a>
            ) : (
              <g key={p.id} aria-hidden="true">
                {pin}
              </g>
            );
          })}
        </svg>
        <figcaption className="places-key">
          <span className="k-place">A city or site</span>
          <span className="k-region">A region</span>
        </figcaption>
      </figure>

      <div className="places-side">
        <ol className="places-list">
          {places.map((p) => (
            <li key={p.id} className={active === p.id ? "is-on" : undefined} onMouseEnter={on(p.id)} onMouseLeave={off} onFocus={on(p.id)} onBlur={off}>
              <span className="pl-name">{p.name}</span>
              <ul>
                {flightsAt(p).map((f) => (
                  <li key={f.title}>
                    {f.shot ? (
                      <Link href={`/work/${f.shot.slug}`}>{f.title}</Link>
                    ) : (
                      <>
                        {f.title} <small>footage not online</small>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {unplaced.length > 0 && (
          <p className="places-note">
            {WORDS[unplaced.length] ?? unplaced.length} {unplaced.length === 1 ? "flight doesn’t" : "flights don’t"} name a
            place, so {unplaced.length === 1 ? "it isn’t" : "they aren’t"} on the map:{" "}
            {unplaced.map((s, i) => (
              <span key={s.slug}>
                {i > 0 && (i === unplaced.length - 1 ? " and " : ", ")}
                <Link href={`/work/${s.slug}`}>{s.title}</Link>
              </span>
            ))}
            .
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, clipUrl, work, type Shot } from "@/lib/work";
import { wipe } from "@/lib/motion/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FILTERS = ["All", ...CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

function useReducedMotion() {
  // Read it before the first paint: settling a frame later builds the wipes, then reverts them,
  // which shows the very flash of movement the setting asks us not to show.
  const [reduce, setReduce] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

export function WorkGallery() {
  const [filter, setFilter] = useState<Filter>("All");
  const reduce = useReducedMotion();
  const list = useRef<HTMLUListElement>(null);
  const shown = filter === "All" ? work : work.filter((s) => s.category === filter);

  // Rebuilt on every filter change: the cards that carried the old triggers are gone by then.
  useGSAP(
    () => {
      if (reduce) return;
      gsap.utils.toArray<HTMLElement>(".gal-item").forEach((li) => wipe(li, "top 94%", "top 72%"));
      ScrollTrigger.refresh();
    },
    { dependencies: [filter, reduce], scope: list, revertOnUpdate: true },
  );

  return (
    <>
      <div className="gal-filters" role="group" aria-label="Filter work by type">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`gal-filter${f === filter ? " is-on" : ""}`}
            aria-pressed={f === filter}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <p className="gal-count" aria-live="polite">
        {shown.length} {shown.length === 1 ? "flight" : "flights"}
      </p>

      <ul className="gal" ref={list}>
        {shown.map((s) => (
          <Card key={s.title} shot={s} reduce={reduce} />
        ))}
      </ul>
    </>
  );
}

function Card({ shot, reduce }: { shot: Shot; reduce: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // A card with no still has nothing else to show, so it loads the clip's own first frame.
  // The rest stay empty until asked: twelve preloading videos is a burst of range requests
  // before the visitor has touched anything.
  const [armed, setArmed] = useState(!shot.image);

  const play = () => {
    setArmed(true);
    setPlaying(true);
  };
  const stop = () => {
    setPlaying(false);
    const v = video.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  // The element may only have gained its src on this render, so play from the effect.
  useEffect(() => {
    const v = video.current;
    if (!v || !playing) return;
    v.play().catch(() => setPlaying(false));
  }, [playing, armed]);

  // Reduced motion: the clip stays put until it is actually asked for, by the button.
  const canHover = shot.clip && !reduce;

  return (
    <li className="gal-item" onMouseEnter={canHover ? play : undefined} onMouseLeave={canHover ? stop : undefined}>
      <div className={`gal-ph${playing ? " is-playing" : ""}`}>
        {shot.image && <Image src={shot.image} alt={shot.alt} sizes="(min-width: 1024px) 32vw, (min-width: 700px) 48vw, 100vw" placeholder="blur" />}
        {shot.clip && (
          <video
            ref={video}
            src={armed ? `${clipUrl(shot.clip)}${shot.image ? "" : "#t=0.1"}` : undefined}
            preload={shot.image ? "none" : "metadata"}
            muted
            loop
            playsInline
            aria-label={shot.alt}
          />
        )}
        {/* Deliberately click-only: tabbing through the grid must not start twelve clips in turn. */}
        {shot.clip && (
          <button type="button" className="gal-play" onClick={() => (playing ? stop() : play())}>
            <span className="sr">
              {playing ? "Stop" : "Play"} {shot.title}
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              {playing ? <path d="M7 6h3.5v12H7zM13.5 6H17v12h-3.5z" /> : <path d="M8 5.5v13l11-6.5z" />}
            </svg>
          </button>
        )}
      </div>
      <div className="gal-meta">
        <h2>{shot.title}</h2>
        <span className="loc">{shot.location}</span>
      </div>
      <p className="gal-kit">
        {shot.category} · {shot.kit}
      </p>
      {shot.note && <p className="gal-note">{shot.note}</p>}
    </li>
  );
}

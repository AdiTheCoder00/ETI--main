"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clipUrl, type Shot } from "@/lib/work";

/**
 * How long the pointer has to rest on a frame before its clip starts. The desktop reel is pinned and
 * slides sideways under a still cursor, and the browser reports each frame that passes under it as a
 * hover: without this, scrolling past the reel would start (and download) one clip after another.
 */
const INTENT_MS = 220;

/**
 * The pinned reel moves slowly enough that a card can sit under a parked cursor for longer than the
 * intent delay while the page is still scrolling. So nothing starts until scrolling has been quiet for
 * this long: the reel comes to rest, and only the frame the cursor ended up on plays.
 */
const SCROLL_QUIET_MS = 250;
let lastScroll = 0;
let watching = false;
function watchScroll() {
  if (watching) return;
  watching = true;
  window.addEventListener("scroll", () => (lastScroll = performance.now()), { passive: true });
}

/**
 * One frame of the homepage reel. Resting the pointer on it plays the clip over the still, the way the
 * /work cards do. The clip is attached on first real hover, never on load, and fades in only once it is
 * actually playing, so a slow connection shows the still rather than a black frame. Touch and keyboard
 * reach the clip through the title, which goes to the case page; reduced motion never autoplays.
 */
export function ReelShot({ shot, sizes }: { shot: Shot; sizes: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef(0);
  const [wanted, setWanted] = useState(false);
  const [src, setSrc] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const canPreview = Boolean(shot.image && shot.clip);

  const enter = () => {
    if (!canPreview) return;
    if (!window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    watchScroll();
    window.clearTimeout(timer.current);
    const tryStart = () => {
      const quietFor = performance.now() - lastScroll;
      if (quietFor < SCROLL_QUIET_MS) {
        timer.current = window.setTimeout(tryStart, SCROLL_QUIET_MS - quietFor);
        return;
      }
      setSrc((s) => s ?? clipUrl(shot.clip!));
      setWanted(true);
    };
    timer.current = window.setTimeout(tryStart, INTENT_MS);
  };
  const leave = () => {
    window.clearTimeout(timer.current);
    setWanted(false);
    setPlaying(false);
  };

  // Play from an effect: the element may only have gained its src on this render.
  useEffect(() => {
    const v = video.current;
    if (!v || !src) return;
    if (wanted) {
      v.play().catch(() => {
        setWanted(false);
        setPlaying(false);
      });
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [wanted, src]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <figure className={`shot${shot.wide ? " wide" : ""}`} onMouseEnter={enter} onMouseLeave={leave}>
      <div className={`ph${playing ? " is-playing" : ""}`}>
        {shot.image ? (
          <>
            <Image src={shot.image} alt={shot.alt} sizes={sizes} placeholder="blur" quality={90} />
            {shot.clip && (
              <video
                ref={video}
                className="preview"
                src={src}
                preload="none"
                muted
                loop
                playsInline
                aria-hidden="true"
                tabIndex={-1}
                onPlaying={() => wanted && setPlaying(true)}
              />
            )}
          </>
        ) : (
          // No still was ever cut for this one: the clip's own first frame stands in. The label sits
          // behind it and only shows if the clip can't be fetched (no CDN configured yet).
          shot.clip && (
            <>
              <span className="ph-missing" aria-hidden="true">
                Footage unavailable
              </span>
              <video src={`${clipUrl(shot.clip)}#t=0.1`} muted playsInline preload="metadata" aria-label={shot.alt} />
            </>
          )
        )}
      </div>
      <figcaption>
        <div className="shot-meta">
          <h3>
            <Link href={`/work/${shot.slug}`} className="card-link">
              {shot.title}
            </Link>
          </h3>
          <span className="loc">{shot.location}</span>
        </div>
        {shot.note && <p>{shot.note}</p>}
      </figcaption>
    </figure>
  );
}

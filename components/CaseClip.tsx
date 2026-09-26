"use client";

import { useEffect, useRef } from "react";

/**
 * The footage on a case page. It is the page's main content, so it plays by itself, muted, while it
 * is on screen and pauses when scrolled away (no decoding or downloading for nobody). Under reduced
 * motion it stays on the still until the visitor presses play. Controls are always there.
 */
export function CaseClip({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video ref={ref} src={src} poster={poster} muted loop playsInline controls preload="metadata" aria-label={label} />
  );
}

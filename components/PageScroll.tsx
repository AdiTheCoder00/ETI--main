"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { liftLines, wipe } from "@/lib/motion/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * Smooth scroll and the page-level reveals for the pages that have no loader. Without this /work
 * drops to native scroll halfway through a visit, which reads as a different site. Same Lenis
 * settings and same two moves as the homepage; the gallery brings in its own card wipes.
 */
export function PageScroll() {
  useGSAP((_ctx, contextSafe) => {
    const safe = contextSafe!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1.2, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // SplitText measures lines, so it has to wait for the real face or the masks land mid-letter.
    let dead = false;
    const build = safe(() => {
      if (dead) return;
      liftLines("#work-h", ".gal-head");
      wipe(".gal-head p", "top 92%", "top 68%");
      liftLines("#ask-h", ".gal-ask");
      ScrollTrigger.refresh();
    });
    document.fonts.ready.then(build);

    return () => {
      dead = true;
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  });

  return null;
}

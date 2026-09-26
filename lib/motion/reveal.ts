import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

/**
 * The site's two scroll reveals, shared by the homepage and /work so the pages move the same way.
 * Both are scrubbed: scrolling back up puts them back. Initial states are set here rather than in
 * CSS, so no-JS and reduced-motion get the plain page.
 */

/**
 * Ends are clamped to the page's scroll range: a block near the foot of a page can never climb as high
 * as its end marker, and without the clamp it stopped part-way and stayed half revealed.
 */
const clampEnd = (end: string) => `clamp(${end})`;

/** A wipe from the left, driven by the scroll. Never a fade-up. */
export function wipe(el: gsap.TweenTarget, start: string, end: string) {
  return gsap.fromTo(
    el,
    { clipPath: "inset(0 100% 0 0)" },
    { clipPath: "inset(0 0% 0 0)", ease: "none", scrollTrigger: { trigger: el as gsap.DOMTarget, start, end: clampEnd(end), scrub: true } },
  );
}

/** Lines rising out of their own mask, the way the hero title arrives. */
export function liftLines(heading: gsap.DOMTarget, trigger: gsap.DOMTarget) {
  const split = SplitText.create(heading, { type: "lines", linesClass: "line", mask: "lines" });
  gsap.fromTo(
    split.lines,
    { yPercent: 105 },
    { yPercent: 0, ease: "none", stagger: 0.12, scrollTrigger: { trigger, start: "top 85%", end: clampEnd("top 45%"), scrub: true } },
  );
  return split;
}

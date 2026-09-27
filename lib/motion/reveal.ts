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

/**
 * Fully wiped in, an element keeps a clip that bleeds past its box. A plain inset(0) still clips
 * everything drawn outside the border box, and that includes the keyboard focus outline: a wiped
 * link or form field showed no focus ring at all.
 */
const OPEN = "inset(-8px -8px -8px -8px)";

/**
 * Keyboard focus can land in a block that is still part-wiped: the browser scrolls a focused field
 * only just into view, below the point where its wipe runs, so on a phone the next form fields were
 * focused while still hidden. Open the block on focus; the next scroll hands it back to the wipe.
 */
const focusOpens = new WeakSet<HTMLElement>();
function openOnFocus(el: gsap.TweenTarget) {
  for (const t of gsap.utils.toArray<HTMLElement>(el)) {
    if (focusOpens.has(t)) continue;
    focusOpens.add(t);
    t.addEventListener("focusin", () => (t.style.clipPath = OPEN));
  }
}

/** A wipe from the left, driven by the scroll. Never a fade-up. */
export function wipe(el: gsap.TweenTarget, start: string, end: string) {
  openOnFocus(el);
  return gsap.fromTo(
    el,
    { clipPath: "inset(0 100% 0 0)" },
    {
      clipPath: "inset(0 0% 0 0)",
      ease: "none",
      scrollTrigger: { trigger: el as gsap.DOMTarget, start, end: clampEnd(end), scrub: true },
      // runs after each render, so at the very end it swaps in the bleeding clip; scrolling back
      // renders the wipe's own values over it again. `this`, not the returned tween: GSAP renders
      // (and calls this) once while fromTo is still constructing it.
      onUpdate(this: gsap.core.Tween) {
        if (this.progress() === 1) gsap.utils.toArray<HTMLElement>(el).forEach((t) => (t.style.clipPath = OPEN));
      },
    },
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

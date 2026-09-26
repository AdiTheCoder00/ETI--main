"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { FACING_VIEWER, initDrone3D } from "@/lib/motion/drone3d";
import { createDroneSound, type DroneSound } from "@/lib/motion/droneSound";
import { createFlight, step, type DroneView } from "@/lib/motion/flight";
import { liftLines, wipe } from "@/lib/motion/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

type Phase = "loading" | "done" | "static";

function shouldSkipIntro() {
  return new URLSearchParams(window.location.search).get("intro") === "skip";
}

/**
 * The loader (3D drone intro) and the handful of scroll moments: Lenis smooth scroll,
 * hero reveal, pinned horizontal work reel, hero/studio parallax, and the scroll-progress
 * drone. Works on the page's DOM by id, the same way the prototype's main.js did, so the
 * page itself stays a server component.
 */
export function SiteMotion() {
  // Always "loading" on the first render: reading the flag here instead would make the client's
  // markup disagree with the prerendered HTML. useGSAP settles it below, before the first paint.
  const [phase, setPhase] = useState<Phase>("loading");
  const [soundOn, setSoundOn] = useState(true);
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef<DroneSound | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  // Read the return-route flag once. The effect below strips it from the URL, and useGSAP can run
  // again (StrictMode, Fast Refresh): re-reading the URL then took the loader path on a page whose
  // loader was already gone, which left the hero hidden and the scroll locked.
  const skipIntroRef = useRef<boolean | null>(null);

  useEffect(() => {
    // The return-route flag is a one-time instruction. useGSAP has already read it by now, so
    // drop it from the URL and an intentional reload of the homepage plays the intro again.
    const url = new URL(window.location.href);
    if (!url.searchParams.has("intro")) return;
    url.searchParams.delete("intro");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // The rotors are on by default (owner's call). Audio still cannot start before the visitor has
  // interacted with the page, so the context is created with the loader and takes the first gesture.
  const toggleSound = () => {
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current = null;
      setSoundOn(false);
      return;
    }
    soundRef.current = createDroneSound();
    if (soundRef.current) setSoundOn(true);
    else setSoundUnavailable(true);
  };

  useEffect(() => {
    if (phase !== "loading") return;

    // Keep the page reachable even if the WebGL setup or animation clock is unavailable.
    const dismiss = () => {
      if (skipRef.current) skipRef.current();
      else setPhase("static");
    };
    // Count only the time the page is on screen. A tab opened in the background gets no frames,
    // so the intro hasn't moved; firing anyway threw it away before anyone had seen it.
    let left = 12_000;
    let startedAt = 0;
    let timer = 0;
    const run = () => {
      startedAt = performance.now();
      timer = window.setTimeout(dismiss, left);
    };
    const pause = () => {
      if (!timer) return;
      window.clearTimeout(timer);
      timer = 0;
      left -= performance.now() - startedAt;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? pause() : !timer && run());
    if (document.visibilityState !== "hidden") run();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase]);

  useGSAP((_ctx, contextSafe) => {
    const safe = contextSafe!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    const video = document.getElementById("hero-video") as HTMLVideoElement | null;
    skipIntroRef.current ??= shouldSkipIntro();
    const loader = loaderRef.current;
    let disposed = false;
    const cleanups: (() => void)[] = [];
    // Declared up here, not next to setupScroll: the return-from-/work path below leaves the hook
    // early, and a `let` further down would still be in its dead zone when setupScroll ran.
    let mm: gsap.MatchMedia | null = null;
    cleanups.push(() => mm?.revert());

    function playVideo() {
      if (!video || reduce) return;
      video.play()?.catch(() => {
        // Autoplay refused (data saver, low power mode): start on the first touch rather than
        // leaving a still frame for the whole visit.
        if (disposed) return;
        const events = ["pointerdown", "keydown", "touchstart"] as const;
        const off = () => events.forEach((e) => window.removeEventListener(e, retry));
        const retry = () => {
          off();
          video.play()?.catch(() => {});
        };
        events.forEach((e) => window.addEventListener(e, retry, { passive: true }));
        cleanups.push(off);
      });
    }

    // The intro is a first-visit moment, not a transition tax when returning from /work. Read
    // before the browser paints, so the loader never flashes on the way back.
    // No loader in the DOM (already committed away) means there is nothing to play.
    const skipLoader = phase !== "loading" || skipIntroRef.current || !loader || !document.getElementById("ld3d");

    // Reduced motion: plain page, no loader, no smooth scroll.
    if (reduce) {
      setPhase("static");
      playVideo();
      return;
    }

    if (!skipLoader) {
      html.classList.add("is-loading");
      cleanups.push(() => html.classList.remove("is-loading", "has-3d"));

      // Rotors up with the loader. The browser holds a context that has never seen a gesture, so on
      // a first visit this stays silent until the visitor touches the page; it is armed either way.
      soundRef.current = createDroneSound();
      if (!soundRef.current) {
        setSoundOn(false);
        setSoundUnavailable(true);
      }
    }

    /* ---------- smooth scroll ---------- */
    // lerp keeps the glide; the multiplier covers more ground per notch so it isn't a slow drift
    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1.2, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const lenisRaf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(lenisRaf);
    lenis.stop();
    cleanups.push(() => {
      gsap.ticker.remove(lenisRaf);
      lenis.destroy();
    });

    const navHeight = () => document.getElementById("nav")?.offsetHeight ?? 72;
    const onAnchor = (e: MouseEvent) => {
      const a = e.currentTarget as HTMLAnchorElement;
      const id = a.getAttribute("href")!;
      const el = id === "#top" ? 0 : document.querySelector<HTMLElement>(id);
      if (el === null) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === "#top" ? 0 : -navHeight(), duration: 0.95 });
      if (el !== 0) {
        el.setAttribute("tabindex", "-1");
        const t = setTimeout(() => el.focus({ preventScroll: true }), 1000);
        cleanups.push(() => clearTimeout(t));
      }
    };
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    anchors.forEach((a) => a.addEventListener("click", onAnchor));
    cleanups.push(() => anchors.forEach((a) => a.removeEventListener("click", onAnchor)));

    // Coming back from /work: skip the loader, keep the page. Returning out of the hook here
    // instead would hand back a homepage on native scroll with nothing revealed.
    // The hero is left alone rather than prepared and replayed, so it is simply already there.
    if (skipLoader || !loader) {
      setPhase("done");
      playVideo();
      gsap.ticker.lagSmoothing(0);
      lenis.start();
      requestAnimationFrame(safe(() => !disposed && setupScroll()));
      return () => {
        disposed = true;
        cleanups.reverse().forEach((fn) => fn());
      };
    }

    /* ---------- hero pre-state (hidden until the loader leaves) ---------- */
    let split: SplitText | null = null;
    let revealed = false;
    const heroFades = gsap.utils.toArray<HTMLElement>("[data-hero-fade]");
    const prepHero = safe(() => {
      if (revealed || disposed) return;
      split = SplitText.create("#hero-title", { type: "lines", linesClass: "line", mask: "lines" });
      gsap.set(split.lines, { yPercent: 105 });
      gsap.set(heroFades, { autoAlpha: 0, y: 16 });
      gsap.set("#hero-cover", { display: "block", scaleY: 1 });
    });
    const revealHero = safe(() => {
      revealed = true;
      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .to("#hero-cover", { scaleY: 0, duration: 1.1, ease: "power3.inOut" }, 0)
        .to(split!.lines, { yPercent: 0, duration: 1, stagger: 0.08 }, 0.15)
        .to(heroFades, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.45)
        // done with the cover: drop it so its will-change layer isn't kept over the video all visit
        .set("#hero-cover", { display: "none" }, 1.1);
    });
    document.fonts.ready.then(prepHero);

    /* ---------- LOADER ---------- */
    // how big the lens looks when the drone parks in front of the viewer
    const parkedLensR = () => Math.min(window.innerWidth, window.innerHeight) * 0.2;
    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    const { tgt, sim } = createFlight(vw(), vh());
    let launched = false;
    let introRunning = false;
    let introDone = false;
    const exitScale = 1;
    let exited = false;
    let wiped = false;
    let finished = false;

    const stage = document.getElementById("ld3d")!;
    let view: DroneView | null = initDrone3D(stage, sim, tgt);
    const is3D = view !== null;
    if (is3D) html.classList.add("has-3d");
    else view = initSvgDrone(sim, tgt);
    cleanups.push(() => view?.dispose());

    const pctEl = document.getElementById("ld-pct")!;
    const bar = document.getElementById("ld-bar")!;
    const progress = { v: 0 };
    const drawPct = () => {
      const n = Math.round(progress.v);
      pctEl.textContent = String(n);
      bar.style.transform = `scaleX(${n / 100})`;
    };

    const ready = Promise.all([
      new Promise<void>((res) => {
        if (document.readyState === "complete") res();
        else window.addEventListener("load", () => res(), { once: true });
      }),
      document.fonts.ready,
      new Promise<void>((res) => {
        if (!video || video.readyState >= 2) return res();
        video.addEventListener("loadeddata", () => res(), { once: true });
        setTimeout(res, 3500);
      }),
    ]).then(() => new Promise<void>((res) => setTimeout(res, 650)));

    // The flight plan: GSAP only moves the target; the drone does the flying.
    // Enter from the left, settle, then turn to look into the viewer's eyes.
    const intro = gsap.timeline({ paused: true });
    intro
      .to(tgt, { x: 0, duration: 1.7, ease: "power2.out" }, 0)
      .to(tgt, { y: 0, duration: 1.7, ease: "sine.inOut" }, 0)
      .to(tgt, { sh: 1, duration: 1.4, ease: "sine.out" }, 0.1)
      .to(tgt, { yaw: is3D ? FACING_VIEWER.yaw : -60, duration: 1.4, ease: "sine.inOut" }, 1.5)
      .to(tgt, { gimbal: FACING_VIEWER.gimbal, duration: 1, ease: "sine.inOut" }, 1.8)
      .to(progress, { v: 86, duration: 2.4, ease: "power1.inOut", onUpdate: drawPct }, 0);

    const exit = gsap.timeline({ paused: true });
    exit.to(progress, { v: 100, duration: 0.4, ease: "power1.out", onUpdate: drawPct }, 0);
    if (is3D) {
      // 3D: fly straight at the viewer and park with the lens filling a good part of the
      // screen. The spring leans the drone forward as it speeds up and back as it brakes.
      let park = { y: 0, z: 0 };
      exit
        .add(() => (park = view!.approach!(parkedLensR())), 0)
        .to(tgt, { drift: 0, duration: 0.8, ease: "sine.inOut" }, 0)
        .to(tgt, { k: 60, duration: 0.9, ease: "sine.in" }, 0.2)
        .to(tgt, { x: 0, y: () => park.y, z: () => park.z, duration: 1.9, ease: "power3.inOut" }, 0.3)
        .to(tgt, { track: 1, duration: 1.9, ease: "sine.inOut" }, 0.3)
        .to(tgt, { sh: 0, duration: 0.9, ease: "power1.in" }, 0.3);
    } else {
      // flat fallback: the original exit, up and out to the top right
      exit
        .to(tgt, { yaw: 6, duration: 0.7, ease: "sine.inOut" }, 0)
        // stiffen the chase so it punches out instead of drifting
        .to(tgt, { k: 60, duration: 0.9, ease: "sine.in" }, 0.35)
        .to(tgt, { x: () => vw() * 1.4, y: () => -vh() * 0.95, duration: 1.5, ease: "power2.in" }, 0.4)
        .to(tgt, { sh: 0, duration: 0.9, ease: "power1.in" }, 0.5);
    }

    const showHero = safe((delay: number) => {
      gsap.delayedCall(delay, () => {
        if (split) revealHero();
        else revealed = true;
      });
    });

    const settleHero = safe(() => {
      revealed = true;
      if (!split) return;
      gsap.set("#hero-cover", { scaleY: 0, display: "none" });
      gsap.set(split.lines, { yPercent: 0 });
      gsap.set(heroFades, { autoAlpha: 1, y: 0 });
    });

    // flat fallback: lift the curtain the moment the drone has actually left the frame
    const droneGone = () => sim.x > vw() * 0.36 || sim.y < -vh() * 0.36;
    const clearLoader = safe(() => {
      if (wiped) return;
      wiped = true;
      gsap.to(loader, { yPercent: -100, duration: 1, ease: "power3.inOut", onComplete: finish });
      showHero(0.25);
    });

    // 3D: the site opens out of the gimbal lens. The loader gets a circular hole that starts
    // as the lens glass (so the page shows inside the lens) and grows until it covers the screen.
    const iris = { on: false, p: 0 };
    const irisTween = gsap.to(iris, { p: 1, duration: 0.95, ease: "power2.in", paused: true });
    let stageTop = 0;
    let stageLeft = 0;
    let loaderW = 0;
    let loaderH = 0;
    const openIris = () => {
      if (iris.on) return;
      iris.on = true;
      wiped = true;
      const lr = loader.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      stageTop = sr.top - lr.top;
      stageLeft = sr.left - lr.left;
      // measured once: reading them per frame, right after writing the mask vars, forced a layout each frame
      loaderW = loader.clientWidth;
      loaderH = loader.clientHeight;
      loader.classList.add("iris");
      // straight away, so the first thing seen through the lens is footage, not the cover
      showHero(0);
    };
    const drawIris = (l: { x: number; y: number; r: number }) => {
      const x = l.x + stageLeft;
      const y = l.y + stageTop;
      const w = loaderW;
      const h = loaderH;
      const full = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
      // Start within the black glass, leaving the orange gimbal ring visible at the first frame.
      const lensInteriorR = l.r * 0.72;
      const r = lensInteriorR + (full - lensInteriorR) * iris.p;
      loader.style.setProperty("--ix", `${x}px`);
      loader.style.setProperty("--iy", `${y}px`);
      loader.style.setProperty("--ir", `${r}px`);
      return iris.p >= 1;
    };

    const finish = safe((skipped = false) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      view?.dispose();
      view = null;
      html.classList.remove("is-loading");
      setPhase(skipped ? "static" : "done");
      // Skipped (or the safety timeout): put the hero straight in. A delayed reveal would wait on the
      // animation clock, which is exactly what may not be running when the timeout fires.
      if (skipped) settleHero();
      soundRef.current?.stop();
      soundRef.current = null;
      setSoundOn(false);
      playVideo();
      gsap.ticker.lagSmoothing(0);
      lenis.start();
      // Wait a frame so React has committed setPhase (the loader is gone) before anything is measured.
      // safe() keeps the ScrollTriggers built in here inside the GSAP context: created from a bare
      // rAF they outlive the component and go on firing against the next page's DOM.
      requestAnimationFrame(safe(() => !disposed && setupScroll()));
    });
    skipRef.current = () => finish(true);

    // our own frame loop: fixed-rate physics, never skips ahead in big jumps
    let last = performance.now();
    let rafId = 0;
    function frame() {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // timelines are advanced here, on the same clock as the physics, so they can never drift apart
      if (introRunning && !introDone) {
        intro.time(Math.min(intro.duration(), intro.time() + dt));
        if (intro.time() >= intro.duration()) {
          introDone = true;
          ready.then(() => setTimeout(() => !disposed && (exited = true), 300));
        }
      }
      if (exited && exit.time() < exit.duration()) {
        exit.time(Math.min(exit.duration(), exit.time() + dt * exitScale));
        if (exit.time() >= exit.duration()) (is3D ? openIris : clearLoader)();
      }
      if (launched) step(sim, tgt, dt);
      if (exited && !wiped && !is3D && droneGone()) clearLoader();
      view?.render(dt);
      // the rotors ride the same state as the flight: throttle from the shadow, brightness from how near it is
      // one lens projection per frame, shared by the sound, the iris trigger and the iris itself
      const lens = is3D && view?.lens ? view.lens() : null;
      const parkedR = parkedLensR();
      soundRef.current?.set(tgt.sh, lens ? Math.min(1, lens.r / parkedR) : 0);
      if (lens && exited) {
        // open as the drone arrives, once the lens is nearly full size
        if (!iris.on && lens.r >= parkedR * 0.92) openIris();
        if (iris.on) {
          irisTween.time(Math.min(irisTween.duration(), irisTween.time() + dt * exitScale));
          if (drawIris(lens)) return finish();
        }
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    // start once the first 3D frame is on screen, so the entry never stutters
    const r2 = requestAnimationFrame(() => {
      const r3 = requestAnimationFrame(() => {
        last = performance.now();
        launched = true;
        introRunning = true;
      });
      cleanups.push(() => cancelAnimationFrame(r3));
    });
    cleanups.push(() => cancelAnimationFrame(r2), () => cancelAnimationFrame(rafId));

    cleanups.push(() => {
      skipRef.current = null;
    });

    /* ---------- SCROLL (set up after the loader, so it can't compete for frames) ---------- */
    function setupScroll() {
      // The page reads as one descent: every section is uncovered by a wipe the scroll itself
      // drives, in the same language as the loader's iris and the hero cover. No fade-ups.
      // hero footage drifts and eases out of its crop as you scroll away
      gsap.fromTo(
        "#hero-video",
        { scale: 1.12 },
        { scale: 1, yPercent: 6, ease: "none", scrollTrigger: { trigger: "#hero-frame", start: "top top+=80", end: "bottom top", scrub: true } },
      );

      // the opening drops away a little slower than the page, so you climb out of it
      gsap.to([".hero-head", ".hero-text"], {
        yPercent: -7,
        ease: "none",
        scrollTrigger: { trigger: "#top", start: "top top", end: "bottom top", scrub: true },
      });

      // credentials: one line flown left to right across the strip
      wipe(".strip", "top 92%", "top 64%");

      // work: pinned horizontal reel on desktop, plain grid everywhere else
      mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const sec = document.getElementById("work")!;
        const track = document.getElementById("reel-track")!;
        sec.classList.add("is-pinned");
        const navH = () => document.getElementById("nav")?.offsetHeight ?? 72;
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tw = gsap.to(track, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: {
            trigger: sec, start: () => `top ${navH()}`, end: () => `+=${dist()}`,
            // a pin needs real scrub smoothing: tighten this and the reel fights the smooth scroll
            pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
          },
        });
        gsap.to("#reel-bar", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: sec, start: () => `top ${navH()}`, end: () => `+=${dist()}`, scrub: true, invalidateOnRefresh: true },
        });
        // each frame counter-drifts slightly inside its crop, like a slow pan; the hover preview drifts
        // with its still, or it would jump sideways the moment it fades in
        gsap.utils.toArray<HTMLElement>("#reel-track .ph > img, #reel-track .ph > video.preview").forEach((img) => {
          gsap.fromTo(
            img,
            { xPercent: -4, scale: 1.1 },
            { xPercent: 4, ease: "none", scrollTrigger: { trigger: img.parentElement, containerAnimation: tw, start: "left right", end: "right left", scrub: true } },
          );
        });
        // Keyboard: the browser can't scroll a focused card into view here, because the reel only moves
        // when the page scrolls vertically. Tabbing left focus on cards off the side of the screen. So
        // scroll the page to the point where the focused card sits at the reel's left margin.
        const onFocus = (e: FocusEvent) => {
          const card = (e.target as HTMLElement).closest<HTMLElement>(".shot, .reel-end");
          const st = tw.scrollTrigger;
          if (!card || !st) return;
          const d = dist();
          const margin = parseFloat(getComputedStyle(track).paddingLeft) || 0;
          // both rects carry the same translate, so the difference is the card's place on the track
          const cardX = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
          const x = Math.min(0, Math.max(-d, margin - cardX));
          const progress = d ? -x / d : 0;
          lenis.scrollTo(st.start + progress * (st.end - st.start), { duration: 0.6 });
        };
        track.addEventListener("focusin", onFocus);
        return () => {
          track.removeEventListener("focusin", onFocus);
          sec.classList.remove("is-pinned");
          gsap.set(track, { clearProps: "x" });
        };
      });

      // services: each job is written in, rule and all, as it reaches the reading line
      liftLines("#svc-h", "#services");
      gsap.utils.toArray<HTMLElement>("#services .rows li").forEach((li) => {
        wipe(li, "top 88%", "top 64%");
      });

      // studio: the photo is uncovered as the section arrives, then drifts inside its crop
      gsap.fromTo(
        "#studio-cover",
        { display: "block", scaleY: 1 },
        { scaleY: 0, ease: "none", scrollTrigger: { trigger: "#studio", start: "top 90%", end: "top 40%", scrub: true } },
      );
      gsap.fromTo(
        "#studio-img",
        { yPercent: -8 },
        { yPercent: 8, ease: "none", scrollTrigger: { trigger: "#studio", start: "top bottom", end: "bottom top", scrub: true } },
      );
      liftLines("#studio-h", "#studio");
      wipe(".kit", "top 92%", "top 70%");

      // contact: the ask rises, then the details are written in under it
      liftLines("#contact-h", "#contact");
      wipe(".details", "top 88%", "top 64%");

      ScrollTrigger.refresh();
    }

    return () => {
      disposed = true;
      soundRef.current?.stop();
      soundRef.current = null;
      cleanups.reverse().forEach((fn) => fn());
    };
  });

  return (
    <>
      {phase === "loading" && (
        <div id="loader" ref={loaderRef} role="status" aria-label="Loading ETI Drone Visuals">
          <a
            id="ld-skip"
            href="#skip-intro"
            onClick={() => {
              if (skipRef.current) skipRef.current();
              else setPhase("static");
            }}
          >
            Skip intro
          </a>
          <button id="ld-sound" type="button" aria-pressed={soundOn} onClick={toggleSound}>
            {soundUnavailable ? "Sound unavailable" : soundOn ? "Sound on" : "Sound off"}
          </button>
          <div className="ld-stage">
            <div className="ld-lens" aria-hidden="true" />
            <div className="ld-shadow" id="ld-shadow" />
            <div className="ld3d" id="ld3d" />
            <FallbackDrone />
          </div>
          <div className="ld-foot">
            <span>
              <b>ETI</b>Drone Visuals
            </span>
            <span id="ld-pct" aria-hidden="true">
              0
            </span>
          </div>
          <div className="ld-bar">
            <i id="ld-bar" />
          </div>
          <span id="skip-intro" aria-hidden="true" />
        </div>
      )}
    </>
  );
}

/* ===== flat SVG fallback (no WebGL) ===== */
function initSvgDrone(sim: ReturnType<typeof createFlight>["sim"], tgt: ReturnType<typeof createFlight>["tgt"]): DroneView {
  const drone = document.getElementById("drone")!;
  const shadow = document.getElementById("ld-shadow")!;
  drone.style.visibility = "visible";
  const spins: gsap.core.Tween[] = [];
  drone.querySelectorAll(".rotor").forEach((r, i) => {
    spins.push(gsap.fromTo(r.querySelector(".rotor-blade"), { scaleX: 1 }, { scaleX: -1, duration: 0.045 + i * 0.006, ease: "sine.inOut", repeat: -1, yoyo: true }));
    spins.push(gsap.to(r.querySelector(".rotor-disc"), { opacity: 0.3, duration: 0.07, repeat: -1, yoyo: true, ease: "none" }));
  });
  spins.push(gsap.to("#drone-led", { opacity: 0.15, duration: 0.5, repeat: -1, yoyo: true, ease: "steps(1)" }));
  const dSet = gsap.quickSetter(drone, "css");
  const sSet = gsap.quickSetter(shadow, "css");
  return {
    render() {
      dSet({ x: sim.x, y: sim.y, rotation: sim.pitch });
      sSet({ x: sim.x * 0.9, scale: 0.4 + 0.6 * tgt.sh, opacity: 0.12 * tgt.sh });
    },
    dispose() {
      spins.forEach((s) => s.kill());
    },
  };
}

function FallbackDrone() {
  return (
    <svg id="drone" viewBox="0 0 260 120" fill="none" aria-hidden="true">
      {/* rear rotors (lighter, set back) */}
      <g opacity=".35">
        <line x1="96" y1="46" x2="58" y2="30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <line x1="164" y1="46" x2="202" y2="30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <rect x="51" y="21" width="14" height="10" rx="2" fill="currentColor" />
        <rect x="195" y="21" width="14" height="10" rx="2" fill="currentColor" />
        <g className="rotor">
          <ellipse cx="58" cy="18" rx="34" ry="4" fill="currentColor" opacity=".18" className="rotor-disc" />
          <rect className="rotor-blade" x="26" y="16.2" width="64" height="3.6" rx="1.8" fill="currentColor" />
        </g>
        <g className="rotor">
          <ellipse cx="202" cy="18" rx="34" ry="4" fill="currentColor" opacity=".18" className="rotor-disc" />
          <rect className="rotor-blade" x="170" y="16.2" width="64" height="3.6" rx="1.8" fill="currentColor" />
        </g>
      </g>
      {/* front arms */}
      <path d="M100 54 L34 38" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M160 54 L226 38" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      {/* motors */}
      <rect x="25" y="27" width="18" height="14" rx="3" fill="currentColor" />
      <rect x="217" y="27" width="18" height="14" rx="3" fill="currentColor" />
      <rect x="31" y="22" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="223" y="22" width="6" height="6" rx="1" fill="currentColor" />
      {/* front rotors */}
      <g className="rotor">
        <ellipse cx="34" cy="21" rx="38" ry="4.5" fill="currentColor" opacity=".16" className="rotor-disc" />
        <rect className="rotor-blade" x="-2" y="19" width="72" height="4" rx="2" fill="currentColor" />
      </g>
      <g className="rotor">
        <ellipse cx="226" cy="21" rx="38" ry="4.5" fill="currentColor" opacity=".16" className="rotor-disc" />
        <rect className="rotor-blade" x="190" y="19" width="72" height="4" rx="2" fill="currentColor" />
      </g>
      {/* body */}
      <path d="M92 44 Q96 36 110 36 L150 36 Q164 36 168 44 L172 60 Q173 68 164 68 L96 68 Q87 68 88 60 Z" fill="currentColor" />
      <rect x="112" y="30" width="36" height="8" rx="3" fill="currentColor" />
      {/* status light */}
      <circle id="drone-led" cx="163" cy="52" r="3.2" fill="var(--accent)" />
      {/* landing legs */}
      <path d="M104 68 L94 98 M156 68 L166 98" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M82 99 L108 99 M152 99 L178 99" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      {/* gimbal + camera */}
      <rect x="126" y="68" width="8" height="8" fill="currentColor" />
      <rect x="113" y="75" width="34" height="22" rx="5" fill="currentColor" />
      <circle cx="140" cy="86" r="7" fill="var(--paper)" />
      <circle cx="140" cy="86" r="4" fill="currentColor" />
    </svg>
  );
}

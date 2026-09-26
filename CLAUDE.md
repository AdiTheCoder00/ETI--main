@AGENTS.md

# ETI Drone Visuals: project context

Read this before changing anything.

## What this is
Marketing site for ETI Drone Visuals, a DGCA-certified drone studio in BKC, Mumbai. Two client types:
productions (aerial cinematography, FPV, real estate, live feeds) and industry (structural inspection,
survey and mapping, plant monitoring, construction progress).
Old site: https://yetiacro.flyercoal.in (Vite + React + three.js). The goal of the redesign was to stop it looking AI-generated.

## Current state
Next.js 16 (App Router, TypeScript) port of the static prototype that was designed in a claude.ai chat, plus the
enquiry backend and lead inbox. Stack: Next.js + Supabase (Postgres, and Auth for the admin) + Resend (email).

Site
- **The homepage is statically prerendered, and must stay that way.** It takes no `searchParams`:
  reading them opts the whole page out of static rendering for one optional flag. The `?intro=skip`
  return route from `/work` is read on the client in `SiteMotion` (before the first paint, so the
  loader never flashes) and then stripped from the URL. For the same reason `phase` starts as
  `"loading"` on every render — deciding it from the URL in the initialiser would make the client
  disagree with the prerendered HTML. Skipping the intro skips **only the loader**: Lenis, the
  reveals are still set up, or coming back from `/work` would hand over a dead page.
- `app/page.tsx`: the one-page site, a server component. Copy and markup are unchanged from the prototype.
- `components/SiteMotion.tsx`: everything the prototype's `main.js` did (loader, Lenis, GSAP scroll moments),
  in one `useGSAP` hook that works on the page DOM by id. `components/Nav.tsx` (menu) and
  `components/ContactForm.tsx` are the other client components.
- `lib/motion/flight.ts` (spring physics) and `lib/motion/drone3d.ts` (three.js drone).
- `lib/motion/reveal.ts` holds the two scroll reveals (`wipe`, `liftLines`) so the homepage and `/work` move
  the same way. `components/PageScroll.tsx` gives the loader-less pages the same Lenis settings and reveals;
  without it `/work` dropped to native scroll and read as a different site.
- **three is pinned to 0.149.0** on purpose: later versions changed light units and removed PCFSoftShadowMap,
  which changes the loader's look. Only upgrade while comparing frames against the current render.
- Stills live in `assets/work/` and go through `next/image`; `lib/work.ts` is the single source for all 12
  flights and both places they appear. The hero clip is `public/media/hero.mp4` (5.8 MB, 1280×720 at 60 fps, re-encoded Sept 2026 from the old site's 720p source; the earlier 1100×618 copy looked soft); set
  `NEXT_PUBLIC_HERO_VIDEO_URL` to move it to a CDN. Don't commit more large video: host it (Mux, Cloudflare
  Stream, Vercel Blob) and link it.
- **The clips (Sept 2026).** The 12 clips that still existed on the old site were pulled into
  `public/media/clips/`, which is **gitignored** — they work locally and must go on a CDN for production via
  `NEXT_PUBLIC_CLIPS_BASE_URL` (see `clipUrl()` in `lib/work.ts`). Four of the old site's clips
  (bridge-arch, bridge-sunset, crane-sunset, construction-site) were already 404 on its own server and are gone.
  Every flight now has a still. The stills were re-cut in Sept 2026 at the clips' native 1280×720 from the
  same frames as before (the old 1400px ones had been enlarged from 720p, which is why they looked soft);
  the sharpest frame within ±3 of each was taken. The clips on the old server are all 720p, so anything
  sharper needs the owner's originals. A shot with no still still falls back to the clip's first frame via
  `#t=0.1`, with a "Footage unavailable" label behind it for when the clip can't be fetched.
  The old site's copy ("Locomotive Rail Yard Yard-Master", "4K Volumetric") was rewritten into house style on
  the way in — don't carry that voice back.
- `/work` (`app/work/page.tsx` + `components/WorkGallery.tsx`): the full gallery, filtered by the four
  categories that actually have flights. Hover plays the clip and a button covers touch and keyboard. The
  clips are **attached on first ask, not on load**: twelve `preload="metadata"` videos fired ~76 range
  requests before the visitor touched anything, so only the two cards with no still carry a `src` up front
  (their own first frame, via `#t=0.1`) and the rest are `preload="none"` until hovered or pressed. The play
  button is click-only on purpose — on `focus` it started every clip in turn while tabbing. Under
  reduced motion hover does nothing and only the button plays. The homepage reel shows every flight too and
  links here; it is no longer a teaser, so there is no "ask for the full reel" CTA.
- **Reel hover previews** (`components/ReelShot.tsx`, Sept 2026): resting the pointer on a reel frame plays
  its clip over the still. Attached on first hover, never on load; starts only after a short intent delay
  *and* once scrolling has been quiet for 250 ms, because the pinned reel slides under a parked cursor and
  would otherwise start (and download) clip after clip. Fades in on `playing`, not on hover, so a slow
  connection shows the still, not black. The preview video gets the same parallax as its still. Hover
  devices only, never under reduced motion; touch and keyboard reach the clip via the case page.
- **Case pages** (`app/work/[slug]/page.tsx`, Sept 2026): one static page per flight, slugs from `lib/work.ts`
  (keep them stable once live: they are what gets indexed). Clip (`components/CaseClip.tsx`: plays muted
  while on screen, pauses off screen, never autoplays under reduced motion), location, type of work, kit,
  and note. There is no results section: the old site had none to carry over, so it was removed.
  Title, description, canonical and share image come from the same fields. Unknown slugs 404
  (`dynamicParams = false`). Every title on `/work` and the homepage reel links to its page (the whole card
  is the link; the play button sits above it). `app/sitemap.ts` and `app/robots.ts` use `NEXT_PUBLIC_SITE_URL`.
- **Map of flown places** on `/work` (`components/PlacesMap.tsx`, data in `lib/places.ts`, Sept 2026): the old
  site's 16 projects, placed only as precisely as it named them. Cities and sites are dots; Gujarat, Madhya
  Pradesh, Narmada Valley and the Western Ghats are areas, not dots at a spot nobody named; the three flights
  that name no place are listed under the map instead. The outline is `lib/map/india.ts`, generated by
  `scripts/india-outline.mjs` from Natural Earth's **India point-of-view** file, which draws India's official
  boundary (all of J&K and Ladakh), as a map published in India must. Never replace it with a default world
  map. The list is the accessible interface; map markers are mouse-only mirrors. `tests/places.test.ts` keeps
  the data in step with `lib/work.ts`.
- `components/PageScroll.tsx` reveals by attribute on loader-less pages: `data-lift` on a heading, `data-wipe`
  on a block. Reveal ends are `clamp()`ed to the scroll range (`lib/motion/reveal.ts`): without that, a
  heading near the foot of a page never reached its end marker and stayed half risen.
- **The mark** (Sept 2026, approved by the owner): a viewfinder, four frame corners around a lens ring, with
  the record dot in accent. `components/Mark.tsx` (takes the text colour) sits before the ETI wordmark in the
  nav and admin. Icons in `app/`: `icon.svg` (tab), `favicon.ico` (its 16px entry is redrawn on the pixel
  grid, the full mark mushes at that size), `apple-icon.png`; the default share image is
  `app/opengraph-image.jpg` (case pages use their own still). Sources for the board and the share image are
  in `brand/` (`brand-kit.html`, `og.html`), rendered with headless Edge.
- **Hardening and accessibility (Sept 2026 audit).** `next.config.ts` sends nosniff, Referrer-Policy,
  X-Frame-Options DENY, Permissions-Policy and HSTS on every response, and no X-Powered-By; there is no CSP
  yet (the loader, GSAP and Next's inline scripts need nonces first). A skip link in the root layout targets
  `id="main"`, so every page's `<main>` must carry that id. On the desktop reel, keyboard focus scrolls the
  page to the focused card (the browser can't: the reel only moves with vertical scroll). The contact action
  resolves the lead store lazily inside `handleEnquiry`'s error handling, so a store failure shows the form's
  error message instead of crashing the page; `/admin` has an error page for a missing Supabase config. Open
  Graph: a page that sets `openGraph` replaces the parent's object and loses the file-based share image, so
  spread `baseOpenGraph` from `lib/site.ts` and pass `defaultShareImage` when it has no still of its own.
- Fonts come from `next/font/google` (Archivo with the `wdth` axis, Source Serif 4 with `opsz`), self-hosted.

Enquiry backend (`lib/leads/`, `app/actions.ts`)
- The form posts to the `submitEnquiry` server action (works without JS too). `handleEnquiry` validates (zod),
  drops honeypot hits silently, runs Turnstile if configured, rate-limits to 5 per hashed IP per hour, saves the
  lead, then sends two emails via `after()`: a notification to the studio (Reply-To is the client) and an
  auto-reply to the client. The auto-reply contains nothing the visitor typed, so the form can't be used to
  send arbitrary text to other people's inboxes. Keep it that way.
- Storage: `supabase/migrations/*_leads.sql`. RLS is on with no policies; the server uses the service-role key
  only after checking the admin. Raw IPs are never stored.
- Lead inbox: `/admin` lists leads with a status (new, quoted, won, lost) and filters by status. Login is
  Supabase email + password, limited to `ADMIN_EMAILS`. `proxy.ts` refreshes the session; every admin page and
  server action checks again through `lib/auth.ts`.
- Local mode: with no Supabase env vars and `NODE_ENV !== "production"`, leads go to `.data/leads.json`, `/admin`
  has no login and emails print to the console. In production, missing Supabase config throws.

Checks: `npm run lint`, `npm run typecheck`, `npm test` (vitest, `tests/`), `npm run build`.

## Design rules (keep these)
- Palette: paper #F1EEE7, ink #16150F, muted #5E5A50, rule #D6D1C4, accent #C2410C (hi-vis orange).
- Type: Archivo (condensed ~72% width, 800 weight, uppercase) for headlines; Source Serif 4 for body;
  Poppins Medium (500, `--stand`) for the standfirst under a heading — the hero lede, and the intro
  paragraph in services, studio, contact and `/work`. Poppins is not a variable font: Medium is the only
  cut loaded, so don't reach for other weights of it.
- Real footage first. Plain, specific copy in sentence case. No invented stats. Unknown facts stay as [BRACKETS].
- Avoid: neon or gradient glows, glassmorphism, HUD/mono "system" labels, fake boot sequences, "01/02/03"
  numbering on non-sequences, fade-up-on-every-section animations, round-number stat counters.
- The page is scroll-driven (Sept 2026, owner's call): every section is uncovered by the scroll itself, so
  the whole page reads as one descent. The vocabulary is fixed — left-to-right clip wipes (strip, service
  rows, kit, contact details), lines rising out of their own mask (section headings, via SplitText),
  parallax inside a crop (hero video, studio photo), and the pinned horizontal reel. (The side altimeter
  drone was removed at the owner's request, Sept 2026; don't bring it back.) Reveals are scrubbed, never triggered-and-played,
  so scrolling back up puts them back. Initial hidden states are set from JS only, never in CSS, so
  no-JS and reduced-motion get the plain page. Reuse those moves rather than inventing new ones;
  fade-up-on-scroll stays banned. The admin has none.
- The loader: GSAP animates an invisible target; the drone chases it with a damped spring (x, y and depth z)
  and leans from its own acceleration. Timelines are advanced manually inside the same rAF loop as the physics.
  Sequence (Sept 2026, owner's idea): the drone flies in from the left, turns to face the viewer (yaw -90, gimbal
  tilted up at the camera), flies at the camera and parks with the lens ~20% of the screen, then the site opens
  out of the gimbal lens: a circular mask hole on the loader that starts as the lens glass and grows to cover the
  screen. The view camera eases its aim onto the lens during the fly-in so the lens stays centred. Without WebGL,
  the SVG fallback keeps the older fly-off and curtain wipe. ScrollTrigger is set up only after the loader
  finishes — one frame after `setPhase("done")`, so React has committed (the loader is gone) before anything
  is measured.
- The loader's rotors are synthesised in `lib/motion/droneSound.ts` (Web Audio: detuned saws for the motors,
  band-passed noise for the wash, a tremolo for the blade chop), driven from the same frame loop as the flight.
  It is **on by default** (owner's call, Sept 2026) behind a "Sound off/on" toggle, and stops with the loader.
  On by default is as far as a browser allows: a context that has never seen a gesture starts suspended, so
  `createDroneSound` calls `resume()` and also takes the first `pointerdown`/`keydown`/`touchstart`. On a true
  first visit the intro is therefore silent until the visitor touches the page — that is the autoplay policy,
  not a bug, and no amount of code changes it. No audio file ships; don't reuse the old site's music track.

## Facts not on the site (Sept 2026)
The placeholders were settled against the old site's copy: anything it stated was kept, anything it didn't was
taken out rather than left in [BRACKETS]. It gives no founding year, founder name, crew size or project results,
so the site states none: "since 2021" came out of the hero (unsourced, and the old site's "8+ Yrs Flight
Experience" contradicts it), and the case pages have no results section. The old site's phone numbers
(98200 12345 etc.) looked fake and stay out, so the contact block no longer offers "call, or WhatsApp". Its stats
row ("500+ Operations Completed", "8+ Yrs Flight Experience", "100% Safety Record") is the round-number counter the
design rules ban. Add any of these back only with a real figure from the owner.

## Next: planned work
1. ~~Enquiry backend and lead inbox~~ (done).
2. ~~Case study pages~~ (done).
3. **Quote estimator.** Service + city + days gives a rough price range and creates a lead (reuse
   `handleEnquiry`/the lead store with `source: "quote_estimator"`). Pricing comes from the owner; never invent numbers.
4. ~~Map of flown locations~~ (done, on `/work`).
5. **Small wins.** WhatsApp chat button (needs a real number), client logos (with permission). Reel hover
   previews are done.

The owner hasn't picked an order for 2 to 5, so ask before starting.

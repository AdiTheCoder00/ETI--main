import Image from "next/image";
import Link from "next/link";
import { preload } from "react-dom";
import { ContactForm } from "@/components/ContactForm";
import { Nav } from "@/components/Nav";
import { SiteMotion } from "@/components/SiteMotion";
import { clipUrl, shots } from "@/lib/work";
import studioImg from "@/assets/work/river-sunset.jpg";

// Override with a CDN URL (e.g. Cloudflare Stream, Mux, Vercel Blob) once the reel grows.
const heroVideo = process.env.NEXT_PUBLIC_HERO_VIDEO_URL ?? "/media/hero.mp4";
const heroPoster = process.env.NEXT_PUBLIC_HERO_POSTER_URL ?? "/media/hero-poster.jpg";

// No searchParams here on purpose: reading them would opt the whole page out of static
// rendering for one optional flag that SiteMotion reads from the URL on the client anyway.
export default function Home() {
  // The poster is the first thing on screen (and the largest paint): fetch it before the scripts.
  preload(heroPoster, { as: "image", fetchPriority: "high" });

  return (
    <>
      {/* Without JS nothing would ever lift the loader. */}
      <noscript>
        <style>{"#loader{display:none}"}</style>
      </noscript>
      <SiteMotion />
      <Nav />

      <main>
        {/* ============ HERO ============ */}
        <section id="top" className="hero wrap">
          {/* The headline gets the full width so it reads in two lines, not six down a narrow column. */}
          <div className="hero-head">
            <div className="hero-kicker" data-hero-fade>
              Based in Mumbai, flying across India since 2021
            </div>
            <h1 className="display" id="hero-title">
              We fly cameras where cranes and helicopters can’t go.
            </h1>
          </div>
          <div className="hero-text">
            <p className="lede" data-hero-fade>
              Aerial cinematography for films and brands, plus inspection and survey flights for bridges, plants,
              infrastructure, and construction sites. Small crew, DGCA-compliant operations, and clear communication
              from first briefing to final delivery.
            </p>
            <div className="hero-ctas" data-hero-fade>
              <a href="#work" className="btn btn-accent">
                See the work
              </a>
              <a href="#contact" className="ulink">
                Tell us about your project
              </a>
            </div>
          </div>
          <figure className="hero-media">
            <div className="hero-frame" id="hero-frame">
              <div className="hero-cover" id="hero-cover" aria-hidden="true" />
              <video
                id="hero-video"
                src={heroVideo}
                poster={heroPoster}
                muted
                playsInline
                loop
                preload="auto"
                aria-label="FPV flight through rusted steelwork inside an industrial plant"
              />
            </div>
            <figcaption className="cap">
              <span>FPV flythrough, steel complex, Gujarat</span>
              <span>7-inch FPV, 6K</span>
            </figcaption>
          </figure>
        </section>

        <div className="wrap">
          <ul className="strip" aria-label="Credentials">
            <li>DGCA remote pilot certificates</li>
            <li>NPNT-compliant aircraft</li>
            <li>Third-party liability cover on every job</li>
            <li>Permissions and airspace paperwork handled</li>
          </ul>
        </div>

        {/* ============ WORK ============ */}
        <section id="work" className="sec reel" aria-labelledby="work-h">
          <div className="sec-head wrap">
            <h2 className="display h2" id="work-h">
              Recent work
            </h2>
            <Link href="/work" className="ulink">
              Filter every flight
            </Link>
          </div>
          <div className="reel-viewport">
            <div className="reel-track wrap" id="reel-track">
              {shots.map((s) => (
                <figure key={s.title} className={`shot${s.wide ? " wide" : ""}`}>
                  <div className="ph">
                    {s.image ? (
                      <Image
                        src={s.image}
                        alt={s.alt}
                        sizes={s.wide ? "(min-width: 1024px) 44vw, (min-width: 700px) 50vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 700px) 50vw, 100vw"}
                        placeholder="blur"
                        quality={90}
                      />
                    ) : (
                      // no still was ever cut for this one: the clip's own first frame stands in. The label
                      // sits behind it and only shows if the clip can't be fetched (no CDN configured yet).
                      s.clip && (
                        <>
                          <span className="ph-missing" aria-hidden="true">Footage unavailable</span>
                          <video src={`${clipUrl(s.clip)}#t=0.1`} muted playsInline preload="metadata" aria-label={s.alt} />
                        </>
                      )
                    )}
                  </div>
                  <figcaption>
                    <div className="shot-meta">
                      <h3>{s.title}</h3>
                      <span className="loc">{s.location}</span>
                    </div>
                    {s.note && <p>{s.note}</p>}
                  </figcaption>
                </figure>
              ))}
              <div className="reel-end">
                <p>Every flight above, with the footage, is on the work page. Filter it by what you need shot.</p>
                <Link href="/work" className="ulink">
                  See the work with footage
                </Link>
              </div>
            </div>
          </div>
          <div className="reel-progress" aria-hidden="true">
            <i id="reel-bar" />
          </div>
        </section>

        {/* ============ SERVICES ============ */}
        <section id="services" className="sec wrap" aria-labelledby="svc-h">
          <div className="svc">
            <div className="svc-intro">
              <h2 className="display h2" id="svc-h">
                What we fly
              </h2>
              <p>
                Two kinds of client, same crew. Productions want the shot; engineers want the data. We do both, and
                we’ll tell you which drone actually fits the job.
              </p>
            </div>
            <div className="svc-cols">
              <div>
                <h3 className="grp-h">For productions</h3>
                <ul className="rows">
                  <li>
                    <h4>Aerial cinematography</h4>
                    <p>Films, ads, music videos. Inspire 3, or a heavy-lift rig carrying your RED or Alexa.</p>
                  </li>
                  <li>
                    <h4>FPV</h4>
                    <p>Chase shots, one-take flythroughs, tight indoor runs.</p>
                  </li>
                  <li>
                    <h4>Real estate and architecture</h4>
                    <p>Timed for the right light, with the view from floors you haven’t built yet.</p>
                  </li>
                  <li>
                    <h4>Live feeds</h4>
                    <p>Low-latency SDI/HDMI for sport and events.</p>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="grp-h">For industry</h3>
                <ul className="rows">
                  <li>
                    <h4>Structural inspection</h4>
                    <p>Bridges, towers, chimneys and grid lines, without rope access.</p>
                  </li>
                  <li>
                    <h4>Survey and mapping</h4>
                    <p>RTK photogrammetry and LiDAR: orthomosaics, elevation models, stockpile volumes.</p>
                  </li>
                  <li>
                    <h4>Plant monitoring</h4>
                    <p>Caged drones inside boiler rooms and conveyors; thermal outside.</p>
                  </li>
                  <li>
                    <h4>Construction progress</h4>
                    <p>The same flight path every month, so the change is easy to see.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============ STUDIO ============ */}
        <section id="studio" className="studio" aria-labelledby="studio-h">
          <div className="studio-media">
            <div className="studio-cover" id="studio-cover" aria-hidden="true" />
            <Image id="studio-img" src={studioImg} alt="Sunset over a wide river delta with green banks" sizes="(min-width: 1024px) 58vw, 100vw" quality={90} />
          </div>
          <div className="studio-text">
            <div>
              <h2 className="display h2" id="studio-h">
                The studio
              </h2>
              <p>
                ETI was built by a camera-first operations team that wanted fewer compromises: better views, faster
                turnarounds, and no unnecessary rigging. Today we run on a lean crew of pilots, visual operators, and
                technical planners working from Mumbai and travelling wherever the job demands.
              </p>
              <p>
                Every mission starts with the practical questions: airspace, permissions, weather, site access, and backup
                planning. We keep the process clear so clients know what is possible, what it costs, and what can be
                delivered on time.
              </p>
            </div>
            <div className="kit">
              <h3>In the kit</h3>
              <p>
                DJI Inspire 3, Freefly Alta X (RED V-Raptor or ARRI Alexa Mini LF), 7-inch and sub-250 g FPV rigs, RTK base
                stations, FLIR thermal.
              </p>
            </div>
          </div>
        </section>

        {/* ============ CONTACT ============ */}
        <section id="contact" className="sec wrap contact" aria-labelledby="contact-h">
          <div className="contact-intro">
            <h2 className="display" id="contact-h">
              Tell us about the shoot.
            </h2>
            <p>
              Location, dates and what you need out of it. We’ll come back with whether it’s flyable, what permissions it
              needs, and a price.
            </p>
            <dl className="details">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href="mailto:contact@etidronevisuals.com" style={{ textUnderlineOffset: 5 }}>
                    contact@etidronevisuals.com
                  </a>
                </dd>
              </div>
              <div>
                <dt>Project enquiries</dt>
                <dd>Available by email, call, or WhatsApp</dd>
              </div>
              <div>
                <dt>Office</dt>
                <dd>Mumbai, India</dd>
              </div>
            </dl>
          </div>
          <ContactForm />
        </section>

        <div className="wrap">
          <footer className="foot">
            <span>© 2026 ETI Drone Visuals, Mumbai</span>
            <nav aria-label="Social">
              <a href="https://instagram.com" target="_blank" rel="noopener">
                Instagram
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener">
                YouTube
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener">
                LinkedIn
              </a>
            </nav>
          </footer>
        </div>
      </main>
    </>
  );
}

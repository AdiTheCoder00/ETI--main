import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseClip } from "@/components/CaseClip";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PageScroll } from "@/components/PageScroll";
import { getPublishedShot, getPublishedShots, getSiteSettings } from "@/lib/content/public";
import { baseOpenGraph } from "@/lib/site";
import { clipUrl, nextShot, type Shot } from "@/lib/work";

// One static page per flight. The flights on the site at build time are prerendered; one added in the
// admin afterwards is rendered on its first visit and cached from then on (dynamicParams), so it
// needs no redeploy. A slug that matches no visible flight is a 404. Admin saves regenerate these
// (refreshPublicPages); the hourly revalidate is a backstop for edits made in the Supabase dashboard.
export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublishedShots()).map((s) => ({ slug: s.slug }));
}

/** Built from the job sheet fields only, so it never says more than the page does. */
function describe(s: Shot) {
  const base = `${s.title}, ${s.location}. ${s.category} flight by ETI Drone Visuals, DGCA-certified pilots from Mumbai. Kit: ${s.kit}.`;
  return s.note ? `${base} ${s.note}` : base;
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const shot = await getPublishedShot((await params).slug);
  if (!shot) return {};
  const title = `${shot.title}, ${shot.location} — ETI Drone Visuals`;
  const description = describe(shot);
  const images = shot.image ? [{ url: shot.image.src, width: shot.image.width, height: shot.image.height, alt: shot.alt }] : [];
  return {
    title,
    description,
    alternates: { canonical: `/work/${shot.slug}` },
    openGraph: { ...baseOpenGraph, type: "article", title, description, url: `/work/${shot.slug}`, images },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CasePage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const [shot, shots, settings] = await Promise.all([getPublishedShot(slug), getPublishedShots(), getSiteSettings()]);
  if (!shot) notFound();
  const next = nextShot(shots, shot.slug);

  return (
    <>
      <PageScroll />
      <Nav />
      <main id="main" className="wrap case">
        <nav className="case-crumb" aria-label="Breadcrumb">
          <Link href="/work">All work</Link>
          <span aria-hidden="true">/</span>
          <span>{shot.category}</span>
        </nav>

        <header className="case-head">
          <h1 className="display" data-lift>
            {shot.title}
          </h1>
          <p className="case-loc">{shot.location}</p>
        </header>

        <figure className="case-media">
          {shot.clip ? (
            <CaseClip src={clipUrl(shot.clip)} poster={shot.image?.src ?? ""} label={shot.alt} />
          ) : (
            shot.image && <Image src={shot.image} alt={shot.alt} sizes="100vw" placeholder="blur" quality={90} priority />
          )}
          <figcaption className="cap">
            <span>{shot.alt}</span>
            <span>{shot.kit}</span>
          </figcaption>
        </figure>

        <dl className="case-facts" data-wipe>
          <div>
            <dt>Location</dt>
            <dd>{shot.location}</dd>
          </div>
          <div>
            <dt>Type of work</dt>
            <dd>{shot.category}</dd>
          </div>
          <div>
            <dt>Flown and finished on</dt>
            <dd>{shot.kit}</dd>
          </div>
        </dl>

        {shot.note && <p className="case-note" data-wipe>{shot.note}</p>}

        {/* Only one flight left on the site: there is no next one to point at. */}
        {next && (
          <Link href={`/work/${next.slug}`} className="case-next" data-wipe>
            <span className="thumb">
              {next.image && <Image src={next.image} alt="" sizes="(min-width: 1024px) 220px, 140px" quality={90} />}
            </span>
            <span>
              <small>Next flight</small>
              <b>{next.title}</b>
              <span className="loc">{next.location}</span>
            </span>
          </Link>
        )}

        <div className="gal-ask">
          <h2 className="display h2" data-lift>
            Something like this?
          </h2>
          <Link href="/?intro=skip#contact" className="btn btn-accent">
            Tell us about the shoot
          </Link>
        </div>

        <Footer settings={settings} />
      </main>
    </>
  );
}

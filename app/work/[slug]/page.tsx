import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseClip } from "@/components/CaseClip";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PageScroll } from "@/components/PageScroll";
import { baseOpenGraph } from "@/lib/site";
import { clipUrl, nextShot, shotBySlug, work, type Shot } from "@/lib/work";

// One page per flight, all built at build time. A slug that isn't in lib/work.ts is a 404, not a
// page rendered on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return work.map((s) => ({ slug: s.slug }));
}

/** Built from the job sheet fields only, so it never says more than the page does. */
function describe(s: Shot) {
  const base = `${s.title}, ${s.location}. ${s.category} flight by ETI Drone Visuals, DGCA-certified pilots from Mumbai. Kit: ${s.kit}.`;
  return s.note ? `${base} ${s.note}` : base;
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const shot = shotBySlug((await params).slug);
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
  const shot = shotBySlug((await params).slug);
  if (!shot) notFound();
  const next = nextShot(shot.slug);

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

        {shot.note && <p className="case-note">{shot.note}</p>}

        <Link href={`/work/${next.slug}`} className="case-next">
          <span className="thumb">
            {next.image && <Image src={next.image} alt="" sizes="(min-width: 1024px) 220px, 140px" quality={90} />}
          </span>
          <span>
            <small>Next flight</small>
            <b>{next.title}</b>
            <span className="loc">{next.location}</span>
          </span>
        </Link>

        <div className="gal-ask">
          <h2 className="display h2" data-lift>
            Something like this?
          </h2>
          <Link href="/?intro=skip#contact" className="btn btn-accent">
            Tell us about the shoot
          </Link>
        </div>

        <Footer />
      </main>
    </>
  );
}

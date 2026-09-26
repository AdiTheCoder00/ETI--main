import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PageScroll } from "@/components/PageScroll";
import { PlacesMap } from "@/components/PlacesMap";
import { WorkGallery } from "@/components/WorkGallery";
import { baseOpenGraph, defaultShareImage } from "@/lib/site";

const title = "Work — ETI Drone Visuals";
const description =
  "Aerial film, inspection and survey flights across India. Filter the reel by industrial, urban and transit, scenic and heritage, or construction work.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/work" },
  openGraph: { ...baseOpenGraph, title, description, url: "/work", images: [defaultShareImage] },
};

export default function WorkPage() {
  return (
    <>
      <PageScroll />
      <Nav />
      <main id="main" className="wrap gal-page">
        <header className="gal-head">
          <h1 className="display h2" id="work-h" data-lift>
            Work
          </h1>
          <p data-wipe>
            Every flight we can show, with the footage. Hover or tap a frame to play it. For anything under NDA, ask and
            we’ll screen it.
          </p>
        </header>

        <WorkGallery />

        <section className="places" aria-labelledby="places-h">
          <div className="places-head">
            <h2 className="display h2" id="places-h" data-lift>
              Where we’ve flown
            </h2>
            <p data-wipe>Where the flights on this page were shot, and four jobs whose footage is no longer online.</p>
          </div>
          <PlacesMap />
        </section>

        <div className="gal-ask">
          <h2 className="display h2" id="ask-h" data-lift>
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

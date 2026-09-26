import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { PageScroll } from "@/components/PageScroll";
import { WorkGallery } from "@/components/WorkGallery";

export const metadata: Metadata = {
  title: "Work — ETI Drone Visuals",
  description:
    "Aerial film, inspection and survey flights across India. Filter the reel by industrial, urban and transit, scenic and heritage, or construction work.",
};

export default function WorkPage() {
  return (
    <>
      <PageScroll />
      <Nav />
      <main className="wrap gal-page">
        <header className="gal-head">
          <h1 className="display h2" id="work-h">
            Work
          </h1>
          <p>
            Every flight we can show, with the footage. Hover or tap a frame to play it. For anything under NDA, ask and
            we’ll screen it.
          </p>
        </header>

        <WorkGallery />

        <div className="gal-ask">
          <h2 className="display h2" id="ask-h">
            Something like this?
          </h2>
          <Link href="/?intro=skip#contact" className="btn btn-accent">
            Tell us about the shoot
          </Link>
        </div>

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
      </main>
    </>
  );
}

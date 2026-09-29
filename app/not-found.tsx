import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getSiteSettings } from "@/lib/content/public";

export const metadata: Metadata = {
  title: "Page not found — ETI Drone Visuals",
};

export default async function NotFound() {
  const settings = await getSiteSettings();
  return (
    <>
      <Nav />
      <main id="main" className="wrap missing">
        <h1 className="display h2">Page not found</h1>
        <p>The link may be old, or the address mistyped. The work and the ways to reach us are all still here.</p>
        <div className="missing-links">
          <Link href="/work" className="btn btn-accent">
            See the work
          </Link>
          <Link href="/?intro=skip" className="ulink">
            Go to the homepage
          </Link>
        </div>
        <Footer settings={settings} />
      </main>
    </>
  );
}

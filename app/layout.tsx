import type { Metadata, Viewport } from "next";
import { Archivo, Poppins, Source_Serif_4 } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { SITE_URL, baseOpenGraph } from "@/lib/site";

// Archivo's width axis gives the condensed (~72%) headline cut; Source Serif's
// optical-size axis keeps body text readable at 16-21px.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-source-serif",
  display: "swap",
});

// Not a variable font: Medium is the only cut used, for the standfirst under each heading.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ETI Drone Visuals — Aerial film, inspection and survey",
  description:
    "Aerial cinematography, structural inspection and survey flights across India. DGCA-certified pilots based in Mumbai.",
  openGraph: {
    ...baseOpenGraph,
    title: "ETI Drone Visuals — Aerial film, inspection and survey",
    description: "Aerial cinematography, structural inspection and survey flights across India. DGCA-certified pilots based in Mumbai.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // the browser chrome on phones takes the page colour, in both schemes
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1EEE7" },
    { media: "(prefers-color-scheme: dark)", color: "#15140F" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${sourceSerif.variable} ${poppins.variable}`}>
      <body>
        {/* first stop for keyboard users: past the nav (and the intro) straight to the page */}
        <a href="#main" className="skip">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Archivo, Poppins, Source_Serif_4 } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "ETI Drone Visuals — Aerial film, inspection and survey",
  description:
    "Aerial cinematography, structural inspection and survey flights across India. DGCA-certified pilots based in Mumbai.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${sourceSerif.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}

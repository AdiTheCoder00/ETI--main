import type { MetadataRoute } from "next";
import { work } from "@/lib/work";

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// No lastModified: the flights carry no dates, and an invented one is worse than none.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, priority: 1 },
    { url: `${site}/work`, priority: 0.8 },
    ...work.map((s) => ({ url: `${site}/work/${s.slug}`, priority: 0.6 })),
  ];
}

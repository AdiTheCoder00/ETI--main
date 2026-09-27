import type { MetadataRoute } from "next";
import { SITE_URL as site } from "@/lib/site";
import { work } from "@/lib/work";

// No lastModified: the flights carry no dates, and an invented one is worse than none.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, priority: 1 },
    { url: `${site}/work`, priority: 0.8 },
    ...work.map((s) => ({ url: `${site}/work/${s.slug}`, priority: 0.6 })),
  ];
}

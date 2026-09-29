import type { MetadataRoute } from "next";
import { getPublishedShots } from "@/lib/content/public";
import { SITE_URL as site } from "@/lib/site";

// Regenerated with the pages it lists: admin saves revalidate it (refreshPublicPages), hourly otherwise.
export const revalidate = 3600;

// No lastModified: the flights carry no dates, and an invented one is worse than none.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: `${site}/`, priority: 1 },
    { url: `${site}/work`, priority: 0.8 },
    ...(await getPublishedShots()).map((s) => ({ url: `${site}/work/${s.slug}`, priority: 0.6 })),
  ];
}

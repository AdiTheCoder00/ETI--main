import "server-only";
import { revalidatePath } from "next/cache";

/** Regenerate every static page that shows flights or site details, after any admin edit. */
export function refreshPublicPages() {
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/work/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

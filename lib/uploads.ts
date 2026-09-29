/**
 * Media uploads from /admin/work. Pure rules here; the routes live in app/admin/upload.
 *
 * - "blob":  BLOB_READ_WRITE_TOKEN is set. The browser uploads straight to Vercel Blob with a
 *            short-lived token from /admin/upload, so a 10 MB clip never passes through a
 *            function (Vercel caps request bodies at 4.5 MB).
 * - "local": no Supabase and not production, i.e. plain `npm run dev`. Files go to
 *            public/media/uploads, next to the local .data store that points at them.
 * - "off":   Supabase is configured but Blob isn't. Local files would be referenced from the
 *            shared database and 404 everywhere else, so uploading is refused instead.
 */
export type UploadMode = "blob" | "local" | "off";
export type MediaKind = "image" | "video";

export function uploadMode(env: { blobToken: string; hasSupabase: boolean; production: boolean }): UploadMode {
  if (env.blobToken) return "blob";
  if (!env.hasSupabase && !env.production) return "local";
  return "off";
}

export const MEDIA: Record<MediaKind, { types: Record<string, string>; maxBytes: number; folder: string; label: string }> = {
  image: {
    types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" },
    maxBytes: 15 * 1024 * 1024,
    folder: "work/stills",
    label: "JPEG, PNG, WebP or AVIF, up to 15 MB",
  },
  video: {
    // No .mov: Chrome and Firefox can't reliably play QuickTime, so it would work only in Safari.
    types: { "video/mp4": "mp4", "video/webm": "webm" },
    maxBytes: 200 * 1024 * 1024,
    folder: "work/clips",
    label: "MP4 or WebM, up to 200 MB",
  },
};

export const parseKind = (v: unknown): MediaKind | null => (v === "image" || v === "video" ? v : null);

/** A storage name that says what the file is, with nothing from the visitor's filename but the stem. */
export function storageName(kind: MediaKind, originalName: string, contentType: string): string | null {
  const ext = MEDIA[kind].types[contentType];
  if (!ext) return null;
  const stem =
    originalName
      .replace(/\.[^.]*$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || kind;
  return `${MEDIA[kind].folder}/${stem}.${ext}`;
}

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdmin } from "@/lib/auth";
import { currentUploadMode } from "@/lib/env";
import { MEDIA, parseKind, storageName } from "@/lib/uploads";

/** `npm run dev` without Supabase or Blob: keep uploads on this machine, in public/media/uploads. */
export async function POST(request: Request): Promise<Response> {
  if (currentUploadMode() !== "local") {
    return Response.json({ error: "Local uploads are only for development." }, { status: 404 });
  }
  if (!(await getAdmin())) return Response.json({ error: "Sign in to upload." }, { status: 401 });

  const form = await request.formData();
  const kind = parseKind(form.get("kind"));
  const file = form.get("file");
  if (!kind || !(file instanceof File)) return Response.json({ error: "Nothing to upload." }, { status: 400 });
  if (file.size > MEDIA[kind].maxBytes) return Response.json({ error: `Too large: ${MEDIA[kind].label}.` }, { status: 413 });

  const name = storageName(kind, file.name, file.type);
  if (!name) return Response.json({ error: `Wrong type: ${MEDIA[kind].label}.` }, { status: 415 });

  // Same shape as a Blob URL: the readable name plus a random suffix, so uploads never collide.
  const withSuffix = name.replace(/(\.[a-z0-9]+)$/, `-${randomBytes(4).toString("hex")}$1`);
  const target = path.join(process.cwd(), "public", "media", "uploads", ...withSuffix.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/media/uploads/${withSuffix}` });
}

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdmin } from "@/lib/auth";
import { currentUploadMode } from "@/lib/env";
import { MEDIA, parseKind } from "@/lib/uploads";

/**
 * Issues short-lived client tokens so the admin's browser can upload straight to Vercel Blob.
 * The token is what enforces the rules: file type, size, and the folder for its kind.
 */
export async function POST(request: Request): Promise<Response> {
  if (currentUploadMode() !== "blob") {
    return Response.json({ error: "Blob uploads aren’t configured." }, { status: 404 });
  }

  const body = (await request.json()) as HandleUploadBody;
  // Only token requests. We never set a callbackUrl, so a completion event here isn't ours.
  if (body?.type !== "blob.generate-client-token") {
    return Response.json({ error: "Unsupported request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await getAdmin())) throw new Error("Sign in to upload.");
        const kind = parseKind(clientPayload);
        if (!kind || !pathname.startsWith(`${MEDIA[kind].folder}/`)) throw new Error("Unexpected upload.");
        return {
          allowedContentTypes: Object.keys(MEDIA[kind].types),
          maximumSizeInBytes: MEDIA[kind].maxBytes,
          addRandomSuffix: true,
          validUntil: Date.now() + 15 * 60_000,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload refused." }, { status: 400 });
  }
}

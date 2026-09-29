"use client";

import { upload } from "@vercel/blob/client";
import Image, { type StaticImageData } from "next/image";
import { useRef, useState } from "react";
import { MEDIA, storageName, type MediaKind, type UploadMode } from "@/lib/uploads";
import { clipUrl } from "@/lib/work";

type Slot = { value: string; width?: number; height?: number; blur?: string; preview?: StaticImageData };

type Props = {
  name: "still" | "clip";
  kind: MediaKind;
  label: string;
  initial: Slot;
  mode: UploadMode;
  error?: string;
};

/**
 * A still's size and a 16px-wide blur placeholder, read from the file itself before it leaves the
 * browser. next/image needs both for a URL it can't import at build time, and the public pages ask
 * for placeholder="blur" on every still.
 */
async function describeImage(file: File): Promise<{ width: number; height: number; blur: string }> {
  const bitmap = await createImageBitmap(file);
  const w = 16;
  const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  const result = { width: bitmap.width, height: bitmap.height, blur: canvas.toDataURL("image/jpeg", 0.7) };
  bitmap.close();
  return result;
}

/**
 * One media slot in the flight form. The file goes straight from the browser to storage; the form
 * only ever carries the resulting URL (and, for a still, its size and blur) and saves them with the flight.
 */
export function MediaField({ name, kind, label, initial, mode, error }: Props) {
  const [slot, setSlot] = useState<Slot>(initial);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const rules = MEDIA[kind];
  const value = slot.value;

  async function send(file: File) {
    setProblem(null);
    const pathname = storageName(kind, file.name, file.type);
    if (!pathname) return setProblem(`That’s not a supported file: ${rules.label}.`);
    if (file.size > rules.maxBytes) return setProblem(`That file is too large: ${rules.label}.`);

    setProgress(0);
    try {
      // Measure first: a file the browser can't decode shouldn't be uploaded at all.
      const meta = kind === "image" ? await describeImage(file) : undefined;
      let url: string;
      if (mode === "blob") {
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/admin/upload",
          clientPayload: kind,
          contentType: file.type,
          multipart: file.size > 8 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => setProgress(percentage),
        });
        url = blob.url;
      } else {
        const body = new FormData();
        body.set("kind", kind);
        body.set("file", file);
        const res = await fetch("/admin/upload/local", { method: "POST", body });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
        url = json.url;
      }
      setSlot({ value: url, ...meta });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setProgress(null);
      if (picker.current) picker.current.value = "";
    }
  }

  const busy = progress !== null;
  // The server's message is about what was submitted; once the slot has changed it no longer applies.
  const [submitted, setSubmitted] = useState({ error, value });
  if (submitted.error !== error) setSubmitted({ error, value });
  const message = problem ?? (value === submitted.value ? error : undefined);

  // A bundled still is only a file name here, so it previews from the import the server resolved.
  const preview = value && value === initial.value && initial.preview ? initial.preview : value;

  return (
    <div className="f full adm-media" data-field={name} tabIndex={-1}>
      <span className="adm-label" id={`${name}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      {kind === "image" && (
        <>
          <input type="hidden" name="stillWidth" value={slot.width ?? 0} />
          <input type="hidden" name="stillHeight" value={slot.height ?? 0} />
          <input type="hidden" name="stillBlur" value={slot.blur ?? ""} />
        </>
      )}

      <div className="adm-media-row">
        <div className="adm-media-preview" aria-hidden={!value}>
          {!value ? (
            <span>None</span>
          ) : kind === "image" ? (
            <Image src={preview} alt="" fill sizes="240px" quality={90} />
          ) : (
            <video src={`${clipUrl(value)}#t=0.1`} muted playsInline preload="metadata" controls />
          )}
        </div>

        <div className="adm-media-actions">
          {mode === "off" ? (
            <p className="form-note">
              Uploading needs Vercel Blob: connect a Blob store to the project so <code>BLOB_READ_WRITE_TOKEN</code> is set.
            </p>
          ) : (
            <>
              <label className="btn adm-btn">
                {busy ? `Uploading… ${Math.round(progress ?? 0)}%` : value ? "Replace" : "Upload"}
                <input
                  ref={picker}
                  type="file"
                  className="sr"
                  accept={Object.keys(rules.types).join(",")}
                  disabled={busy}
                  aria-labelledby={`${name}-label`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void send(file);
                  }}
                />
              </label>
              <p className="form-note">{rules.label}.</p>
            </>
          )}
          {value && !busy && (
            <button type="button" className="adm-link" onClick={() => setSlot({ value: "" })}>
              Remove
            </button>
          )}
          {value !== initial.value && !busy && <p className="form-note">Not live until you save the flight.</p>}
        </div>
      </div>
      {message && (
        <p className="err" id={`${name}-err`} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

"use client";

import type { StaticImageData } from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { FlightField } from "@/lib/content/flight-schema";
import type { UploadMode } from "@/lib/uploads";
import { CATEGORIES, slugify, type Flight } from "@/lib/work";
import { FieldError } from "../FieldError";
import { useAdminForm } from "../useAdminForm";
import { saveFlight } from "./actions";
import { MediaField } from "./MediaField";

const ORDER: readonly FlightField[] = ["title", "slug", "location", "category", "kit", "still", "clip", "alt", "note"];

/** `stillPreview`: a bundled still resolved on the server, since the form only knows its file name. */
export function FlightForm({ flight, mode, stillPreview }: { flight: Flight | null; mode: UploadMode; stillPreview?: StaticImageData }) {
  const { state, pending, formProps, err, invalid } = useAdminForm(saveFlight, ORDER);
  const f = flight;
  // A new flight's address follows its title until someone edits the address itself.
  const [slug, setSlug] = useState(f?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(f));

  return (
    <form {...formProps} className="form adm-form">
      {f && <input type="hidden" name="id" value={f.id} />}

      <div className="f">
        <label htmlFor="fl-title">Title</label>
        <input
          id="fl-title"
          name="title"
          maxLength={80}
          defaultValue={f?.title}
          placeholder="Chimney stack audit"
          onChange={(e) => !slugEdited && setSlug(slugify(e.target.value))}
          {...invalid("title")}
        />
        <FieldError field="title" message={err("title")} />
      </div>
      <div className="f">
        <label htmlFor="fl-slug">Web address</label>
        <input
          id="fl-slug"
          name="slug"
          maxLength={80}
          value={slug}
          placeholder="chimney-stack-audit"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value.toLowerCase());
          }}
          {...invalid("slug")}
        />
        <p className="form-note">
          /work/{slug || "…"}
          {f && slug !== f.slug && " · Changing it breaks links to the old address, including search results."}
        </p>
        <FieldError field="slug" message={err("slug")} />
      </div>
      <div className="f">
        <label htmlFor="fl-location">Location</label>
        <input id="fl-location" name="location" maxLength={80} defaultValue={f?.location} placeholder="Power station, Madhya Pradesh" {...invalid("location")} />
        <FieldError field="location" message={err("location")} />
      </div>
      <div className="f">
        <label htmlFor="fl-category">Category</label>
        <select id="fl-category" name="category" defaultValue={f?.category ?? CATEGORIES[0]} {...invalid("category")}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <FieldError field="category" message={err("category")} />
      </div>
      <div className="f full">
        <label htmlFor="fl-kit">Shot on</label>
        <input id="fl-kit" name="kit" maxLength={80} defaultValue={f?.kit} placeholder="Thermal and 4K" {...invalid("kit")} />
        <FieldError field="kit" message={err("kit")} />
      </div>

      <MediaField
        name="still"
        kind="image"
        label="Still"
        initial={{ value: f?.still ?? "", width: f?.stillWidth ?? 0, height: f?.stillHeight ?? 0, blur: f?.stillBlur ?? "", preview: stillPreview }}
        mode={mode}
        error={err("still")}
      />
      <MediaField name="clip" kind="video" label="Clip" initial={{ value: f?.clip ?? "" }} mode={mode} error={err("clip")} />

      <div className="f full">
        <label htmlFor="fl-alt">Describe the frame</label>
        <textarea
          id="fl-alt"
          name="alt"
          rows={2}
          maxLength={200}
          defaultValue={f?.alt}
          placeholder="Drone view down the side of a concrete chimney stack beside a river"
          {...invalid("alt")}
        />
        <p className="form-note">For people using screen readers. Say what’s in the shot, not how good it is.</p>
        <FieldError field="alt" message={err("alt")} />
      </div>
      <div className="f full">
        <label htmlFor="fl-note">Note (optional)</label>
        <textarea id="fl-note" name="note" rows={2} maxLength={300} defaultValue={f?.note} placeholder="What the client got out of it, in one line." {...invalid("note")} />
        <FieldError field="note" message={err("note")} />
      </div>

      <fieldset className="full adm-checks">
        <legend>Where it shows</legend>
        <label>
          <input type="checkbox" name="visible" defaultChecked={f?.visible ?? true} /> On the site (untick to hide it everywhere, case page included)
        </label>
        <label>
          <input type="checkbox" name="onHomepage" defaultChecked={f?.onHomepage ?? true} /> In the homepage reel, as well as on /work
        </label>
        <label>
          <input type="checkbox" name="wide" defaultChecked={f?.wide ?? false} /> Wide frame (takes more room in the reel)
        </label>
      </fieldset>

      <div className="send full">
        <p className={`form-note${state.ok === false ? " is-error" : ""}`} aria-live="polite" role={state.ok === false ? "alert" : undefined}>
          {state.message ?? "Saving publishes it: the homepage, /work and its case page update straight away."}
        </p>
        <div className="adm-send-actions">
          <Link href="/admin/work" className="adm-link">
            Cancel
          </Link>
          <button type="submit" className="btn btn-accent" disabled={pending}>
            {pending ? "Saving…" : f ? "Save flight" : "Add flight"}
          </button>
        </div>
      </div>
    </form>
  );
}

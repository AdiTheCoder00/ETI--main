import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { BUNDLED_STILLS } from "@/lib/stills";
import { getContentStore } from "@/lib/content/store";
import { currentUploadMode } from "@/lib/env";
import { AdminHeader } from "../../AdminHeader";
import { ConfirmButton } from "../../ConfirmButton";
import { deleteFlight } from "../actions";
import { FlightForm } from "../FlightForm";

export default async function EditFlight({ params }: PageProps<"/admin/work/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const flight = await (await getContentStore()).getFlight(id);
  if (!flight) notFound();

  return (
    <>
      <AdminHeader admin={admin} current="work" />
      <p className="adm-crumb">
        <Link href="/admin/work">Work</Link> / {flight.title}
      </p>
      <div className="adm-title">
        <h1 className="display">Edit flight</h1>
      </div>
      <p className="adm-sub">
        Case page:{" "}
        {flight.visible ? (
          <a href={`/work/${flight.slug}`} target="_blank" rel="noopener">
            /work/{flight.slug}
          </a>
        ) : (
          `/work/${flight.slug} (hidden, so it returns “not found”)`
        )}
      </p>
      <FlightForm flight={flight} mode={currentUploadMode()} stillPreview={BUNDLED_STILLS[flight.still]} />

      <form action={deleteFlight} className="adm-delete">
        <input type="hidden" name="id" value={flight.id} />
        <p>
          Deleting removes it from the site, its case page included, and from this list. To take it down for now, untick
          “On the site” instead.
        </p>
        <ConfirmButton question={`Delete “${flight.title}”? This can’t be undone.`}>Delete this flight</ConfirmButton>
      </form>
    </>
  );
}

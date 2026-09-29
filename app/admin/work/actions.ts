"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type AdminFormState } from "@/lib/admin-form";
import { requireAdmin } from "@/lib/auth";
import { flightInputSchema, type FlightField } from "@/lib/content/flight-schema";
import { refreshPublicPages } from "@/lib/content/refresh";
import { getContentStore } from "@/lib/content/store";

const FIELDS: FlightField[] = [
  "slug",
  "title",
  "location",
  "category",
  "kit",
  "alt",
  "note",
  "still",
  "stillWidth",
  "stillHeight",
  "stillBlur",
  "clip",
  "wide",
  "onHomepage",
  "visible",
];
const flightId = (form: FormData) => String(form.get("id") ?? "").slice(0, 64);

function changed() {
  refreshPublicPages();
  revalidatePath("/admin/work", "layout");
}

export async function saveFlight(_prev: AdminFormState<FlightField>, form: FormData): Promise<AdminFormState<FlightField>> {
  await requireAdmin();
  const id = flightId(form);
  // Unchecked boxes are simply absent from FormData; the schema reads absent as false.
  const parsed = flightInputSchema.safeParse(Object.fromEntries(FIELDS.map((f) => [f, form.get(f) ?? undefined])));
  if (!parsed.success) {
    return { ok: false, message: "Check the fields marked below.", fieldErrors: fieldErrorsFrom<FlightField>(parsed.error) };
  }

  const store = await getContentStore();
  // Two flights can't share a case page. The database's unique index backs this up if two saves race.
  const clash = (await store.listFlights()).find((f) => f.slug === parsed.data.slug && f.id !== id);
  if (clash) {
    return { ok: false, message: "Check the fields marked below.", fieldErrors: { slug: `“${clash.title}” already uses this address.` } };
  }

  if (id) {
    if (!(await store.updateFlight(id, parsed.data))) return { ok: false, message: "That flight no longer exists." };
  } else {
    await store.createFlight(parsed.data);
  }
  changed();
  redirect("/admin/work");
}

export async function deleteFlight(form: FormData): Promise<void> {
  await requireAdmin();
  const store = await getContentStore();
  await store.deleteFlight(flightId(form));
  changed();
  redirect("/admin/work");
}

export async function moveFlight(form: FormData): Promise<void> {
  await requireAdmin();
  const direction = form.get("direction") === "up" ? -1 : 1;
  const store = await getContentStore();
  if (await store.moveFlight(flightId(form), direction)) changed();
}

export async function setFlightFlag(form: FormData): Promise<void> {
  await requireAdmin();
  const flag = form.get("flag");
  if (flag !== "visible" && flag !== "onHomepage") return;
  const store = await getContentStore();
  if (await store.setFlightFlags(flightId(form), { [flag]: form.get("value") === "true" })) changed();
}

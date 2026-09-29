import "server-only";
import { readSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type { Category, Flight } from "@/lib/work";
import type { FlightInput } from "./flight-schema";
import type { ContentStore } from "./store";

type FlightRow = {
  id: string;
  slug: string;
  title: string;
  location: string;
  category: Category;
  kit: string;
  alt: string;
  note: string;
  still: string;
  still_width: number;
  still_height: number;
  still_blur: string;
  clip: string;
  wide: boolean;
  on_homepage: boolean;
  visible: boolean;
  position: number;
};

const COLUMNS =
  "id, slug, title, location, category, kit, alt, note, still, still_width, still_height, still_blur, clip, wide, on_homepage, visible, position";

const toFlight = (r: FlightRow): Flight => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  location: r.location,
  category: r.category,
  kit: r.kit,
  alt: r.alt,
  note: r.note,
  still: r.still,
  stillWidth: r.still_width,
  stillHeight: r.still_height,
  stillBlur: r.still_blur,
  clip: r.clip,
  wide: r.wide,
  onHomepage: r.on_homepage,
  visible: r.visible,
  position: r.position,
});

const toRow = (f: FlightInput) => ({
  slug: f.slug,
  title: f.title,
  location: f.location,
  category: f.category,
  kit: f.kit,
  alt: f.alt,
  note: f.note,
  still: f.still,
  still_width: f.stillWidth,
  still_height: f.stillHeight,
  still_blur: f.stillBlur,
  clip: f.clip,
  wide: f.wide,
  on_homepage: f.onHomepage,
  visible: f.visible,
});

// Supabase rejects a malformed uuid with an error; a missing flight should read as "not found".
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Service-role access, like the lead store: call only from code that has checked the admin. */
export function createSupabaseContentStore(): ContentStore {
  const db = createServiceClient();

  async function ordered() {
    const { data, error } = await db
      .from("flights")
      .select(COLUMNS)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<FlightRow[]>();
    if (error) throw new Error(`Loading flights failed: ${error.message}`);
    return data;
  }

  return {
    async listFlights() {
      return (await ordered()).map(toFlight);
    },

    async getFlight(id) {
      if (!UUID.test(id)) return null;
      const { data, error } = await db.from("flights").select(COLUMNS).eq("id", id).maybeSingle<FlightRow>();
      if (error) throw new Error(`Loading flight failed: ${error.message}`);
      return data ? toFlight(data) : null;
    },

    async createFlight(input) {
      const rows = await ordered();
      const position = Math.max(0, ...rows.map((r) => r.position)) + 1;
      const { data, error } = await db
        .from("flights")
        .insert({ ...toRow(input), position })
        .select(COLUMNS)
        .single<FlightRow>();
      if (error) throw new Error(`Saving flight failed: ${error.message}`);
      return toFlight(data);
    },

    async updateFlight(id, input) {
      if (!UUID.test(id)) return false;
      const { data, error } = await db.from("flights").update(toRow(input)).eq("id", id).select("id");
      if (error) throw new Error(`Updating flight failed: ${error.message}`);
      return data.length > 0;
    },

    async setFlightFlags(id, flags) {
      if (!UUID.test(id)) return false;
      const patch: Partial<Pick<FlightRow, "visible" | "on_homepage">> = {};
      if (flags.visible !== undefined) patch.visible = flags.visible;
      if (flags.onHomepage !== undefined) patch.on_homepage = flags.onHomepage;
      const { data, error } = await db.from("flights").update(patch).eq("id", id).select("id");
      if (error) throw new Error(`Updating flight failed: ${error.message}`);
      return data.length > 0;
    },

    async moveFlight(id, direction) {
      const rows = await ordered();
      const i = rows.findIndex((r) => r.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= rows.length) return false;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      // Renumber rather than swap the two values, so rows that ever shared a position come apart.
      const changed = rows.map((r, k) => ({ id: r.id, position: k + 1, was: r.position })).filter((r) => r.position !== r.was);
      for (const r of changed) {
        const { error } = await db.from("flights").update({ position: r.position }).eq("id", r.id);
        if (error) throw new Error(`Reordering flights failed: ${error.message}`);
      }
      return true;
    },

    async deleteFlight(id) {
      if (!UUID.test(id)) return false;
      const { data, error } = await db.from("flights").delete().eq("id", id).select("id");
      if (error) throw new Error(`Deleting flight failed: ${error.message}`);
      return data.length > 0;
    },

    async getSettings() {
      const { data, error } = await db.from("site_settings").select("data").eq("id", 1).maybeSingle<{ data: unknown }>();
      if (error) throw new Error(`Loading settings failed: ${error.message}`);
      return readSettings(data?.data);
    },

    async saveSettings(settings) {
      const { error } = await db.from("site_settings").upsert({ id: 1, data: settings });
      if (error) throw new Error(`Saving settings failed: ${error.message}`);
    },
  };
}

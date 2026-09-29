import "server-only";
import { hasSupabase } from "@/lib/env";
import type { SiteSettings } from "@/lib/settings";
import type { Flight } from "@/lib/work";
import type { FlightInput } from "./flight-schema";

export type FlightFlags = Partial<Pick<Flight, "visible" | "onHomepage">>;

export interface ContentStore {
  /** Every flight, hidden ones included, in position order. */
  listFlights(): Promise<Flight[]>;
  getFlight(id: string): Promise<Flight | null>;
  /** New flights go to the end of the reel. */
  createFlight(input: FlightInput): Promise<Flight>;
  updateFlight(id: string, input: FlightInput): Promise<boolean>;
  setFlightFlags(id: string, flags: FlightFlags): Promise<boolean>;
  /** Swap with the neighbour above (-1) or below (1). False when already at that end. */
  moveFlight(id: string, direction: -1 | 1): Promise<boolean>;
  deleteFlight(id: string): Promise<boolean>;
  getSettings(): Promise<SiteSettings>;
  saveSettings(settings: SiteSettings): Promise<void>;
}

let store: Promise<ContentStore> | null = null;

/**
 * Supabase when it is configured, the local files otherwise. Unlike the lead store this never
 * throws for missing config: public pages read through it at build time, and they should fall
 * back to the defaults rather than fail. Writes still need an admin, and in production that
 * already needs Supabase (lib/auth.ts).
 */
export function getContentStore(): Promise<ContentStore> {
  store ??= hasSupabase()
    ? import("./store-supabase").then((m) => m.createSupabaseContentStore())
    : import("./store-file").then((m) => m.createFileContentStore());
  return store;
}

import { work, type Shot } from "./work";

/**
 * Where the studio has flown, for the map on /work. Taken from the old site's project list: the twelve
 * flights on the site plus four jobs whose clips were already gone from its server.
 *
 * Only what the old site named is placed. A city or site gets a point (`kind: "place"`); a state, valley
 * or range gets an area marker (`kind: "region"`) rather than a dot at a spot nobody named. Three flights
 * name no place at all (a petrochem refinery, a mineral processing unit, a railway hub), so they are not
 * on the map. Coordinates are the public ones for each named place, not job-site positions.
 */
export type Place = {
  id: string;
  name: string;
  kind: "place" | "region";
  lon: number;
  lat: number;
  /** A flight on the site (by slug), or the title of a job whose footage is no longer online. */
  flights: ({ slug: string } | { title: string })[];
};

export const places: Place[] = [
  { id: "delhi", name: "Delhi NCR", kind: "place", lon: 77.21, lat: 28.61, flights: [{ slug: "expressway-at-night" }] },
  { id: "varanasi", name: "Varanasi", kind: "place", lon: 82.97, lat: 25.32, flights: [{ title: "Bridge arch inspection" }] },
  { id: "mp", name: "Madhya Pradesh", kind: "region", lon: 78.3, lat: 23.7, flights: [{ slug: "chimney-stack-audit" }] },
  { id: "gujarat", name: "Gujarat", kind: "region", lon: 71.6, lat: 22.7, flights: [{ slug: "fpv-flythrough" }] },
  { id: "hooghly", name: "Hooghly estuary", kind: "place", lon: 88.1, lat: 22.0, flights: [{ title: "Suspension bridge at golden hour" }] },
  { id: "narmada", name: "Narmada Valley", kind: "region", lon: 75.9, lat: 22.1, flights: [{ slug: "river-basin-delta" }] },
  { id: "nagpur", name: "Nagpur", kind: "place", lon: 79.09, lat: 21.15, flights: [{ slug: "terminal-orbit" }] },
  { id: "chilika", name: "Chilika Lagoon", kind: "place", lon: 85.32, lat: 19.72, flights: [{ slug: "wetland-sanctuary" }] },
  { id: "mumbai", name: "BKC, Mumbai", kind: "place", lon: 72.87, lat: 19.07, flights: [{ slug: "tower-progress-survey" }] },
  { id: "vizag", name: "Vizag", kind: "place", lon: 83.22, lat: 17.69, flights: [{ title: "Tower crane at the port terminal" }] },
  { id: "hyderabad", name: "Hyderabad", kind: "place", lon: 78.49, lat: 17.39, flights: [{ title: "Construction progress" }] },
  { id: "ghats", name: "Western Ghats", kind: "region", lon: 75.0, lat: 14.2, flights: [{ slug: "hill-temple" }] },
  { id: "bengaluru", name: "Bengaluru", kind: "place", lon: 77.59, lat: 12.97, flights: [{ slug: "metro-viaduct-tracking" }] },
];

export type PlacedFlight = { title: string; shot?: Shot };

/** A place's flights resolved against lib/work.ts, so titles on the map never drift from the case pages. */
export function flightsAt(p: Place): PlacedFlight[] {
  return p.flights.map((f) => {
    if ("title" in f) return { title: f.title };
    const shot = work.find((s) => s.slug === f.slug);
    if (!shot) throw new Error(`places.ts: no flight with slug "${f.slug}" in lib/work.ts`);
    return { title: shot.title, shot };
  });
}

/** Flights on the site that name no place, so the page can say so rather than leave them unexplained. */
export const unplaced = work.filter((s) => !places.some((p) => p.flights.some((f) => "slug" in f && f.slug === s.slug)));

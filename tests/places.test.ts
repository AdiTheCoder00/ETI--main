import { describe, expect, it } from "vitest";
import { DEFAULT_FLIGHTS } from "@/lib/content/defaults";
import { INDIA_HEIGHT, INDIA_WIDTH, project } from "@/lib/map/india";
import { NO_PLACE, places, resolvePlaces, unplaced } from "@/lib/places";

const launch = DEFAULT_FLIGHTS.map(({ slug, title }) => ({ slug, title }));

describe("places on the map", () => {
  it("resolves every mapped slug against the launch flights", () => {
    const mapped = places.flatMap((p) => p.flights.filter((f) => "slug" in f).map((f) => (f as { slug: string }).slug));
    for (const slug of mapped) expect(launch.some((s) => s.slug === slug), slug).toBe(true);
  });

  it("puts every launch flight on the map except the three that name no place", () => {
    expect(unplaced(launch).map((s) => s.slug).sort()).toEqual([...NO_PLACE].sort());
    const placed = resolvePlaces(launch).flatMap((p) => p.resolved).filter((f) => f.shot).length;
    expect(placed + unplaced(launch).length).toBe(launch.length);
  });

  it("drops a hidden or deleted flight instead of failing, and a place left empty with it", () => {
    // Bengaluru's only flight is the metro viaduct; Delhi's is the expressway.
    const without = launch.filter((s) => s.slug !== "metro-viaduct-tracking");
    const resolved = resolvePlaces(without);
    expect(resolved.some((p) => p.id === "bengaluru")).toBe(false);
    expect(resolved.some((p) => p.id === "delhi")).toBe(true);
    // places with only "footage not online" jobs stay: they never depended on a flight
    expect(resolvePlaces([]).map((p) => p.id).sort()).toEqual(["hooghly", "hyderabad", "varanasi", "vizag"]);
  });

  it("doesn't call a flight added in the admin one that names no place", () => {
    expect(unplaced([...launch, { slug: "bridge-deck-survey", title: "Bridge deck survey" }])).toHaveLength(NO_PLACE.length);
  });

  it("keeps ids unique and every point inside the drawn outline's frame", () => {
    expect(new Set(places.map((p) => p.id)).size).toBe(places.length);
    for (const p of places) {
      const [x, y] = project(p.lon, p.lat);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(INDIA_WIDTH);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(INDIA_HEIGHT);
    }
  });
});

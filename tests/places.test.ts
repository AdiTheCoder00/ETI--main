import { describe, expect, it } from "vitest";
import { INDIA_HEIGHT, INDIA_WIDTH, project } from "@/lib/map/india";
import { flightsAt, places, unplaced } from "@/lib/places";
import { work } from "@/lib/work";

describe("places on the map", () => {
  it("resolves every flight slug against lib/work.ts", () => {
    for (const p of places) expect(() => flightsAt(p)).not.toThrow();
  });

  it("puts every flight on the site on the map except the three that name no place", () => {
    expect(unplaced.map((s) => s.slug).sort()).toEqual(["conveyor-line-survey", "rail-yard-mapping", "structural-steelwork-survey"]);
    const placed = places.flatMap(flightsAt).filter((f) => f.shot).length;
    expect(placed + unplaced.length).toBe(work.length);
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

import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { readSettings, type SiteSettings } from "@/lib/settings";
import type { Flight } from "@/lib/work";
import { DEFAULT_FLIGHTS } from "./defaults";
import type { ContentStore } from "./store";

/**
 * Local development only, like the file lead store: .data/flights.json and .data/settings.json
 * (git-ignored). Until the first edit there is no file and the launch flights are served.
 */
export function createFileContentStore(dir = path.join(process.cwd(), ".data")): ContentStore {
  const flightsFile = path.join(dir, "flights.json");
  const settingsFile = path.join(dir, "settings.json");
  let queue: Promise<unknown> = Promise.resolve();

  async function readJson<T>(file: string, fallback: T): Promise<T> {
    try {
      return JSON.parse(await readFile(file, "utf8")) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
      throw e;
    }
  }

  async function writeJson(file: string, data: unknown) {
    await mkdir(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2));
    await rename(tmp, file);
  }

  const load = async () => [...(await readJson<Flight[]>(flightsFile, DEFAULT_FLIGHTS))].sort((a, b) => a.position - b.position);

  // Serialise read-modify-write cycles within this process.
  function edit<T>(fn: (flights: Flight[]) => T): Promise<T> {
    const run = queue.then(async () => {
      const flights = await load();
      const result = fn(flights);
      await writeJson(flightsFile, flights);
      return result;
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    listFlights: load,

    async getFlight(id) {
      return (await load()).find((f) => f.id === id) ?? null;
    },

    createFlight: (input) =>
      edit((flights) => {
        const position = Math.max(0, ...flights.map((f) => f.position)) + 1;
        const flight: Flight = { ...input, id: randomUUID(), position };
        flights.push(flight);
        return flight;
      }),

    updateFlight: (id, input) =>
      edit((flights) => {
        const i = flights.findIndex((f) => f.id === id);
        if (i < 0) return false;
        flights[i] = { ...flights[i], ...input };
        return true;
      }),

    setFlightFlags: (id, flags) =>
      edit((flights) => {
        const flight = flights.find((f) => f.id === id);
        if (!flight) return false;
        Object.assign(flight, flags);
        return true;
      }),

    moveFlight: (id, direction) =>
      edit((flights) => {
        const i = flights.findIndex((f) => f.id === id);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= flights.length) return false;
        [flights[i], flights[j]] = [flights[j], flights[i]];
        // Renumber rather than swap two values, so flights that ever shared a position come apart.
        flights.forEach((f, k) => (f.position = k + 1));
        return true;
      }),

    deleteFlight: (id) =>
      edit((flights) => {
        const i = flights.findIndex((f) => f.id === id);
        if (i < 0) return false;
        flights.splice(i, 1);
        return true;
      }),

    async getSettings() {
      return readSettings(await readJson<unknown>(settingsFile, {}));
    },

    async saveSettings(settings: SiteSettings) {
      await writeJson(settingsFile, settings);
    },
  };
}

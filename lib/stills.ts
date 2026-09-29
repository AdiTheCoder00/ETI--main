import type { StaticImageData } from "next/image";
import highriseTowers from "@/assets/work/highrise-towers.jpg";
import hillTemple from "@/assets/work/hill-temple.jpg";
import metroHighway from "@/assets/work/metro-highway.jpg";
import metroStation from "@/assets/work/metro-station.jpg";
import nightHighway from "@/assets/work/night-highway.jpg";
import plantChimneys from "@/assets/work/plant-chimneys.jpg";
import plantConveyor from "@/assets/work/plant-conveyor.jpg";
import plantFpv from "@/assets/work/plant-fpv.jpg";
import plantStructure from "@/assets/work/plant-structure.jpg";
import riverBirds from "@/assets/work/river-birds.jpg";
import riverSunset from "@/assets/work/river-sunset.jpg";
import trainDepot from "@/assets/work/train-depot.jpg";

/**
 * The stills that ship with the site, by file name. A flight stores "plant-fpv.jpg" and gets the
 * bundled import back, with its blur placeholder and the hand-tuned sizes, instead of a plain URL.
 * Only stills uploaded from the admin are URLs. Server-side only in practice: see lib/content/shots.ts.
 */
export const BUNDLED_STILLS: Record<string, StaticImageData> = {
  "highrise-towers.jpg": highriseTowers,
  "hill-temple.jpg": hillTemple,
  "metro-highway.jpg": metroHighway,
  "metro-station.jpg": metroStation,
  "night-highway.jpg": nightHighway,
  "plant-chimneys.jpg": plantChimneys,
  "plant-conveyor.jpg": plantConveyor,
  "plant-fpv.jpg": plantFpv,
  "plant-structure.jpg": plantStructure,
  "river-birds.jpg": riverBirds,
  "river-sunset.jpg": riverSunset,
  "train-depot.jpg": trainDepot,
};

import type { StaticImageData } from "next/image";
import plantChimneys from "@/assets/work/plant-chimneys.jpg";
import metroHighway from "@/assets/work/metro-highway.jpg";
import hillTemple from "@/assets/work/hill-temple.jpg";
import plantConveyor from "@/assets/work/plant-conveyor.jpg";
import trainDepot from "@/assets/work/train-depot.jpg";
import riverBirds from "@/assets/work/river-birds.jpg";
import metroStation from "@/assets/work/metro-station.jpg";
import highriseTowers from "@/assets/work/highrise-towers.jpg";
import riverSunset from "@/assets/work/river-sunset.jpg";
import plantFpv from "@/assets/work/plant-fpv.jpg";

/** Clips live outside the repo: locally in public/media/clips, on a CDN in production. */
const clipBase = process.env.NEXT_PUBLIC_CLIPS_BASE_URL ?? "/media/clips";

export const CATEGORIES = ["Industrial", "Urban and transit", "Scenic and heritage", "Construction"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Shot = {
  title: string;
  location: string;
  category: Category;
  /** What it was flown and finished on. Straight from the job sheet, no invented specs. */
  kit: string;
  image?: StaticImageData;
  alt: string;
  /** File name in the clip store. Four of the old site's clips are gone from its server. */
  clip?: string;
  /** Wide frames take more of the horizontal reel. */
  wide?: boolean;
  note?: string;
  /** Position in the homepage reel; left out for the ones that only appear on /work. */
  reel?: number;
};

export function clipUrl(file: string) {
  return `${clipBase}/${file}`;
}

export const work: Shot[] = [
  {
    title: "Chimney stack audit",
    location: "Power station, Madhya Pradesh",
    category: "Industrial",
    kit: "Thermal and 4K",
    image: plantChimneys,
    clip: "plant-chimneys.mp4",
    alt: "Drone view down the side of a concrete chimney stack beside a river and expressway",
    wide: true,
    note: "Full-height visual and thermal pass of the stack, no scaffolding.",
    reel: 1,
  },
  {
    title: "Metro viaduct tracking",
    location: "Bengaluru",
    category: "Urban and transit",
    kit: "4K",
    image: metroHighway,
    clip: "metro-highway.mp4",
    alt: "Top-down view of a metro viaduct running above a busy highway",
    reel: 2,
  },
  {
    title: "Hill temple",
    location: "Western Ghats",
    category: "Scenic and heritage",
    kit: "6K",
    image: hillTemple,
    clip: "hill-temple.mp4",
    alt: "Aerial view of a hilltop temple roof with mountains behind",
    note: "Slow rising reveal for a heritage documentary.",
    reel: 3,
  },
  {
    title: "Conveyor line survey",
    location: "Mineral processing unit",
    category: "Industrial",
    kit: "4K",
    image: plantConveyor,
    clip: "plant-conveyor.mp4",
    alt: "Looking down on rusted conveyor housings running through overgrown ground",
    wide: true,
    reel: 4,
  },
  {
    title: "Rail yard mapping",
    location: "Northern Railway hub",
    category: "Urban and transit",
    kit: "4K",
    image: trainDepot,
    clip: "train-depot.mp4",
    alt: "Overhead view of a rail yard with long depot sheds and parallel tracks",
    reel: 5,
  },
  {
    title: "Wetland sanctuary",
    location: "Chilika Lagoon",
    category: "Scenic and heritage",
    kit: "4K, telephoto",
    image: riverBirds,
    clip: "river-birds.mp4",
    alt: "Two birds flying low over still brown water",
    reel: 6,
  },
  {
    title: "Terminal orbit",
    location: "Nagpur",
    category: "Urban and transit",
    kit: "4K",
    image: metroStation,
    clip: "metro-station.mp4",
    alt: "Transit terminal roof covered in solar panels next to a large parking lot",
    wide: true,
    reel: 7,
  },
  {
    title: "Tower progress survey",
    location: "BKC, Mumbai",
    category: "Construction",
    kit: "4K",
    image: highriseTowers,
    clip: "highrise-towers.mp4",
    alt: "Residential towers and a tower crane under an overcast sky",
    reel: 8,
  },
  {
    title: "FPV flythrough",
    location: "Steel complex, Gujarat",
    category: "Industrial",
    kit: "7-inch FPV, 6K",
    image: plantFpv,
    clip: "plant-fpv.mp4",
    alt: "FPV flight through rusted steelwork inside an industrial plant",
    reel: 9,
  },
  {
    title: "Structural steelwork survey",
    location: "Petrochem refinery",
    category: "Industrial",
    kit: "5.2K ProRes",
    clip: "plant-structure.mp4",
    alt: "Steel pipework and structural framing across a refinery seen from above",
    wide: true,
    reel: 10,
  },
  {
    title: "Expressway at night",
    location: "Delhi NCR",
    category: "Urban and transit",
    kit: "4K, night",
    clip: "night-highway.mp4",
    alt: "Expressway interchange at night with light trails from moving traffic",
    reel: 11,
  },
  {
    title: "River basin delta",
    location: "Narmada Valley",
    category: "Scenic and heritage",
    kit: "6K",
    image: riverSunset,
    clip: "river-sunset.mp4",
    alt: "Sunset over a wide river delta with green banks",
    reel: 12,
  },
];

/** The homepage reel: every flight, in reel order. */
export const shots = work
  .filter((s): s is Shot & { reel: number } => s.reel !== undefined)
  .sort((a, b) => a.reel - b.reel);

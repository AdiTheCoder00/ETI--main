#!/usr/bin/env node
/**
 * Rebuild the site's footage from the original masters.
 *
 *   npm run footage              encode everything found in footage/originals/
 *   npm run footage -- --dry     show what would happen, write nothing
 *
 * Drop each master into footage/originals/ named after its clip in lib/work.ts (plant-chimneys.mov,
 * night-highway.mp4, ...) and the hero as hero.<ext>. Any container ffmpeg reads works: ProRes .mov,
 * H.264/H.265 .mp4, .mxf. For each file this writes:
 *
 *   - the web clip: H.264 at up to 1080p (or --height), source frame rate capped at 60, no audio,
 *     faststart, into public/media/clips/ (the hero into public/media/hero.mp4 plus a new poster);
 *   - the still: the frame that best matches the still the site shows today, so every photo keeps its
 *     framing, taken from the sharpest of the frames either side, at up to 2560 px wide, into assets/work/.
 *     A flight with no still today gets its first sharp frame and is reported, so someone picks one.
 *
 * Masters must be graded. HDR (HLG/PQ) is tone-mapped to SDR; a flat log profile (D-Log, S-Log) can't be
 * detected from the file and would come out washed out.
 *
 * Needs ffmpeg and ffprobe on PATH. Options: --in <dir>, --clips <dir>, --stills <dir>, --media <dir>,
 * --height <px>, --dry.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const dry = argv.includes("--dry");
const dirs = {
  in: path.resolve(root, opt("in", "footage/originals")),
  clips: path.resolve(root, opt("clips", "public/media/clips")),
  stills: path.resolve(root, opt("stills", "assets/work")),
  media: path.resolve(root, opt("media", "public/media")),
};
const maxHeight = Number(opt("height", 1080));
const VIDEO = new Set([".mov", ".mp4", ".m4v", ".mxf", ".mkv", ".avi"]);

function run(cmd, args, { binary = false } = {}) {
  const r = spawnSync(cmd, args, { encoding: binary ? "buffer" : "utf8", maxBuffer: 1 << 30 });
  if (r.error) throw new Error(`${cmd} not found on PATH (install ffmpeg)`);
  if (r.status !== 0) throw new Error(`${cmd} failed: ${String(r.stderr).split("\n").slice(-4).join(" ").trim()}`);
  return r.stdout;
}

/** Clip names come from lib/work.ts, so this can never drift from what the site actually shows. */
function knownNames() {
  const src = readFileSync(path.join(root, "lib/work.ts"), "utf8");
  const clips = [...src.matchAll(/clip:\s*"([^"]+)\.mp4"/g)].map((m) => m[1]);
  return new Set(["hero", ...clips]);
}

function probe(file) {
  const out = JSON.parse(
    run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
      "stream=width,height,r_frame_rate,color_transfer,nb_frames:format=duration", "-of", "json", file]),
  );
  const s = out.streams[0];
  const [n, d] = s.r_frame_rate.split("/").map(Number);
  return { width: s.width, height: s.height, fps: n / (d || 1), duration: Number(out.format.duration), transfer: s.color_transfer ?? "" };
}

const isHdr = (p) => p.transfer === "arib-std-b67" || p.transfer === "smpte2084";
const TONEMAP = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv";

/** Filters shared by the encode and the still: SDR, and 16:9 by centre crop if the master is wider (DCI 4K). */
function baseFilters(p) {
  const f = [];
  if (isHdr(p)) f.push(TONEMAP);
  if (p.width / p.height > 16 / 9 + 0.01) f.push("crop=trunc(ih*16/9/2)*2:ih");
  return f;
}

const kbps = (rate) => parseFloat(rate) * (rate.endsWith("M") ? 1000 : 1);

function encode(file, p, out, { hero }) {
  const h = Math.min(maxHeight, p.height);
  const vf = [...baseFilters(p), `scale=-2:${h}:flags=lanczos`];
  if (p.fps > 60.5) vf.push("fps=60");
  vf.push("format=yuv420p");
  // Quality-led, with a ceiling so a noisy FPV run can't balloon (grain is expensive and invisible at
  // web sizes). The hero loads on every visit, so it gets a tighter one.
  const [crf, maxrate] = hero ? ["23", "4500k"] : ["23", "6M"];
  run("ffmpeg", ["-v", "error", "-y", "-i", file, "-an", "-vf", vf.join(","), "-c:v", "libx264", "-preset", "slow",
    "-crf", crf, "-maxrate", maxrate, "-bufsize", `${kbps(maxrate) * 2}k`, "-profile:v", "high",
    "-movflags", "+faststart", out]);
}

/** Grayscale frames at 128x72, one Float32Array each, for matching against today's still. */
function thumbs(file, p) {
  const vf = [...baseFilters(p), "scale=128:72", "format=gray"].join(",");
  const raw = run("ffmpeg", ["-v", "error", "-i", file, "-vf", vf, "-f", "rawvideo", "-"], { binary: true });
  const size = 128 * 72;
  const frames = [];
  for (let o = 0; o + size <= raw.length; o += size) frames.push(normalise(raw.subarray(o, o + size)));
  return frames;
}

function stillThumb(jpg) {
  return normalise(run("ffmpeg", ["-v", "error", "-i", jpg, "-vf", "scale=128:72,format=gray", "-f", "rawvideo", "-"], { binary: true }));
}

/**
 * Each thumbnail normalised to zero mean and unit spread before comparing: a JPEG still and a decoded
 * video frame use different luma ranges, and in a low-contrast shot that offset alone moved the match.
 */
function normalise(buf) {
  let sum = 0, sum2 = 0;
  for (const v of buf) {
    sum += v;
    sum2 += v * v;
  }
  const mean = sum / buf.length;
  const sd = Math.sqrt(Math.max(1e-6, sum2 / buf.length - mean * mean));
  return Float32Array.from(buf, (v) => (v - mean) / sd);
}

function mse(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s / a.length;
}

/** Laplacian variance at 1280 wide: higher is sharper. Used to dodge motion blur around the match. */
function sharpness(file, p, t, count) {
  const vf = [...baseFilters(p), "scale=1280:-2", "format=gray"].join(",");
  const raw = run("ffmpeg", ["-v", "error", "-ss", String(Math.max(0, t)), "-i", file, "-frames:v", String(count), "-vf", vf, "-f", "rawvideo", "-"], { binary: true });
  const w = 1280;
  const h = Math.round((1280 * 9) / 16 / 2) * 2;
  const size = w * h;
  const scores = [];
  for (let o = 0; o + size <= raw.length; o += size) {
    const f = raw.subarray(o, o + size);
    let sum = 0, sum2 = 0, n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const v = 4 * f[i] - f[i - 1] - f[i + 1] - f[i - w] - f[i + w];
        sum += v;
        sum2 += v * v;
        n++;
      }
    }
    scores.push(sum2 / n - (sum / n) ** 2);
  }
  return scores;
}

function cutStill(file, p, name, report) {
  const target = path.join(dirs.stills, `${name}.jpg`);
  let at = 0.5; // no still today: start near the top of the clip
  let how = "no still before, first sharp frame (pick a better one if needed)";
  if (existsSync(target)) {
    const ref = stillThumb(target);
    const frames = thumbs(file, p);
    let best = 0, bestErr = Infinity, total = 0;
    frames.forEach((f, i) => {
      const e = mse(f, ref);
      total += e;
      if (e < bestErr) [best, bestErr] = [i, e];
    });
    const rmse = Math.sqrt(bestErr);
    const typical = Math.sqrt(total / frames.length);
    at = best / p.fps;
    how = `matched today's still at ${at.toFixed(2)}s (difference ${rmse.toFixed(2)}, typical frame ${typical.toFixed(2)})`;
    // Nothing in this master looks like today's still: a different take or edit. Don't guess.
    if (rmse > typical * 0.35) {
      report.push(`  ! ${name}: no frame matches the current still (best ${rmse.toFixed(2)} vs typical ${typical.toFixed(2)}); still left as it is`);
      return;
    }
  }
  const span = Math.round(p.fps / 20); // a twentieth of a second either side
  const start = Math.max(0, at - span / p.fps);
  const scores = sharpness(file, p, start, span * 2 + 1);
  const k = scores.indexOf(Math.max(...scores));
  const t = start + k / p.fps;
  const w = Math.min(2560, Math.round((Math.min(p.height, p.width * 9 / 16) * 16) / 9));
  const vf = [...baseFilters(p), `scale=${w}:-2:flags=lanczos`].join(",");
  if (!dry) run("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", vf, "-q:v", "2", target]);
  report.push(`  still ${name}.jpg ${w}px wide: ${how}`);
}

/** Project-relative inside the project, absolute outside it. */
function show(p) {
  const r = path.relative(root, p);
  return r.startsWith("..") || path.isAbsolute(r) ? p : r;
}

function mb(file) {
  return (statSync(file).size / 1048576).toFixed(1) + " MB";
}

function main() {
  if (!existsSync(dirs.in)) {
    console.log(`Nothing to do: put the masters in ${path.relative(root, dirs.in)}/ (see the top of this script).`);
    return;
  }
  const names = knownNames();
  const files = readdirSync(dirs.in).filter((f) => VIDEO.has(path.extname(f).toLowerCase()));
  if (!files.length) return console.log(`No video files in ${path.relative(root, dirs.in)}/.`);
  for (const d of [dirs.clips, dirs.stills, dirs.media]) mkdirSync(d, { recursive: true });

  const report = [];
  for (const f of files) {
    const name = path.basename(f, path.extname(f));
    if (!names.has(name)) {
      report.push(`- ${f}: skipped, not a clip name in lib/work.ts or "hero" (expected one of: ${[...names].join(", ")})`);
      continue;
    }
    const file = path.join(dirs.in, f);
    const p = probe(file);
    const hero = name === "hero";
    const out = hero ? path.join(dirs.media, "hero.mp4") : path.join(dirs.clips, `${name}.mp4`);
    report.push(`- ${f}: ${p.width}x${p.height} at ${p.fps.toFixed(2)} fps, ${p.duration.toFixed(1)}s${isHdr(p) ? ", HDR, tone-mapped to SDR" : ""}`);
    if (p.height <= 720) report.push(`  ! only ${p.height}p: no sharper than what the site has now`);
    if (dry) {
      report.push(`  would write ${show(out)} at ${Math.min(maxHeight, p.height)}p`);
      continue;
    }
    process.stdout.write(`encoding ${f} ...\n`);
    encode(file, p, out, { hero });
    report.push(`  clip ${show(out)}: ${mb(out)}`);
    if (hero) {
      const poster = path.join(dirs.media, "hero-poster.jpg");
      run("ffmpeg", ["-v", "error", "-y", "-i", out, "-frames:v", "1", "-q:v", "4", poster]);
      report.push(`  poster ${show(poster)}: ${mb(poster)}`);
      if (statSync(out).size > 8 * 1048576) report.push("  ! hero is over 8 MB: host it on a CDN and set NEXT_PUBLIC_HERO_VIDEO_URL");
    } else {
      cutStill(file, p, name, report);
    }
  }
  console.log("\n" + report.join("\n"));
  if (!dry) console.log("\nClips in public/media/clips/ are gitignored: upload them to the CDN behind NEXT_PUBLIC_CLIPS_BASE_URL.");
}

main();

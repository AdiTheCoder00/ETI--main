export type DroneSound = {
  /** power: how hard the rotors work (0-1). near: how close the drone is to the viewer (0-1). */
  set(power: number, near: number): void;
  stop(): void;
};

/**
 * The loader's rotors, synthesised rather than sampled: detuned saws for the motors, band-passed
 * noise for the wash, and a tremolo for the blade chop. It is driven from the same frame loop as
 * the flight, so the pitch and brightness follow the drone instead of running on their own clock.
 *
 * It starts itself where the browser allows it and otherwise waits for the first gesture: audio
 * that has never been interacted with is suspended by autoplay policy, and nothing can change that.
 */
export function createDroneSound(): DroneSound | null {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // blade chop: everything passes through a tremolo
  const chop = ctx.createGain();
  chop.gain.value = 0.8;
  chop.connect(master);
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 20;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.2;
  lfo.connect(lfoDepth).connect(chop.gain);
  lfo.start();

  // rotor wash
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const wash = ctx.createBiquadFilter();
  wash.type = "bandpass";
  wash.frequency.value = 1500;
  wash.Q.value = 0.6;
  const washGain = ctx.createGain();
  washGain.gain.value = 0.28;
  noise.connect(wash).connect(washGain).connect(chop);
  noise.start();

  // motors
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const toneGain = ctx.createGain();
  toneGain.gain.value = 0.14;
  lp.connect(toneGain).connect(chop);
  const ratios = [1, 1.01, 1.49, 2.02];
  const oscs = ratios.map((r) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 94 * r;
    o.connect(lp);
    o.start();
    return o;
  });

  // Autoplay policy: a context that has never seen a gesture starts suspended. Take the first one.
  const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;
  // resume() rejects if the context is closed before it settles (the loader ended first); that is fine.
  const resume = () => void ctx.resume().catch(() => {});
  if (ctx.state === "suspended") {
    resume();
    GESTURES.forEach((e) => window.addEventListener(e, resume, { once: true, capture: true }));
  }

  let stopped = false;
  let lastP = -1;
  let lastN = -1;
  const ease = (p: AudioParam, v: number) => p.setTargetAtTime(v, ctx.currentTime, 0.08);

  return {
    set(power, near) {
      if (stopped) return;
      const p = Math.min(1, Math.max(0, power));
      const n = Math.min(1, Math.max(0, near));
      // Called every frame: skip changes too small to hear, rather than queue ~8 automation events a frame.
      if (Math.abs(p - lastP) < 0.004 && Math.abs(n - lastN) < 0.004) return;
      lastP = p;
      lastN = n;
      ease(master.gain, 0.3 * p);
      ease(lp.frequency, 800 + 1600 * n);
      ease(wash.frequency, 1200 + 900 * n);
      ease(lfo.frequency, 18 + 12 * p);
      for (let i = 0; i < oscs.length; i++) ease(oscs[i].frequency, 94 * ratios[i] * (0.8 + 0.45 * p));
    },
    stop() {
      if (stopped) return;
      stopped = true;
      GESTURES.forEach((e) => window.removeEventListener(e, resume, { capture: true }));
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      window.setTimeout(() => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        noise.stop();
        void ctx.close().catch(() => {});
      }, 500);
    },
  };
}

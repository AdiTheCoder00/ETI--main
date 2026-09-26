/**
 * Loader flight model. GSAP moves an invisible *target*; the drone chases it with a
 * damped spring, and its tilt comes from its own acceleration (tilt = atan(a / g)),
 * like a real quadcopter. That keeps position, lean and settle in one continuous
 * motion instead of several tweens handing over to each other.
 */

/**
 * Target, animated by GSAP. x/y are px from centre; z is depth toward the viewer in the
 * same px-equivalent units (converted with the 3D view's world-per-px scale). drift
 * scales the hover wobble, gimbal is the camera's upward tilt in degrees, and track
 * (0 to 1) is how much the view camera aims at the lens instead of the centre.
 */
export type Target = { x: number; y: number; z: number; yaw: number; sh: number; k: number; drift: number; gimbal: number; track: number };

/** Simulated drone state. */
export type Sim = {
  x: number; y: number; z: number; vx: number; vy: number; vz: number; ax: number; ay: number; az: number;
  yaw: number; vyaw: number; pitch: number; pitchZ: number; roll: number; t: number;
};

export function createFlight(vw: number, vh: number) {
  const tgt: Target = { x: -vw * 0.72, y: vh * 0.06, z: 0, yaw: 0, sh: 0, k: 26, drift: 1, gimbal: 0, track: 0 };
  const sim: Sim = {
    x: tgt.x, y: tgt.y, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0,
    yaw: 0, vyaw: 0, pitch: 0, pitchZ: 0, roll: 0, t: 0,
  };
  return { tgt, sim };
}

export function step(sim: Sim, tgt: Target, dt: number) {
  // sub-step for stability at low frame rates
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    sim.t += h;
    // gentle hover drift so it never looks parked
    const nx = (Math.sin(sim.t * 0.9) * 6 + Math.sin(sim.t * 2.3) * 2) * tgt.drift;
    const ny = (Math.sin(sim.t * 1.3) * 5 + Math.sin(sim.t * 3.1) * 1.5) * tgt.drift;
    const k = tgt.k;
    const c = 1.6 * Math.sqrt(k); // spring stiffness; damping ratio 0.8 = slight, soft overshoot
    const ax = k * (tgt.x + nx - sim.x) - c * sim.vx;
    const ay = k * (tgt.y + ny - sim.y) - c * sim.vy;
    const az = k * (tgt.z - sim.z) - c * sim.vz;
    sim.vx += ax * h;
    sim.vy += ay * h;
    sim.vz += az * h;
    sim.x += sim.vx * h;
    sim.y += sim.vy * h;
    sim.z += sim.vz * h;
    // smooth the acceleration we lean into (a drone can't snap its attitude)
    const f = 1 - Math.exp(-h * 9);
    sim.ax += (ax - sim.ax) * f;
    sim.ay += (ay - sim.ay) * f;
    sim.az += (az - sim.az) * f;
    // heading spring
    const ay2 = 30 * (tgt.yaw - sim.yaw) - 9 * sim.vyaw;
    sim.vyaw += ay2 * h;
    sim.yaw += sim.vyaw * h;
  }
  const g = 6500; // tunes how far it leans for a given acceleration
  sim.pitch = 26 * Math.tanh(sim.ax / g); // lean toward horizontal acceleration, soft-limited
  sim.pitchZ = 26 * Math.tanh(sim.az / g); // same, for flying toward or away from the viewer
  sim.roll = Math.max(-10, Math.min(10, -sim.vyaw * 1.2)); // bank slightly while turning
}

export type DroneView = {
  render: (dt: number) => void;
  dispose: () => void;
  /** 3D only: where the lens glass is on screen (CSS px within the stage) and its radius. */
  lens?: () => { x: number; y: number; r: number };
  /** 3D only: target y/z (px units) that parks the lens on the camera axis, close enough to look `radiusPx` wide. */
  approach?: (radiusPx: number) => { y: number; z: number };
};

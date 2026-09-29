/**
 * Procedural three.js quadcopter for the loader. three is pinned to r149 (the version
 * the prototype was tuned on): later releases changed light units and removed
 * PCFSoftShadowMap, which visibly changes the look. Upgrade deliberately, comparing
 * frames, if you ever do.
 */
import * as THREE from "three";
import type { DroneView, Sim, Target } from "./flight";

function blurTexture() {
  // motion-blurred two-blade prop: soft smears trailing each blade + a faint orange tip ring.
  // Light smears: the loader is always on black, where ink-coloured ones vanished and left bare rings.
  const s = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  const c = s / 2;
  g.translate(c, c);
  for (let b = 0; b < 2; b++) {
    for (let i = 0; i < 40; i++) {
      const a0 = b * Math.PI - i * 0.035;
      const alpha = 0.16 * Math.pow(1 - i / 40, 2);
      g.strokeStyle = `rgba(238,234,225,${alpha})`;
      g.lineWidth = 12 - i * 0.2;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(Math.cos(a0) * 14, Math.sin(a0) * 14);
      g.lineTo(Math.cos(a0) * (c - 8), Math.sin(a0) * (c - 8));
      g.stroke();
    }
  }
  g.strokeStyle = "rgba(238,234,225,0.07)";
  g.lineWidth = c - 16;
  g.beginPath();
  g.arc(0, 0, (c - 8) / 2 + 4, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "rgba(194,65,12,0.35)";
  g.lineWidth = 5;
  g.beginPath();
  g.arc(0, 0, c - 12, 0, Math.PI * 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

// Camera placement, shared with the flight plan so the drone can turn to look into it.
const CAMERA = { y: 2.4, z: 11 };

/** Heading and gimbal tilt (degrees) that point the drone's lens straight at the viewer. */
export const FACING_VIEWER = { yaw: -90, gimbal: (Math.atan2(CAMERA.y, CAMERA.z) * 180) / Math.PI };

/** Returns null when WebGL isn't available, so the caller can use the SVG fallback. */
export function initDrone3D(stage: HTMLElement, sim: Sim, tgt: Target): DroneView | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  THREE.ColorManagement.legacyMode = false;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const device = navigator as Navigator & { deviceMemory?: number };
  const constrained = (device.hardwareConcurrency ?? 8) <= 4 || (device.deviceMemory ?? 8) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, constrained ? 1 : 1.35));
  renderer.shadowMap.enabled = !constrained;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = !constrained;
  renderer.setClearColor(0x000000, 0);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const FOV = 30;
  // near plane is tight because the exit flies the lens right up to the camera
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);
  camera.position.set(0, CAMERA.y, CAMERA.z);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbdb6a6, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(3, 9, 5);
  key.castShadow = !constrained;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera;
  sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 30;
  key.shadow.bias = -0.0006;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9bf, 0.9);
  rim.position.set(-5, 3, -6);
  scene.add(rim);

  const groundMat = new THREE.ShadowMaterial({ opacity: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !constrained;
  scene.add(ground);

  const M = {
    shell: new THREE.MeshStandardMaterial({ color: 0x2b2a26, roughness: 0.42, metalness: 0.15 }),
    cover: new THREE.MeshStandardMaterial({ color: 0xdcd6ca, roughness: 0.5, metalness: 0.05 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x151411, roughness: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8d8a81, roughness: 0.28, metalness: 0.85 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x07121a, roughness: 0.12, metalness: 0.88 }),
    led: new THREE.MeshBasicMaterial({ color: 0xff6a2a }),
    blur: new THREE.MeshBasicMaterial({ map: blurTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  };

  function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, noShadow = false) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = !noShadow;
    return m;
  }
  function rrect(w: number, d: number, r: number) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(w: number, d: number, r: number, h: number, bevel: number) {
    const g = new THREE.ExtrudeGeometry(rrect(w, d, r), {
      depth: h, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -h / 2, 0);
    return g;
  }
  function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = mesh(new THREE.CylinderGeometry(r, r * 1.15, len, 16), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  }

  const model = new THREE.Group();
  model.add(mesh(slab(1.15, 0.62, 0.22, 0.2, 0.06), M.shell));
  model.add(mesh(slab(0.78, 0.44, 0.16, 0.05, 0.03), M.cover, -0.04, 0.15, 0));
  model.add(mesh(new THREE.BoxGeometry(0.04, 0.07, 0.34), M.dark, 0.66, 0.02, 0));
  model.add(mesh(new THREE.SphereGeometry(0.032, 12, 8), M.led, -0.64, 0.03, 0.2, true));
  model.add(mesh(new THREE.SphereGeometry(0.032, 12, 8), M.led, -0.64, 0.03, -0.2, true));

  const motorPos = [[0.95, 0.8], [0.95, -0.8], [-0.95, 0.8], [-0.95, -0.8]];
  const rotors: THREE.Group[] = [];
  const discGeo = new THREE.CircleGeometry(0.64, 64);
  motorPos.forEach((p, i) => {
    const sx = Math.sign(p[0]), sz = Math.sign(p[1]);
    model.add(rod(new THREE.Vector3(sx * 0.35, 0.02, sz * 0.2), new THREE.Vector3(p[0], 0.04, p[1]), 0.045, M.shell));
    model.add(mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.17, 28), M.shell, p[0], 0.08, p[1]));
    model.add(mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 24), M.metal, p[0], 0.19, p[1]));
    const ring = mesh(new THREE.TorusGeometry(0.115, 0.02, 10, 32), M.accent, p[0], 0.0, p[1]);
    ring.rotation.x = Math.PI / 2;
    model.add(ring);

    // spinning prop = hub + motion-blur disc (no hard blades, so no strobing)
    const rotor = new THREE.Group();
    rotor.position.set(p[0], 0.235, p[1]);
    rotor.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), M.metal));
    const disc = mesh(discGeo, M.blur, 0, 0.01, 0, true);
    disc.rotation.x = -Math.PI / 2;
    rotor.add(disc);
    rotor.rotation.y = i * 1.3;
    rotor.userData.dir = i === 0 || i === 3 ? 1 : -1;
    model.add(rotor);
    rotors.push(rotor);
  });

  [-1, 1].forEach((sz) => {
    model.add(rod(new THREE.Vector3(0.24, -0.12, sz * 0.22), new THREE.Vector3(0.3, -0.52, sz * 0.3), 0.024, M.dark));
    model.add(rod(new THREE.Vector3(-0.24, -0.12, sz * 0.22), new THREE.Vector3(-0.3, -0.52, sz * 0.3), 0.024, M.dark));
    const skid = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 16), M.dark, 0, -0.54, sz * 0.3);
    skid.rotation.z = Math.PI / 2;
    model.add(skid);
  });

  model.add(mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), M.dark, 0.42, -0.17, 0));
  const gimbal = new THREE.Group();
  gimbal.position.set(0.45, -0.31, 0);
  model.add(gimbal);
  gimbal.add(mesh(new THREE.SphereGeometry(0.14, 28, 20), M.shell));
  const lens = mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.07, 28), M.glass, 0.13, 0, 0);
  lens.rotation.z = Math.PI / 2;
  gimbal.add(lens);
  const lensGlass = new THREE.MeshBasicMaterial({ color: 0x1d4257, transparent: true, opacity: 0.34, depthWrite: false });
  const lensSurface = mesh(new THREE.CircleGeometry(0.066, 32), lensGlass, 0.167, 0, 0, true);
  lensSurface.rotation.y = Math.PI / 2;
  gimbal.add(lensSurface);
  const lensGlint = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, depthWrite: false });
  const glint = mesh(new THREE.CircleGeometry(0.012, 16), lensGlint, 0.169, 0.022, -0.018, true);
  glint.rotation.y = Math.PI / 2;
  gimbal.add(glint);
  const lensRing = mesh(new THREE.TorusGeometry(0.082, 0.013, 10, 32), M.accent, 0.165, 0, 0);
  lensRing.rotation.y = Math.PI / 2;
  gimbal.add(lensRing);

  const root = new THREE.Group(), yawG = new THREE.Group(), tiltG = new THREE.Group();
  tiltG.add(model);
  yawG.add(tiltG);
  root.add(yawG);
  scene.add(root);

  let worldPerPx = 0.01;
  let S = 1;
  let H = 1;
  function resize() {
    const W = stage.clientWidth || window.innerWidth;
    H = stage.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const d = camera.position.length();
    worldPerPx = (2 * d * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / H;
    const wantPx = Math.min(460, Math.max(230, W * (W < 700 ? 0.62 : 0.3)));
    S = (wantPx * worldPerPx) / 3.1;
    model.scale.setScalar(S);
    ground.position.y = -S * 1.75;
  }
  resize();
  window.addEventListener("resize", resize);

  const D2R = Math.PI / 180;
  const look = new THREE.Vector3();
  function render(dt: number) {
    root.position.set(sim.x * worldPerPx, -sim.y * worldPerPx, sim.z * worldPerPx);
    // heading, then lean in the direction of travel (pitch about local z, roll about local x)
    yawG.rotation.y = sim.yaw * D2R;
    const h = sim.yaw * D2R, ch = Math.cos(h), sh = Math.sin(h);
    // world-frame lean (about world z for x acceleration, about world x for z acceleration),
    // expressed in the drone's local frame so it always tilts toward where it's accelerating
    const lz = -sim.pitch * D2R;
    const lx = sim.pitchZ * D2R;
    tiltG.rotation.z = lx * sh + lz * ch;
    tiltG.rotation.x = lx * ch - lz * sh + sim.roll * D2R;
    // Camera gimbal stays level, like the real thing, with a small stabilising correction until it locks on.
    gimbal.rotation.z = -tiltG.rotation.z + tgt.gimbal * D2R;
    const stabilising = 1 - tgt.track;
    gimbal.rotation.x = Math.sin(sim.t * 1.7) * 0.018 * stabilising;
    gimbal.rotation.y = Math.sin(sim.t * 1.15 + 0.8) * 0.026 * stabilising;
    lensGlass.opacity = 0.28 + Math.sin(sim.t * 1.2) * 0.05;
    lensGlint.opacity = 0.09 + (Math.sin(sim.t * 1.5) + 1) * 0.035;
    for (const r of rotors) r.rotation.y += r.userData.dir * 9 * dt;
    M.led.color.setHex(sim.t % 1 < 0.5 ? 0xff6a2a : 0x3a1a0c);
    groundMat.opacity = 0.2 * tgt.sh;
    // during the fly-in the camera eases its aim onto the lens, so the lens stays centred
    // however the drone leans while it brakes
    if (tgt.track > 0) {
      root.updateMatrixWorld(true);
      lensRing.getWorldPosition(look);
      camera.lookAt(look.multiplyScalar(tgt.track));
    }
    renderer.render(scene, camera);
  }

  const LENS_R = 0.075; // glass radius in model units
  const tmp = new THREE.Vector3();
  const rel = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  // Called every frame of the exit: reuses one result object instead of allocating. Read it, don't keep it.
  const onScreen = { x: 0, y: 0, r: 0 };
  function lensOnScreen() {
    lensRing.getWorldPosition(tmp);
    camera.getWorldDirection(fwd);
    const depth = Math.max(camera.near, rel.subVectors(tmp, camera.position).dot(fwd));
    onScreen.r = ((LENS_R * S) / (2 * depth * tanHalfFov)) * H;
    tmp.project(camera);
    onScreen.x = ((tmp.x + 1) / 2) * H * camera.aspect;
    onScreen.y = ((1 - tmp.y) / 2) * H;
    return onScreen;
  }

  function approach(radiusPx: number) {
    // camera-to-lens distance at which the glass looks radiusPx wide
    const distance = (LENS_R * S * H) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * radiusPx);
    // lens centre relative to the drone root when it faces the camera (yaw -90) with the gimbal
    // tilted up at it: model +x maps to world +z, so the offset is (0, y, x) in model units
    const up = Math.atan2(camera.position.y, camera.position.z);
    const lx = 0.45 + 0.165 * Math.cos(up);
    const ly = -0.31 + 0.165 * Math.sin(up);
    const axis = camera.position.clone().normalize();
    const end = camera.position.clone().addScaledVector(axis, -distance);
    const rootY = end.y - ly * S;
    const rootZ = end.z - lx * S;
    return { y: -rootY / worldPerPx, z: rootZ / worldPerPx };
  }

  function dispose() {
    window.removeEventListener("resize", resize);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    M.blur.map?.dispose();
    lensGlass.dispose();
    lensGlint.dispose();
    Object.values(M).forEach((m) => m.dispose());
    groundMat.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  // compile shaders now, before anything moves, so the first flying frames don't hitch
  renderer.compile(scene, camera);
  render(0);
  return { render, dispose, lens: lensOnScreen, approach };
}

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.getElementById('hero-canvas');
const hero = document.querySelector('.hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 760px)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  hero.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0.2, 11);

// Backdrop lives inside WebGL so the glass has something to refract.
const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
  depthWrite: false,
  uniforms: { uFlip: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */`
    varying vec2 vUv; uniform float uFlip;
    void main() {
      vec3 ink = vec3(0.110, 0.039, 0.149);
      vec3 plum = vec3(0.23, 0.08, 0.31);
      vec3 glow = vec3(0.49, 0.23, 0.64);
      vec2 c = vec2(mix(0.7, 0.3, uFlip), 0.52);
      float g = smoothstep(0.75, 0.0, length((vUv - c) * vec2(1.5, 1.0)));
      float floor_ = smoothstep(0.55, 0.0, vUv.y) * 0.6;
      vec3 col = mix(ink, plum, floor_);
      col = mix(col, glow, g * 0.75);
      col += vec3(0.9, 0.5, 0.75) * smoothstep(0.5, 0.0, length(vUv - vec2(1.0 - c.x, 0.85))) * 0.05;
      gl_FragColor = vec4(col, 1.0);
    }`,
}));
backdrop.position.z = -7;
backdrop.renderOrder = -1;
scene.add(backdrop);

// Lights shape the glass edges; the environment does most of the work.
const key = new THREE.DirectionalLight('#ffe9d6', 2.2); key.position.set(-4, 6, 6); scene.add(key);
const rim = new THREE.PointLight('#b57bff', 40, 20); rim.position.set(4, 2, -3); scene.add(rim);
const fill = new THREE.PointLight('#ff9ad5', 18, 16); fill.position.set(-5, -2, 3); scene.add(fill);

/* ---------- materials ---------- */
const glass = (tint, att, dist = 1.4) => new THREE.MeshPhysicalMaterial({
  color: tint, transmission: 1, roughness: 0.04, thickness: 0.9, ior: 1.5,
  attenuationColor: att, attenuationDistance: dist, clearcoat: 1, clearcoatRoughness: 0.05,
  specularIntensity: 1, envMapIntensity: 1.4, side: THREE.DoubleSide,
});
const liquid = (c, e) => new THREE.MeshPhysicalMaterial({
  color: c, emissive: e, emissiveIntensity: 0.35, roughness: 0.18, metalness: 0,
  clearcoat: 1, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.4,
});
const gold = new THREE.MeshPhysicalMaterial({ color: '#d9b26b', metalness: 1, roughness: 0.22, clearcoat: 0.6 });
const lacquer = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.16, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });

function labelTexture(lines, { w = 512, h = 256, color = '#fff', font = 'Marcellus', frame = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (frame) { g.strokeStyle = color; g.globalAlpha = 0.7; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28); g.globalAlpha = 1; }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([text, size, y, spacing = 0]) => {
    g.font = `${size}px ${font}, Georgia, serif`;
    if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
    g.fillText(text, w / 2, y);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ---------- bottles ---------- */
// The Violet bottle follows the store's own logo: chamfered square flacon, octagonal stopper.
function violetBottle() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.55, 1.9, 0.72, 5, 0.16), glass('#ffffff', '#b58ae0', 2.6));
  g.add(body);
  const juice = new THREE.Mesh(new RoundedBoxGeometry(1.32, 1.05, 0.52, 4, 0.12), liquid('#8a3fd1', '#3a0f66'));
  juice.position.y = -0.36; g.add(juice);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.5),
    new THREE.MeshBasicMaterial({ transparent: true, map: labelTexture([['VIOLET', 118, 128, 14]]), toneMapped: false }));
  label.position.set(0, 0.05, 0.365); g.add(label);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.28, 32), gold);
  neck.position.y = 1.08; g.add(neck);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 16, 48), gold);
  collar.rotation.x = Math.PI / 2; collar.position.y = 1.22; g.add(collar);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.42, 8, 1), lacquer('#4b1a6b'));
  cap.rotation.y = Math.PI / 8; cap.scale.z = 0.62; cap.position.y = 1.5; g.add(cap);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.06, 8), gold);
  capTop.rotation.y = Math.PI / 8; capTop.scale.z = 0.62; capTop.position.y = 1.74; g.add(capTop);
  g.userData.nozzle = new THREE.Vector3(0, 1.22, 0.25);
  return g;
}

// A round flacon with rose juice and a gold ball stopper.
function roundBottle() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = -Math.PI / 2 + t * Math.PI * 0.92;
    pts.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * 0.95), Math.sin(a) * 0.9));
  }
  pts.push(new THREE.Vector2(0.2, 0.98), new THREE.Vector2(0.2, 1.1));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), glass('#ffffff', '#ff9ccb', 2.6));
  g.add(body);
  const juice = new THREE.Mesh(new THREE.SphereGeometry(0.78, 48, 32, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.68), liquid('#ff6fb1', '#6b0f3a'));
  juice.position.y = -0.04; g.add(juice);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.7, 48), liquid('#ff8cc2', '#6b0f3a'));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.36; g.add(disc);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 32), gold); neck.position.y = 1.14; g.add(neck);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 32), gold); ball.position.y = 1.5; ball.scale.y = 0.9; g.add(ball);
  g.userData.nozzle = new THREE.Vector3(0, 1.16, 0.2);
  return g;
}

// A tall column of midnight glass with a black cap.
function tallBottle() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.3, 6, 1), glass('#ffffff', '#8ea2ff', 2.2));
  body.rotation.y = Math.PI / 6; g.add(body);
  const juice = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.35, 6, 1), liquid('#2f4fd6', '#0a1350'));
  juice.rotation.y = Math.PI / 6; juice.position.y = -0.4; g.add(juice);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36),
    new THREE.MeshBasicMaterial({ transparent: true, map: labelTexture([['NUIT', 110, 110, 18], ['DAMASCUS', 38, 190, 10]], { w: 512, h: 300, frame: false }), toneMapped: false }));
  label.position.set(0, 0.25, 0.44); g.add(label);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 32), gold); ring.position.y = 1.22; g.add(ring);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.62, 48), lacquer('#101018')); cap.position.y = 1.6; g.add(cap);
  g.userData.nozzle = new THREE.Vector3(0, 1.24, 0.24);
  return g;
}

const stage = new THREE.Group(); scene.add(stage);
const bottles = [
  { mesh: violetBottle(), home: new THREE.Vector3(0, 0.05, 0.6), scale: 1.12, dir: new THREE.Vector3(0.55, 0.75, 0.7), color: 0 },
  { mesh: roundBottle(), home: new THREE.Vector3(-2.4, -0.55, -0.4), scale: 0.95, dir: new THREE.Vector3(-0.35, 0.9, 0.6), color: 1 },
  { mesh: tallBottle(), home: new THREE.Vector3(2.2, -0.2, -0.9), scale: 0.95, dir: new THREE.Vector3(0.75, 0.55, 0.6), color: 2 },
];
bottles.forEach((b, i) => {
  b.mesh.scale.setScalar(b.scale);
  b.mesh.position.copy(b.home);
  b.phase = i * 2.1;
  b.spin = 0;
  b.mesh.traverse((o) => { if (o.isMesh) o.userData.bottle = b; });
  stage.add(b.mesh);
});

/* ---------- mist ---------- */
const COUNT = reduced ? 1800 : small ? 3500 : 8000;
const pos = new Float32Array(COUNT * 3);
const vel = new Float32Array(COUNT * 3);
const life = new Float32Array(COUNT);    // seconds remaining
const maxLife = new Float32Array(COUNT);
const col = new Float32Array(COUNT * 3);
const size = new Float32Array(COUNT);
const alpha = new Float32Array(COUNT);
const amul = new Float32Array(COUNT);  // haze is fainter than a fresh spray
const grow = new Float32Array(COUNT);
const PALETTE = [
  [new THREE.Color('#a86bf5'), new THREE.Color('#e2c8ff')],
  [new THREE.Color('#ff6fbf'), new THREE.Color('#ffc6e4')],
  [new THREE.Color('#7f95ff'), new THREE.Color('#e8cf95')],
];
const HAZE = [new THREE.Color('#b58cf0'), new THREE.Color('#e7c9ff'), new THREE.Color('#e3c28a')];

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));

const mistMat = new THREE.ShaderMaterial({
  // Normal (not additive) blending: dense spray thickens toward the mist colour but can never clip to white,
  // which it did on phones where hundreds of droplets overlap in a few pixels.
  transparent: true, depthWrite: false, blending: THREE.NormalBlending, premultipliedAlpha: true,
  uniforms: { uScale: { value: 1 } },
  vertexShader: /* glsl */`
    attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
    varying vec3 vColor; varying float vAlpha;
    uniform float uScale;
    void main() {
      vColor = aColor; vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uScale / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vColor; varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float soft = exp(-d * d * 3.2) * (1.0 - smoothstep(0.85, 1.0, d));
      gl_FragColor = vec4(vColor * soft * vAlpha, soft * vAlpha);
    }`,
});
const mist = new THREE.Points(geo, mistMat);
mist.frustumCulled = false;
scene.add(mist);

let cursor = 0;
const tmp = new THREE.Vector3();
function spawn(p, v, lifeS, s, c, a = 0.2, gr = 9) {
  const i = cursor; cursor = (cursor + 1) % COUNT;
  pos.set([p.x, p.y, p.z], i * 3);
  vel.set([v.x, v.y, v.z], i * 3);
  life[i] = maxLife[i] = lifeS;
  size[i] = s; amul[i] = a; grow[i] = gr;
  col.set([c.r, c.g, c.b], i * 3);
}

// Scene bounds at z=0 for haze placement, refreshed on resize.
const view = { w: 10, h: 6 };

function spawnHaze(n) {
  for (let k = 0; k < n; k++) {
    tmp.set((Math.random() - 0.5) * view.w * 1.1, (Math.random() - 0.5) * view.h * 1.1, (Math.random() - 0.5) * 4 - 1);
    const c = HAZE[(Math.random() * HAZE.length) | 0];
    spawn(tmp, new THREE.Vector3((Math.random() - 0.5) * 0.1, Math.random() * 0.08, 0), 6 + Math.random() * 8, 18 + Math.random() * 40, c, 0.07, 1.5);
  }
}

const sprayQueue = [];
function spray(b, strength = 1, towards = null) {
  const origin = b.mesh.localToWorld(b.mesh.userData.nozzle.clone());
  const dir = towards ? towards.clone().sub(origin).normalize() : b.dir.clone().normalize();
  sprayQueue.push({ origin, dir, left: Math.round(420 * strength * (COUNT / 8000)), rate: 2400 * (COUNT / 8000), b, t: 0 });
  b.kick = 1;
}

function emitSprays(dt) {
  for (let q = sprayQueue.length - 1; q >= 0; q--) {
    const s = sprayQueue[q];
    s.t += dt;
    const n = Math.min(s.left, Math.ceil(s.rate * dt));
    const [c1, c2] = PALETTE[s.b.color];
    for (let k = 0; k < n; k++) {
      const spread = 0.5 + s.t * 1.2;
      tmp.copy(s.dir).add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)).normalize();
      const r = Math.random(); const speed = 0.6 + r * r * 4.8;
      spawn(s.origin, tmp.clone().multiplyScalar(speed), 2.5 + Math.random() * 3.5, 3 + Math.random() * 9,
        c1.clone().lerp(c2, 0.3 + Math.random() * 0.5), 0.09, 10);
    }
    s.left -= n;
    if (s.left <= 0) sprayQueue.splice(q, 1);
  }
}

/* ---------- pointer ---------- */
const ndc = new THREE.Vector2(0, 0);
const mouse = new THREE.Vector3(999, 999, 0);
const mousePrev = new THREE.Vector3();
const mouseVel = new THREE.Vector3();
let pointerActive = false;
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let hovered = null;

function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(plane, mouse);
}
hero.addEventListener('pointermove', (e) => {
  toWorld(e);
  if (!pointerActive) { mousePrev.copy(mouse); pointerActive = true; }
  const hit = raycaster.intersectObjects(stage.children, true)[0];
  hovered = hit ? hit.object.userData.bottle : null;
  canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
});
hero.addEventListener('pointerleave', () => { pointerActive = false; hovered = null; });
canvas.addEventListener('click', (e) => {
  toWorld(e);
  const hit = raycaster.intersectObjects(stage.children, true)[0];
  if (hit) { spray(hit.object.userData.bottle, 1.4); return; }
  // Spray from the nearest bottle toward the click.
  let best = bottles[0], bd = Infinity;
  bottles.forEach((b) => { const d = b.mesh.position.distanceTo(mouse); if (d < bd) { bd = d; best = b; } });
  spray(best, 1.2, mouse);
});

/* ---------- resize ---------- */
function resize() {
  const w = hero.clientWidth, h = hero.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep the trio framed on narrow screens.
  const portrait = w / h < 0.8;
  camera.position.z = portrait ? 19 : w / h < 1.2 ? 13.5 : 11;
  // Bottles sit opposite the headline: left in Arabic (RTL), right in English.
  const rtl = document.documentElement.dir === 'rtl';
  // On phones the trio sits under the copy.
  stage.position.set(w > 900 ? (rtl ? -2.3 : 2.3) : 0, w > 900 ? 0 : portrait ? -3.6 : -1.6, 0);
  camera.updateProjectionMatrix();
  view.h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  view.w = view.h * camera.aspect;
  const bh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z + 7) * 1.35;
  backdrop.scale.set(bh * camera.aspect, bh, 1);
  backdrop.material.uniforms.uFlip.value = rtl ? 1 : 0;
  mistMat.uniforms.uScale.value = h * renderer.getPixelRatio() * 0.06;
}
new ResizeObserver(resize).observe(hero);
document.addEventListener('langchange', resize);
resize();

/* ---------- loop ---------- */
spawnHaze(Math.floor(COUNT * 0.22));
const clock = new THREE.Clock();
let running = true, elapsed = 0, nextAuto = 1.3, autoIdx = 0, intro = reduced || location.search.includes('skipintro') ? 1 : 0;
let scrollK = 0;
addEventListener('scroll', () => { scrollK = Math.min(1, scrollY / (hero.clientHeight || 1)); }, { passive: true });

function flow(x, y, z, t, out) {
  // Cheap divergence-light swirl built from offset sines; reads like drifting vapour.
  out.x = Math.sin(y * 0.9 + t * 0.35) * 0.55 + Math.sin(z * 1.3 + t * 0.2) * 0.25;
  out.y = Math.cos(x * 0.8 - t * 0.3) * 0.4 + 0.06;
  out.z = Math.sin(x * 0.6 + y * 0.7 + t * 0.25) * 0.3;
}
const f = new THREE.Vector3();

function tick() {
  if (!running) return;
  update(Math.min(clock.getDelta(), 1 / 30));
  requestAnimationFrame(tick);
}

function update(dt) {
  elapsed += dt;
  if (!introHold) intro = Math.min(1, intro + dt / 2.4);
  const ease = 1 - Math.pow(1 - intro, 4);

  // Bottles: rise in on load, bob, turn toward the pointer.
  bottles.forEach((b, i) => {
    const m = b.mesh;
    const delay = Math.max(0, Math.min(1, (ease * 1.3) - i * 0.15));
    m.position.x = b.home.x;
    m.position.y = b.home.y + Math.sin(elapsed * 0.9 + b.phase) * 0.12 - (1 - delay) * 5 + scrollK * 1.6;
    m.position.z = b.home.z;
    const targetRY = Math.sin(elapsed * 0.35 + b.phase) * 0.45 + (pointerActive ? ndc.x * 0.5 : 0) + (b === hovered ? 0.4 : 0);
    b.spin += (targetRY - b.spin) * 0.05;
    m.rotation.y = b.spin + (1 - delay) * 2.5;
    m.rotation.z = Math.sin(elapsed * 0.7 + b.phase) * 0.04;
    b.kick = (b.kick || 0) * 0.9;
    m.scale.setScalar(b.scale * (1 - b.kick * 0.04));
  });
  stage.rotation.x += ((pointerActive ? -ndc.y * 0.12 : 0) - stage.rotation.x) * 0.05;

  // Automatic spritz, one bottle at a time.
  if (!reduced && intro > 0.55 && elapsed > nextAuto && scrollK < 0.8) {
    spray(bottles[autoIdx % 3], autoIdx < 3 ? 1.1 : 0.8);
    autoIdx++;
    nextAuto = elapsed + (autoIdx < 3 ? 0.5 : 3.2 + Math.random() * 2.2);
  }
  emitSprays(dt);
  if (Math.random() < 0.35) spawnHaze(1);

  // Pointer velocity in world units.
  if (pointerActive) {
    mouseVel.subVectors(mouse, mousePrev).divideScalar(Math.max(dt, 1e-3)).clampLength(0, 22);
    mousePrev.copy(mouse);
  } else mouseVel.multiplyScalar(0.9);

  const R = 1.5, R2 = R * R;
  const drag = Math.pow(0.12, dt); // strong initial drag slows the spray into a cloud
  for (let i = 0; i < COUNT; i++) {
    if (life[i] <= 0) { alpha[i] = 0; continue; }
    life[i] -= dt;
    const j = i * 3;
    let x = pos[j], y = pos[j + 1], z = pos[j + 2];
    flow(x, y, z, elapsed, f);
    let vx = vel[j] * drag + f.x * dt * 0.9;
    let vy = vel[j + 1] * drag + f.y * dt * 0.9;
    let vz = vel[j + 2] * drag + f.z * dt * 0.9;
    // Brownian jitter lets each spray diffuse instead of drifting as one clump.
    vx += (Math.random() - 0.5) * dt * 2.4; vy += (Math.random() - 0.5) * dt * 2.4; vz += (Math.random() - 0.5) * dt * 1.2;
    if (pointerActive) {
      const dx = x - mouse.x, dy = y - mouse.y, dz = (z - mouse.z) * 0.5;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < R2) {
        const k = 1 - Math.sqrt(d2) / R;
        const kk = k * k;
        // Carry mist along with the cursor, add a swirl and a soft push outward.
        vx += (mouseVel.x * 0.9 * kk - dy * 2.2 * kk + dx * 1.4 * kk) * dt * 3;
        vy += (mouseVel.y * 0.9 * kk + dx * 2.2 * kk + dy * 1.4 * kk) * dt * 3;
        vz += mouseVel.length() * 0.05 * kk * dt * 3;
      }
    }
    vel[j] = vx; vel[j + 1] = vy; vel[j + 2] = vz;
    pos[j] = x + vx * dt; pos[j + 1] = y + vy * dt; pos[j + 2] = z + vz * dt;
    size[i] += dt * grow[i]; // vapour expands as it drifts
    const t = life[i] / maxLife[i];
    // Fade in fast, thin out as each droplet grows so the cloud stays soft.
    alpha[i] = Math.min(1, (1 - t) * 10) * Math.pow(t, 1.1) * amul[i] * Math.min(1, 14 / size[i]);
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.aAlpha.needsUpdate = true;
  geo.attributes.aSize.needsUpdate = true;
  geo.attributes.aColor.needsUpdate = true;

  camera.position.y = 0.2 - scrollK * 0.8;
  camera.lookAt(0, -scrollK * 0.4, 0);
  renderer.render(scene, camera);
}

// ?debug exposes a stepper so a throttled/background tab can still be inspected.
if (location.search.includes('debug')) {
  window.__hero = {
    step: (frames = 60) => { for (let k = 0; k < frames; k++) update(1 / 60); },
    spray: (i = 0, s = 1) => spray(bottles[i], s),
    pointer: (x, y) => { ndc.set(x, y); raycaster.setFromCamera(ndc, camera); raycaster.ray.intersectPlane(plane, mouse); if (!pointerActive) mousePrev.copy(mouse); pointerActive = true; },
  };
}

// Stop rendering once the hero leaves the viewport.
let ready = false, visible = true;
// While the logo intro plays, hold the bottles below frame; they rise as the curtain lifts.
const rc = document.documentElement.classList;
let introHold = rc.contains('intro-on') && !rc.contains('intro-out');
document.addEventListener('intro:reveal', () => {
  introHold = false;
  if (ready) hero.classList.add('is-ready');
}, { once: true });
function start() {
  if (running || !ready || !visible) return;
  running = true; clock.getDelta(); requestAnimationFrame(tick);
}
new IntersectionObserver(([en]) => {
  visible = en.isIntersecting;
  if (visible) start(); else running = false;
}, { threshold: 0 }).observe(hero);

running = false;
document.fonts.ready.finally(() => {
  // Relabel once Marcellus has loaded so the canvas text uses it.
  bottles[0].mesh.children.find((o) => o.geometry?.type === 'PlaneGeometry').material.map = labelTexture([['VIOLET', 118, 128, 14]]);
  if (!introHold) hero.classList.add('is-ready');
  ready = true; start();
});

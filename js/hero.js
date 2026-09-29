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
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.5));
// The glass refraction pass is the costliest part of the scene; render it at reduced resolution.
renderer.transmissionResolutionScale = small ? 0.5 : 0.75;
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
  return g;
}

const stage = new THREE.Group(); scene.add(stage);
const bottles = [
  { mesh: violetBottle(), home: new THREE.Vector3(0, 0.05, 0.6), scale: 1.12 },
  { mesh: roundBottle(), home: new THREE.Vector3(-2.4, -0.55, -0.4), scale: 0.95 },
  { mesh: tallBottle(), home: new THREE.Vector3(2.2, -0.2, -0.9), scale: 0.95 },
];
bottles.forEach((b, i) => {
  b.mesh.scale.setScalar(b.scale);
  b.mesh.position.copy(b.home);
  b.phase = i * 2.1;
  b.spin = 0;
  b.mesh.traverse((o) => { if (o.isMesh) o.userData.bottle = b; });
  stage.add(b.mesh);
});

/* ---------- pointer ---------- */
const ndc = new THREE.Vector2(0, 0);
let pointerActive = false;
const raycaster = new THREE.Raycaster();
let hovered = null;

function pick(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(stage.children, true)[0];
  return hit ? hit.object.userData.bottle : null;
}
hero.addEventListener('pointermove', (e) => {
  pointerActive = true;
  hovered = pick(e);
  canvas.style.cursor = hovered ? 'pointer' : '';
});
hero.addEventListener('pointerleave', () => { pointerActive = false; hovered = null; });
// Clicking a bottle gives it one full turn.
canvas.addEventListener('click', (e) => {
  const b = pick(e);
  if (b) b.twirl = (b.twirl || 0) + Math.PI * 2;
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
  const bh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z + 7) * 1.35;
  backdrop.scale.set(bh * camera.aspect, bh, 1);
  backdrop.material.uniforms.uFlip.value = rtl ? 1 : 0;
}
new ResizeObserver(resize).observe(hero);
document.addEventListener('langchange', resize);
resize();

/* ---------- loop ---------- */
const clock = new THREE.Clock();
let running = true, elapsed = 0, intro = reduced || location.search.includes('skipintro') ? 1 : 0;
let scrollK = 0;
addEventListener('scroll', () => { scrollK = Math.min(1, scrollY / (hero.clientHeight || 1)); }, { passive: true });

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
    b.twirlDone = (b.twirlDone || 0) + ((b.twirl || 0) - (b.twirlDone || 0)) * Math.min(1, dt * 4);
    m.rotation.y = b.spin + b.twirlDone + (1 - delay) * 2.5;
    m.rotation.z = Math.sin(elapsed * 0.7 + b.phase) * 0.04;
    m.scale.setScalar(b.scale);
  });
  stage.rotation.x += ((pointerActive ? -ndc.y * 0.12 : 0) - stage.rotation.x) * 0.05;


  camera.position.y = 0.2 - scrollK * 0.8;
  camera.lookAt(0, -scrollK * 0.4, 0);
  renderer.render(scene, camera);
}

// ?debug exposes a stepper so a throttled/background tab can still be inspected.
if (location.search.includes('debug')) {
  window.__hero = {
    step: (frames = 60) => { for (let k = 0; k < frames; k++) update(1 / 60); },
    twirl: (i = 0) => { bottles[i].twirl = (bottles[i].twirl || 0) + Math.PI * 2; },
    pointer: (x, y) => { ndc.set(x, y); pointerActive = true; },
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

import { BRANDS, I18N } from './data.js';
import { openViewer } from './main.js?v=7';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');
const t = (k) => I18N[lang()][k];

/* ---------- grid ---------- */
const grid = document.getElementById('brand-grid');
// Brands with shelf photos first, richest galleries leading.
const ordered = [...BRANDS].sort((a, b) => b.gallery - a.gallery);

function renderGrid() {
  grid.innerHTML = ordered.map((b) => {
    const meta = b.gallery ? `${b.gallery} ${t('brands.photos')}` : t('brands.instore');
    const tag = b.gallery ? 'button type="button"' : 'div';
    const close = b.gallery ? 'button' : 'div';
    return `<li><${tag} class="brand-tile${b.gallery ? '' : ' is-static'}" data-brand="${b.key}">
      ${b.gallery ? `<img class="brand-cover" src="assets/img/${b.key}/00.webp" alt="" loading="lazy">` : ''}
      <span class="brand-logo"><img src="assets/logos/${b.logo}" alt="${b.name}"></span>
      <span class="brand-meta">${meta}</span>
    </${close}></li>`;
  }).join('');
}
renderGrid();
document.addEventListener('langchange', renderGrid);

grid.addEventListener('click', (e) => {
  const tile = e.target.closest('button.brand-tile');
  if (tile) openViewer(tile.dataset.brand, 0, tile);
});

// Tiles lean toward the pointer.
if (!reduced) {
  grid.addEventListener('pointermove', (e) => {
    const tile = e.target.closest('.brand-tile'); if (!tile) return;
    const r = tile.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    tile.style.setProperty('--rx', `${-y * 10}deg`);
    tile.style.setProperty('--ry', `${x * 12}deg`);
    tile.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    tile.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  });
  grid.addEventListener('pointerout', (e) => {
    const tile = e.target.closest('.brand-tile');
    if (tile && !tile.contains(e.relatedTarget)) { tile.style.setProperty('--rx', '0deg'); tile.style.setProperty('--ry', '0deg'); }
  });
  window.gsap?.from('.brand-tile', { opacity: 0, y: 40, rotateX: -25, duration: 1, stagger: 0.04, ease: 'power3.out', delay: 0.35 });
}

/* ---------- flying logo cards ---------- */
const sky = document.querySelector('.sky');
const inner = document.querySelector('.sky-inner');
const FAR = -3200, NEAR = 700;
const cards = [];
const perBrand = innerWidth < 700 ? 1 : 2;

BRANDS.forEach((b) => {
  for (let k = 0; k < perBrand; k++) {
    const el = document.createElement('div');
    el.className = 'fly';
    el.innerHTML = `<img src="assets/logos/${b.logo}" alt="">`;
    inner.appendChild(el);
    cards.push({ el, ...place(), z: FAR + Math.random() * (NEAR - FAR) });
  }
});

function place() {
  // Keep a calm lane down the middle so the cards frame the content instead of crossing it.
  const side = Math.random() < 0.5 ? -1 : 1;
  const w = innerWidth, h = innerHeight;
  return {
    x: side * (w * 0.14 + Math.random() * w * 0.5),
    y: (Math.random() - 0.5) * h * 1.3,
    speed: 170 + Math.random() * 230,
    rx: (Math.random() - 0.5) * 30, ry: (Math.random() - 0.5) * 50, rz: (Math.random() - 0.5) * 24,
    spin: (Math.random() - 0.5) * 16,
  };
}

let px = 0.5, py = 0.5, ox = 50, oy = 50, boost = 0, lastY = scrollY, last = performance.now();
addEventListener('pointermove', (e) => { px = e.clientX / innerWidth; py = e.clientY / innerHeight; }, { passive: true });
addEventListener('scroll', () => { boost = Math.min(6, boost + Math.abs(scrollY - lastY) * 0.02); lastY = scrollY; }, { passive: true });

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  ox += (px * 100 - ox) * 0.04; oy += (py * 100 - oy) * 0.04;
  sky.style.perspectiveOrigin = `${100 - ox}% ${100 - oy}%`;
  boost *= 0.94;
  for (const c of cards) {
    c.z += c.speed * (1 + boost) * dt;
    c.rz += c.spin * dt;
    if (c.z > NEAR) Object.assign(c, place(), { z: FAR });
    // Distant cards bunch at the vanishing point behind the headline, so they stay hidden until closer.
    const fadeIn = Math.max(0, Math.min(1, (c.z - FAR - 1300) / 900));
    const fadeOut = Math.min(1, (NEAR - c.z) / 500);
    c.el.style.opacity = (fadeIn * fadeOut).toFixed(3);
    c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, ${c.z}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg)`;
  }
  requestAnimationFrame(frame);
}

if (reduced) {
  cards.forEach((c) => {
    c.z = FAR * 0.3 + Math.random() * 600;
    c.el.style.opacity = 0.5;
    c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, ${c.z}px) rotateZ(${c.rz}deg)`;
  });
} else {
  requestAnimationFrame(frame);
}

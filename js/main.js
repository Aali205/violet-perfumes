import { BRANDS, PRODUCTS, ACCORDS, I18N, STORE, imgPath } from './data.js?v=8';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const brandBy = Object.fromEntries(BRANDS.map((b) => [b.key, b]));

/* ---------- language ---------- */
let lang = 'ar';
try { lang = localStorage.getItem('violet-lang') || 'ar'; } catch {}
const t = (k) => I18N[lang][k] ?? k;

function applyLang() {
  const html = document.documentElement;
  html.lang = lang; html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  renderShop?.();
  document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}
$$('.lang-toggle').forEach((b) => b.addEventListener('click', () => {
  lang = lang === 'ar' ? 'en' : 'ar';
  try { localStorage.setItem('violet-lang', lang); } catch {}
  applyLang();
}));

/* ---------- store links ---------- */
$$('[data-link]').forEach((a) => { a.href = STORE[a.dataset.link]; });
$$('[data-phone]').forEach((el) => { el.textContent = STORE.phone; });

/* ---------- header ---------- */
const header = $('.site-header');
addEventListener('scroll', () => header?.classList.toggle('is-scrolled', scrollY > 40), { passive: true });
const menuBtn = $('.menu-btn');
menuBtn?.addEventListener('click', () => {
  const open = header.classList.toggle('menu-open');
  menuBtn.setAttribute('aria-expanded', open);
});
$$('.site-nav a').forEach((a) => a.addEventListener('click', () => header.classList.remove('menu-open')));

/* ---------- smooth scroll ---------- */
if (!reduced && window.Lenis) {
  const lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  window.__lenis = lenis;
  if (document.documentElement.classList.contains('intro-on') && !document.documentElement.classList.contains('intro-out')) {
    lenis.stop();
    document.addEventListener('intro:reveal', () => lenis.start(), { once: true });
  }
}

// In-page links use the browser's own smooth scroll (Lenis re-syncs from native scroll events),
// so they never depend on an animation loop.
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reduced || document.hidden ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', a.getAttribute('href'));
}));

/* ---------- logo ribbon ---------- */
$$('.ribbon-track').forEach((track) => {
  const items = BRANDS.map((b) => `<li><img src="assets/logos/${b.logo}" alt="${b.name}" loading="lazy"></li>`).join('');
  track.innerHTML = `<ul>${items}</ul><ul aria-hidden="true">${items}</ul>`;
});

/* ---------- shop ---------- */
const grid = $('#shop-grid');
const state = { g: 'all', accords: new Set() };
var renderShop = null;

if (grid) {
  const accordBox = $('#accord-filters');
  const genderBox = $('#gender-filters');

  renderShop = () => {
    genderBox.innerHTML = ['all', 'w', 'm', 'u'].map((g) =>
      `<button type="button" role="radio" aria-checked="${state.g === g}" data-g="${g}">${t('shop.' + g)}</button>`).join('');
    accordBox.innerHTML = Object.entries(ACCORDS).map(([k, v]) =>
      `<button type="button" aria-pressed="${state.accords.has(k)}" data-a="${k}">${v[lang]}</button>`).join('');

    const list = PRODUCTS.filter((p) => (state.g === 'all' || p.g === state.g) &&
      [...state.accords].every((a) => p.a.includes(a)));
    grid.innerHTML = list.length ? list.map((p) => {
      const b = brandBy[p.brand];
      return `<li class="product">
        <button type="button" class="product-hit" data-brand="${p.brand}" data-img="${p.img}" aria-label="${t('shop.open')}: ${p.name}, ${b.name}">
          <span class="product-photo"><img src="${imgPath(p.brand, p.img)}" alt="" loading="lazy"></span>
          <span class="product-brand"><img src="assets/logos/${b.logo}" alt="${b.name}"></span>
          <span class="product-name">${p.name}</span>
          <span class="product-accords">${p.a.map((a) => `<i class="${state.accords.has(a) ? 'on' : ''}">${ACCORDS[a][lang]}</i>`).join('')}</span>
        </button></li>`;
    }).join('') : `<li class="shop-empty">${t('shop.empty')}</li>`;
    $('#shop-count').textContent = `${list.length} / ${PRODUCTS.length}`;
  };

  genderBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    state.g = b.dataset.g; renderShop();
  });
  accordBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const k = b.dataset.a;
    state.accords.has(k) ? state.accords.delete(k) : state.accords.add(k);
    renderShop();
    if (!reduced) grid.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
  });
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.product-hit'); if (!b) return;
    openViewer(b.dataset.brand, +b.dataset.img, b);
  });
}

/* ---------- story viewer ---------- */
const viewer = $('#viewer');
let vState = null;

export function openViewer(brandKey, start = 0, opener = null) {
  const b = brandBy[brandKey];
  if (!viewer || !b?.gallery) return;
  vState = { b, i: start, opener, timer: 0, t0: 0, paused: false };
  $('.viewer-logo', viewer).src = `assets/logos/${b.logo}`;
  $('.viewer-logo', viewer).alt = b.name;
  $('.viewer-name', viewer).textContent = b.name;
  $('.viewer-bars', viewer).innerHTML = Array.from({ length: b.gallery }, () => '<span><i></i></span>').join('');
  $('.viewer-ask', viewer).href = `${STORE.whatsapp}?text=${encodeURIComponent((lang === 'ar' ? 'مرحبا، بدي اسأل عن عطر من ' : 'Hi, I want to ask about a perfume from ') + b.name)}`;
  viewer.hidden = false;
  document.body.classList.add('viewer-open');
  window.__lenis?.stop();
  requestAnimationFrame(() => viewer.classList.add('is-open'));
  show(start);
  $('.viewer-close', viewer).focus();
}

function show(i) {
  const { b } = vState;
  vState.i = (i + b.gallery) % b.gallery;
  const img = $('.viewer-photo', viewer);
  img.src = imgPath(b.key, vState.i);
  img.alt = `${b.name} ${vState.i + 1}`;
  // Preload the next photo so tapping forward feels instant.
  new Image().src = imgPath(b.key, (vState.i + 1) % b.gallery);
  $$('.viewer-bars span', viewer).forEach((s, k) => {
    s.classList.toggle('done', k < vState.i);
    s.classList.toggle('now', k === vState.i);
  });
  vState.t0 = performance.now(); vState.elapsed = 0;
}

function closeViewer() {
  if (!vState) return;
  viewer.classList.remove('is-open');
  document.body.classList.remove('viewer-open');
  window.__lenis?.start();
  const opener = vState.opener; vState = null;
  setTimeout(() => { viewer.hidden = true; }, 300);
  opener?.focus();
}

if (viewer) {
  const DUR = 4800;
  const loop = (now) => {
    if (vState && !vState.paused && !reduced) {
      const p = (vState.elapsed + now - vState.t0) / DUR;
      const bar = $('.viewer-bars .now i', viewer);
      if (bar) bar.style.transform = `scaleX(${Math.min(1, p)})`;
      if (p >= 1) show(vState.i + 1);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const step = (d) => vState && show(vState.i + d);
  const rtl = () => document.documentElement.dir === 'rtl';
  $('.viewer-prev', viewer).addEventListener('click', () => step(-1));
  $('.viewer-next', viewer).addEventListener('click', () => step(1));
  $('.viewer-close', viewer).addEventListener('click', closeViewer);
  viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
  const stage = $('.viewer-stage', viewer);
  const pause = (on) => {
    if (!vState) return;
    if (on && !vState.paused) vState.elapsed += performance.now() - vState.t0;
    if (!on) vState.t0 = performance.now();
    vState.paused = on;
  };
  stage.addEventListener('pointerdown', () => pause(true));
  stage.addEventListener('pointerup', () => pause(false));
  stage.addEventListener('pointerleave', () => vState?.paused && pause(false));
  addEventListener('keydown', (e) => {
    if (!vState) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') step(rtl() ? -1 : 1);
    if (e.key === 'ArrowLeft') step(rtl() ? 1 : -1);
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = $$('button, a[href]', viewer);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
}

/* ---------- section reveals (one gentle pass, headings only) ---------- */
if (!reduced && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { opacity: 0, y: 28, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  const bbw = $('.bbw-stack');
  if (bbw) gsap.from($$('.bbw-stack img'), {
    y: 60, opacity: 0, stagger: 0.12, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: bbw, start: 'top 75%' },
  });
}

applyLang();

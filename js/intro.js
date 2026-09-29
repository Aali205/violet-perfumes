// Home-page intro: the logo animation itself is CSS; this script adds the spritz,
// handles skipping, and tells the hero when the curtain starts to lift.
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('intro-on')) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = reduced ? 900 : 3000; // time the finished logo stays on screen before lifting
  let done = false;

  // One spritz from the atomizer (the collar sits at about 62%, 21% of the drawing).
  function spritz() {
    const box = intro.querySelector('.intro-mist');
    const w = box.clientWidth;
    for (let i = 0; i < 34; i++) {
      const p = document.createElement('i');
      p.style.left = '62%';
      p.style.top = '21%';
      box.appendChild(p);
      const a = (-35 + (Math.random() - 0.5) * 50) * Math.PI / 180;
      const d = w * (0.25 + Math.random() * 0.55);
      const s = 0.6 + Math.random() * 2.4;
      p.animate([
        { transform: 'translate(0, 0) scale(.4)', opacity: 0 },
        { opacity: 0.95, offset: 0.15 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(${s})`, opacity: 0 },
      ], { duration: 900 + Math.random() * 700, delay: Math.random() * 180, easing: 'cubic-bezier(.1, .7, .3, 1)', fill: 'forwards' });
    }
  }

  function reveal() {
    if (done) return;
    done = true;
    root.classList.add('intro-out');
    document.dispatchEvent(new CustomEvent('intro:reveal'));
    setTimeout(() => {
      root.classList.remove('intro-on', 'intro-out');
      intro.remove();
    }, reduced ? 50 : 1100);
  }

  if (!reduced) setTimeout(spritz, 2250);
  // Lift once the logo has played and the page has loaded (or after 6s at most).
  const minTime = new Promise((r) => setTimeout(r, HOLD));
  const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  Promise.race([Promise.all([minTime, loaded]), new Promise((r) => setTimeout(r, 6000))]).then(reveal);

  intro.addEventListener('click', reveal);
  addEventListener('keydown', reveal, { once: true });
})();

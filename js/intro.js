// Home-page intro: the logo animation itself is CSS; this script handles skipping and tells the hero when the curtain starts to lift.
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('intro-on')) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = reduced ? 900 : 3000; // time the finished logo stays on screen before lifting
  let done = false;

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

  // Lift once the logo has played and the page has loaded (or after 6s at most).
  const minTime = new Promise((r) => setTimeout(r, HOLD));
  const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  Promise.race([Promise.all([minTime, loaded]), new Promise((r) => setTimeout(r, 6000))]).then(reveal);

  intro.addEventListener('click', reveal);
  addEventListener('keydown', reveal, { once: true });
})();

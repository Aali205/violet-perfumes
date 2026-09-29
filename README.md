# Violet Perfumes — website

Static site for **Violet** (@violeet_perfumess), original-perfume store in Al-Shaalan, Damascus.

## Run locally
```
python -m http.server 5510
```
Open http://127.0.0.1:5510 — ES modules need a server; opening the file directly won't work.

## Pages
- `index.html` — logo intro, WebGL hero (three glass bottles that follow the cursor; click one to spin it), brand ribbon, product shelf filtered by accord and gender, Bath & Body Works offer, visit/map.
- `brands.html` — 3D logo cards flying through the background; every brand tile opens a story-style viewer of the store's own highlight photos.

## Content
- `js/data.js` holds everything editable: brands, products (name, photo, accords), store phone/links, Arabic + English copy.
- `assets/img/<brand>/NN.webp` — photos from the store's Instagram highlights (optimised). Originals and metadata are in `_instagram-source/` (not needed for deployment).
- `assets/logos/` — brand logos from Wikimedia Commons; `narciso`, `azzaro`, `issey`, `ibraq` are simple text wordmarks and should be swapped for official artwork.

## Debug
`index.html?skipintro` skips the bottle entrance; `?debug` exposes `window.__hero.step()/twirl()` for testing in background tabs.

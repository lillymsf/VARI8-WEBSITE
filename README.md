# Vari8 product page (local prototype)

Standalone static product page for Vari8. Every product visual on the page is
the real Vari8 app — currently shown as labelled placeholder slots; real
snapshots can be dropped into `assets/snapshots/` (see below). The old
capture pipeline that produced these frames is kept in `tools/` +
`assets/app/` for when the app's UI settles.
Shadow DOM frames, recoloured to the Vari8 accent. Not a redrawn imitation and
not a screenshot. **Local preview only.** Not connected to the app, its
backend, or any signup service.

## Preview

```sh
cd website
python3 -m http.server 8420
# open http://127.0.0.1:8420/
```

(any static server works; there is no build step)

## Verify

```sh
node tools/verify-page.mjs [--url http://127.0.0.1:8420/]
```

Runs the page checks end to end (console cleanliness, same-origin requests,
horizontal scroll, loop step pills forward and back, loop autoplay and
sticky pause, feature tablist keyboard control, reduced motion,
no-JavaScript rendering, blocked state fetches, pink-pixel scan, and a
live-vs-page fidelity capture). Prints one `PASS`/`FAIL` line per check and
writes screenshots to `/tmp/vari8-build/verify/`. Needs Google Chrome; the
fidelity check also needs the coach app preview on `http://127.0.0.1:3000`.

## Recapturing the app fragments

`assets/app/` + `tools/` — the (currently unused) app capture pipeline,
kept for later. Every app frame on the page is a
`<figure class="slot" data-slot="<name>">` with a placeholder panel; drop
`<slot-name>.png|webp|jpg` into `assets/snapshots/` and add
`"<slot-name>": "<file>"` to `assets/snapshots/manifest.json` — the image
crossfades in on load (no reflow; slots not in the manifest keep the
placeholder). To recapture real app states when the app UI settles: run
the app preview, then `node tools/capture-app.mjs && node
tools/inline-states.mjs && node --test tools/capture.test.mjs`.

## Contents

- `index.html` — single product page; app states inlined for the no-JS path
- `styles.css` — page styles (kept separate from the captured app CSS, which
  stays inside Shadow DOM)
- `site.js` — dependency-free motion runtime (`window.Vari8`); the page stays
  fully readable with JavaScript disabled
- `tools/` — capture pipeline (`capture-app.mjs`, `capture-states.mjs`,
  `sanitize.mjs`, `cdp.mjs`), `inline-states.mjs`, `verify-page.mjs`, tests
- `assets/app/` — sanitized HTML fragments + pruned, viewport-flattened CSS
  captured from the running coach app
- `assets/brand/` — Vari8 wordmark + submark SVGs
- `assets/fonts/` — `InfinityGeist.woff2`, copied from
  `frontend/public/fonts/` (in-repo canvas asset)
- `assets/shots/` — legacy canvas captures, no longer referenced by the page

## Known limitations

- **Early access is not connected.** The form controls are disabled and
  nothing is sent or stored — destination and privacy wording are undecided.
- Captures reflect the app at capture time; recapture with the commands above
  when the app changes.
- The client phone states come from the standalone client app at
  `/client?client=client-007`, captured at 390 px native width including the
  floating bottom bar.
- Emma's meal-plan sample is injected only for capture (the app seeds no
  nutrition content); it uses real food IDs from the app's database.
- Demo data and screenshots are approved for this private local prototype;
  reusing them on a public site needs owner confirmation first.
- Font licensing for redistribution is unverified; acceptable for local
  preview, must be checked before any public deployment.
- No analytics, cookies, backend calls or external requests.
- Product updates section intentionally omitted — no approved public
  changelog content exists yet.

## Animations

- **Hero text morph** (`.tm` in the h1): cycles `data-words="check-ins|plans|messages|clients"` through a gooey SVG-threshold filter (2400ms hold, 680ms morph), each word centred on its own line. Change words/timing in `initTextMorph` (site.js). Reduced motion and no-JS show the static "check-ins".
- **Features flip stack** (`.flip`): contained autoplay fold deck — top card exits up at rotateX(22°)/700ms, the deck settles, controls (prev/dots/counter/next) + Arrow/Home/End keys + swipe. Autoplay 5000ms while >=40% visible; pauses on hover/focus/touch; resumes. No pinning. Reduced motion: opacity cuts; no-JS: stacked list.
- **Hero background fields** (`.hero-fields`): five radial-gradient orbs orbit via the `rotate`/`translate` properties (27-44s linear + 9-15s alternate sway), plus an feTurbulence grain layer. Paused offscreen via IntersectionObserver (`is-paused`). Colours/durations live in the `.hf-*` rules in styles.css.

## Credits

- Text Morph and Case Study Flip Stack techniques adapted from Componentry community components by Harsh Jadhav (MIT-style).
- Hero gradient field technique is an original CSS implementation.

/* Vari8 landing — v5: placeholder slots + snapshot drop-in */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.22,.8,.24,1)";

  /* ------------------------- snapshot drop-in --------------------------
     Slots ship as placeholders. Drop <slot>.png|webp|jpg into
     assets/snapshots/ and add "<slot>": "<file>" to manifest.json — the
     image fades in over the placeholder, layout never moves. */
  fetch("assets/snapshots/manifest.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((manifest) => {
      for (const [name, file] of Object.entries(manifest)) {
        const img = new Image();
        img.onload = () => {
          $$(`.slot[data-slot="${name}"] .slot-img`).forEach((el) => {
            el.src = img.src;
            el.hidden = false;
            el.classList.add("is-loaded");
            el.closest(".slot")?.querySelector(".slot-ph")?.classList.add("is-hidden");
          });
        };
        img.src = `assets/snapshots/${file}`;
        if (img.complete && img.naturalWidth > 0) img.onload();
      }
    });

  // setState — crossfade a frame between its slots
  function setState(frame, name) {
    if (!frame || frame.dataset.state === name) return;
    const layers = $$(".slot-layer", frame);
    const next = layers.find(
      (l) => l.querySelector(".slot")?.dataset.slot === name,
    );
    if (!next) return;
    layers.forEach((l) => l.classList.toggle("is-current", l === next));
    frame.dataset.state = name;
  }
  const showSlot = setState;

  /* ----------------------------- reveals ------------------------------ */
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
    { threshold: 0.12 },
  );
  $$(".rv").forEach((el) => io.observe(el));

  /* ------------------------------ nav --------------------------------- */
  const burger = $(".nav-burger");
  const siteNav = $(".site-nav");
  const navMenu = $(".nav-links");
  const closeMenu = () => {
    siteNav?.classList.remove("nav-open");
    navMenu?.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
  };
  burger?.addEventListener("click", () => {
    const open = siteNav.classList.toggle("nav-open");
    navMenu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
  navMenu?.addEventListener("click", (e) => e.target.closest("a") && closeMenu());

  // active section highlight — which section owns the viewport center
  const navLinks = $$(".nav-links a[href^='#']");
  const navSecs = ["loop", "features", "faq"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const navTick = () => {
    const mid = innerHeight * 0.5;
    let cur = null;
    for (const el of navSecs) {
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { cur = el.id; break; }
    }
    navLinks.forEach((a) =>
      a.classList.toggle("is-active", a.getAttribute("href") === `#${cur}`));
  };
  addEventListener("scroll", () => requestAnimationFrame(navTick), { passive: true });
  navTick();

  /* ---------------------------- hero tilt -----------------------------
     scroll progress -> --p on the hero frame; the CSS maps it to
     rotateX/translateY/scale + glow opacity (transform only) */
  const hero = $('[data-frame="hero"]');
  if (hero && !reducedMq.matches) {
    const onScroll = () =>
      hero.style.setProperty(
        "--hero-t",
        Math.min(1, Math.max(0, scrollY / (0.7 * innerHeight))).toFixed(4),
      );
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  } else if (hero) {
    hero.style.setProperty("--hero-t", "1");
  }

  /* ------------------------------ loop -------------------------------- */
  const loopPanel = $(".loop-panel");
  const stepBtns = $$(".loop-steps [data-beat]");
  const loopToggle = $("#loop-toggle");
  const loopReplay = $(".loop-replay");
  const loopLive = $("#loop-live");
  const loopDesk = $('[data-frame="loop-desktop"]');
  const loopPhone = $('[data-frame="loop-phone"]');
  const loopCap = $("#loop-cap");

  const BEATS = [
    { d: ["coach-checkins-queue"], p: "client-home",
      title: "Open the check-in",
      cap: "Your calendar shows every client's check-in day. Open one that's awaiting feedback." },
    { d: ["coach-checkin-review"], p: "client-home",
      title: "Read the answers",
      cap: "Their answers, photos and flagged set notes sit on one page." },
    { d: ["coach-tracker"], p: "client-tracker",
      title: "See the week",
      cap: "The Tracker shows the week behind it day by day, including weight, health markers and plan adherence." },
    { d: ["coach-plans"], p: "client-plans",
      title: "Adjust the plan",
      cap: "Change the training or nutrition plan from the same profile. Logged weeks keep their history." },
    { d: ["coach-messages"], p: "client-messages",
      title: "Message the client",
      cap: "Send your feedback with the check-in, or open the conversation to follow up." },
  ];
  const BEAT_MS = 4500;

  let loopIdx = 0, loopPaused = false, loopVisible = false, loopSeq = 0, loopTimer = 0;


  function loopSchedule() {
    clearTimeout(loopTimer);
    if (loopPaused || !loopVisible || reducedMq.matches) return;
    loopTimer = setTimeout(() => goBeat((loopIdx + 1) % BEATS.length), BEAT_MS);
  }
  function loopSyncToggle() {
    if (loopToggle) {
      loopToggle.setAttribute("aria-pressed", String(loopPaused));
      loopToggle.textContent = loopPaused ? "Play" : "Pause";
    }

  }
  function goBeat(i, { user = false } = {}) {
    const beat = BEATS[i];
    loopIdx = i;
    stepBtns.forEach((b, j) => {
      b.toggleAttribute("aria-current", j === i);
      if (j === i) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
      b.classList.toggle("is-done", j < i);
    });
    if (loopCap) loopCap.textContent = beat.cap;
    if (loopPhone) setState(loopPhone, beat.p);
    if (loopDesk) setState(loopDesk, beat.d[beat.d.length - 1]);
    if (user && loopLive)
      loopLive.textContent = `Step ${i + 1} of ${BEATS.length}: ${beat.title}`;
    loopSyncToggle();
    loopSchedule();
  }
  if (loopPanel) {
    if (reducedMq.matches) {
      goBeat(BEATS.length - 1);
    } else {
      new IntersectionObserver(
        (es) => es.forEach((e) => {
          loopVisible = e.isIntersecting;
          loopSchedule();
        }),
        { threshold: 0.4 },
      ).observe(loopPanel);
      document.addEventListener("visibilitychange", loopSchedule);
    }
    stepBtns.forEach((b, i) =>
      b.addEventListener("click", () => goBeat(i, { user: true })));
    loopToggle?.addEventListener("click", () => {
      loopPaused = !loopPaused;
      if (loopPaused) clearTimeout(loopTimer);
      loopSyncToggle();
      loopSchedule();
    });
    loopReplay?.addEventListener("click", () => {
      loopPaused = false;
      goBeat(0, { user: true });
      loopPaused = false;
      loopSyncToggle();
      loopSchedule();
    });
  }

  /* ---------- clients band -------------------------- */
  const ccPhone = $('[data-frame="clients-phone"]');
  const ccItems = $$(".cc-items [data-client]");
  const ccOrder = ccItems.map((b) => b.dataset.client);
  let ccTimer = 0, ccIdx = 0, ccVisible = false, ccUser = false;
  function ccSelect(name, { user = false } = {}) {
    if (!ccPhone || !ccOrder.includes(name)) return;
    setState(ccPhone, name);
    ccItems.forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.client === name)));
    if (user) { ccUser = true; clearTimeout(ccTimer); }
  }
  function ccSchedule() {
    clearTimeout(ccTimer);
    if (!ccVisible || ccUser || reducedMq.matches) return;
    ccTimer = setTimeout(() => {
      ccIdx = (ccIdx + 1) % ccOrder.length;
      ccSelect(ccOrder[ccIdx]);
      ccSchedule();
    }, 3500);
  }
  ccItems.forEach((b) =>
    b.addEventListener("click", () => {
      ccUser = true; clearTimeout(ccTimer);
      ccSelect(b.dataset.client, { user: true });
    }));
  if (ccPhone && !reducedMq.matches) {
    new IntersectionObserver(
      (es) => es.forEach((e) => { ccVisible = e.isIntersecting; ccSchedule(); }),
      { threshold: 0.4 },
    ).observe(ccPhone);
  }

  /* --------------------------- cursor glow ---------------------------- */
  const frames = $$(".app-frame");
  if (matchMedia("(pointer:fine)").matches && !reducedMq.matches) {
    addEventListener("pointermove", (e) => {
      let hit = null;
      for (const f of frames) {
        const r = f.getBoundingClientRect();
        if (
          e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top && e.clientY <= r.bottom
        ) { hit = { f, r }; break; }
      }
      frames.forEach((f) => f.classList.toggle("is-hot", hit && f === hit.f));
      if (hit) {
        hit.f.style.setProperty("--mx", ((e.clientX - hit.r.left) / hit.r.width * 100) + "%");
        hit.f.style.setProperty("--my", ((e.clientY - hit.r.top) / hit.r.height * 100) + "%");
      }
    }, { passive: true });
  }
})();

/* ====== Text Morph — Technique adapted from Componentry's Text Morph (Harsh Jadhav) ====== */
(function initTextMorph() {
  const $ = (x, r = document) => r.querySelector(x);
  const reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
  const tm = $(".tm[data-words]");
  if (!tm || reducedMq.matches) return;
  const WORDS = tm.dataset.words.split("|");
  const ORIG = tm.textContent.trim();
  const HOLD = 2400, DUR = 680, BLUR = 12;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const smoothstep = (v) => (v = clamp(v), v * v * (3 - 2 * v));
  const orig = document.createElement("span");
  orig.className = "tm-orig";
  orig.textContent = ORIG;
  const stage = document.createElement("span");
  stage.className = "tm-stage";
  stage.setAttribute("aria-hidden", "true");
  const cur = document.createElement("span");
  const nxt = document.createElement("span");
  const ghost = document.createElement("span");
  ghost.className = "tm-ghost";
  ghost.setAttribute("aria-hidden", "true");
  const ghostT = document.createElement("span");
  ghostT.className = "tm-g-t";
  ghostT.textContent = WORDS[0];
  ghost.append(ghostT);
  cur.className = "tm-layer"; nxt.className = "tm-layer";
  cur.textContent = WORDS[0];
  nxt.textContent = WORDS[1];
  stage.append(ghost, cur, nxt);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<filter id="tm-threshold" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8.28" result="thresholded"/><feComposite in="SourceGraphic" in2="thresholded" operator="atop"/></filter>';
  try {
    tm.textContent = "";
    tm.append(orig, svg, stage);
  } catch (e) {
    tm.textContent = ORIG;
    return;
  }
  const PHRASE = (i) => i === WORDS.length - 1 ? "and " + WORDS[i] : WORDS[i] + ", ";
  const setL = (el, op, blur, scale) => {
    el.style.opacity = op.toFixed(3);
    el.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : "none";
    el.style.transform = `translateX(-50%) scale(${scale.toFixed(4)})`;
  };
  setL(cur, 1, 0, 1);
  setL(nxt, 0, 0, 1);
  const phrase = (a, b, c, d) => a + ", " + b + ", " + c + " and " + d;
  let running = false, raf = 0;
  const swap = () => {
    if (window.__tmHold) { setTimeout(swap, 400); return; }
    // rebuild next phrase with morphing pair: keep comma structure, animate word 2->... simplest: morph whole phrase width
    const nextIdx = (idx + 1) % WORDS.length;
    const start = performance.now();
    ghostT.textContent = nxt.textContent;
    stage.style.width = ghost.offsetWidth + "px";
    stage.style.height =
      parseFloat(getComputedStyle(tm).lineHeight) + "px";
    stage.style.filter = "url(#tm-threshold)";
    cur.style.willChange = nxt.style.willChange = "opacity,transform,filter";
    nxt.textContent = phraseFor(nextIdx);
    idx = nextIdx;
    const tick = (now) => {
      const p = clamp((now - start) / DUR);
      const inc = smoothstep(p / 0.82);
      const out = smoothstep((p - 0.18) / 0.82);
      setL(cur, Math.pow(1 - out, 0.55), BLUR * out, 1 - out * 0.012);
      setL(nxt, Math.pow(inc, 0.55), BLUR * (1 - inc), 0.988 + inc * 0.012);
      if (p < 1) { raf = requestAnimationFrame(tick); return; }
      stage.style.filter = "none";
      cur.textContent = nxt.textContent;
      setL(cur, 1, 0, 1); setL(nxt, 0, 0, 1);
      cur.style.willChange = nxt.style.willChange = "auto";
      schedule();
    };
    raf = requestAnimationFrame(tick);
  };
  let idx = 0;
  const phraseFor = (w) => {
    // morph between fixed list positions? keep phrase but rotate focus word — simpler: morph the WHOLE comma list is ugly;
    return WORDS[w];
  };
  // simpler visual: the layer shows just the morphing word list tail — but spec wants the list phrase.
  // Use phrase with rotating order: plan->log->check-in->message single words.
  cur.textContent = WORDS[0];
  nxt.textContent = WORDS[1];
  const schedule = () => {
    if (!running) return;
    setTimeout(swap, HOLD);
  };
  const io = new IntersectionObserver(([e]) => {
    const vis = e.isIntersecting && !document.hidden;
    if (vis && !running) { running = true; schedule(); }
    else if (!vis) { running = false; cancelAnimationFrame(raf); }
  });
  io.observe(stage);
  document.addEventListener("visibilitychange", () =>
    io.takeRecords().length || io.unobserve(stage) || io.observe(stage));
})();

/* ====== Flip Stack — Technique adapted from Componentry's Case Study Flip Stack (Harsh Jadhav) ====== */
(function initFlip() {
  const $ = (x, r = document) => r.querySelector(x);
  const $$ = (x, r = document) => [...r.querySelectorAll(x)];
  const reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
  const region = $(".flip");
  if (!region) return;
  const stage = region.querySelector(".flip-stage");
  const cards = [...region.querySelectorAll(".flip-card")];
  const count = region.querySelector(".flip-count");
  const dots = [...region.querySelectorAll(".flip-dot")];
  const live = region.querySelector("#flip-live");
  const N = cards.length;
  const OFFSET = (i) => Math.min(i * 12, 34);
  const SCALE = (i) => 1 - Math.min(i * 0.012, 0.035);
  const EASE = "cubic-bezier(.22,1,.36,1)";
  const DUR = 700;
  const rm = reducedMq.matches;
  let order = cards.slice();   // order[0] = top card
  let timer = 0, resumeT = 0, busy = false;

  function measureStage() {
    // natural content height: make cards static, measure, restore
    stage.style.minHeight = "0px";
    const hMax = Math.max(
      ...cards.map((c) => {
        const prevPos = c.style.position;
        const prevTr = c.style.transform;
        const prevOp = c.style.opacity;
        c.style.position = "static";
        c.style.transform = "none";
        const h = c.offsetHeight;
        c.style.position = prevPos;
        c.style.transform = prevTr;
        c.style.opacity = prevOp;
        return h;
      }),
    );
    stage.style.minHeight = hMax + 34 + "px";
  }
  let rsT = 0;
  addEventListener("resize", () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => { measureStage(); rest(); }, 150);
  });
  function rest() {
    order.forEach((c, i) => {
      c.style.zIndex = N - i;
      c.style.transformOrigin = "50% 100%";
      c.style.transition = "none";
      c.style.transform = `translateY(${OFFSET(i)}px) scale(${SCALE(i)})`;
      c.style.opacity = "1";
    });
  }
  function restAnimated() {
    order.forEach((c, i) => {
      c.style.zIndex = N - i;
      c.style.transformOrigin = "50% 100%";
      c.style.transition = `transform ${DUR}ms ${EASE}, opacity ${DUR}ms ${EASE}`;
      c.style.transform = `translateY(${OFFSET(i)}px) scale(${SCALE(i)})`;
      c.style.opacity = "1";
    });
  }
  function ui(i) {
    count.textContent = String(i + 1).padStart(2, "0") + " / " + String(N).padStart(2, "0");
    dots.forEach((d, k) =>
      d.toggleAttribute("aria-current", k === i ? true : false) ||
      (k === i ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
  }
  const idxOf = () => cards.indexOf(order[0]);

  function next(user) {
    if (busy) return;
    busy = true;
    const top = order[0];
    const behind = order.slice(1);
    if (rm) {
      top.style.transition = "none";
      top.style.opacity = "0";
      order = behind.concat(top);
      rest(); sync(); busy = false; return;
    }
    top.style.zIndex = N + 1;
    top.style.transformOrigin = "50% 50%";
    top.style.transition = `transform ${DUR}ms ${EASE}, opacity ${Math.round(DUR * 0.45)}ms ease ${Math.round(DUR * 0.55)}ms`;
    top.style.transform = `translateY(-118%) rotateX(22deg)`;
    top.style.opacity = "0";
    order = behind;
    restAnimated();
    setTimeout(() => {
      top.style.transition = "none";
      top.style.opacity = "0";
      order = order.concat(top);
      const back = order.length - 1;
      top.style.transformOrigin = "50% 100%";
      top.style.transform = `translateY(${OFFSET(back)}px) scale(${SCALE(back)})`;
      top.style.zIndex = 1;
      requestAnimationFrame(() => {
        top.style.transition = `opacity 250ms ease`;
        top.style.opacity = "1";
      });
      busy = false;
    }, DUR);
    sync();
  }
  function prev(user) {
    if (busy) return;
    busy = true;
    const back = order[order.length - 1];
    if (rm) {
      order = [back, ...order.slice(0, -1)];
      rest(); sync(); busy = false; return;
    }
    // bring back card in from above
    order = [back, ...order.slice(0, -1)];
    back.style.zIndex = N + 1;
    back.style.transformOrigin = "50% 50%";
    back.style.transition = "none";
    back.style.transform = "translateY(-118%) rotateX(22deg)";
    back.style.opacity = "0";
    restAnimated();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        back.style.transition = `transform ${DUR}ms ${EASE}, opacity ${Math.round(DUR * 0.9)}ms ${EASE}`;
        back.style.transform = "translateY(0) rotateX(0deg) scale(1)";
        back.style.opacity = "1";
        setTimeout(() => {
          order.forEach((c) => (c.style.transition = "none"));
          rest(); busy = false;
        }, DUR + 30);
      }));
    sync();
  }
  function go(i) {
    if (i === idxOf()) return;
    // advance until target on top
    let guard = 0;
    const step = () => { next(true); if (++guard < N && cards.indexOf(order[0]) !== i) setTimeout(step, DUR + 60); };
    step();
  }
  function sync() {
    ui(idxOf());
    live.textContent = `Feature ${idxOf() + 1} of ${N}: ${order[0].querySelector("h3").textContent}`;
  }
  const restart = (ms) => { clearTimeout(timer); clearTimeout(resumeT); resumeT = setTimeout(startAuto, ms); };
  function startAuto() {
    if (rm) return;
    clearTimeout(timer);
    timer = setInterval(() => { if (vis && !paused) next(false); }, 5000);
  }
  let vis = false, paused = false;
  new IntersectionObserver(([e]) => { vis = e.isIntersecting && e.intersectionRatio >= 0.4; }, { threshold: [0, 0.4, 1] }).observe(region);
  ["pointerenter"].forEach((ev) =>
    region.addEventListener(ev, () => { paused = true; }));
  region.addEventListener("pointerleave", () => {
    paused = false; restart(1500);
  });
  region.addEventListener("focusin", () => { paused = true; });
  region.addEventListener("focusout", () => { paused = false; restart(1500); });
  region.addEventListener("pointerdown", () => { paused = true; }, { passive: true });
  region.addEventListener("pointerup", () => { paused = false; restart(1500); }, { passive: true });
  region.querySelector('[data-flip="prev"]').addEventListener("click", () => { prev(true); restart(8000); });
  region.querySelector('[data-flip="next"]').addEventListener("click", () => { next(true); restart(8000); });
  dots.forEach((d) => d.addEventListener("click", () => { go(+d.dataset.flip); restart(8000); }));
  region.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { next(true); restart(8000); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { prev(true); restart(8000); e.preventDefault(); }
    else if (e.key === "Home") { go(0); restart(8000); e.preventDefault(); }
    else if (e.key === "End") { go(N - 1); restart(8000); e.preventDefault(); }
  });
  // swipe
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; }, { passive: true });
  stage.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { dx < 0 ? next(true) : prev(true); restart(8000); }
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { vis = !document.hidden; });
  rest(); sync();
  requestAnimationFrame(() => measureStage());
  startAuto();
})();

/* ====== hero morphing gradient — dependency-free WebGL fragment shader ====== */
(function initHeroGradient() {
  const cv = document.querySelector(".hero-gradient");
  if (!cv) return;
  const reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
  let gl;
  try { gl = cv.getContext("webgl", { alpha: true, antialias: false, preserveDrawingBuffer: true }); } catch (e) {}
  if (!gl) { cv.style.display = "none"; return; } // CSS fallback stays visible
  const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FS = `precision highp float;uniform vec2 u_res;uniform float u_time;
vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}
float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);
vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
float fbm(vec2 p){float f=0.,a=.55;for(int i=0;i<2;i++){f+=a*snoise(p);p*=1.9;a*=.55;}return f;}
vec3 s2l(vec3 c){return pow(c,vec3(2.2));}
vec3 l2s(vec3 c){return pow(max(c,0.),vec3(1./2.2));}
vec3 rgb2lab(vec3 c){float l=0.4122214708*c.r+0.5363325363*c.g+0.0514459929*c.b;float m=0.2119034982*c.r+0.6806995451*c.g+0.1073969566*c.b;float s=0.0883024619*c.r+0.2817188376*c.g+0.6299787005*c.b;l=pow(l,1./3.);m=pow(m,1./3.);s=pow(s,1./3.);return vec3(0.2104542553*l+0.793617785*m-0.0040720468*s,1.9779984951*l-2.428592205*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.808675766*s);}
vec3 lab2rgb(vec3 c){float l=c.x+0.3963377774*c.y+0.2158037573*c.z;float m=c.x-0.1055613458*c.y-0.0638541729*c.z;float s=c.x-0.0894841775*c.y-1.291485548*c.z;l=l*l*l;m=m*m*m;s=s*s*s;return vec3(4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.707614701*s);}
void main(){
vec2 uv=gl_FragCoord.xy/u_res;
vec2 p=vec2(uv.x*u_res.x/u_res.y,uv.y);
float t=u_time*0.30;
vec2 drift=vec2(t*0.55,t*0.30);
vec2 q=vec2(fbm(p*0.58+vec2(t*0.5,t*0.25)),fbm(p*0.58+vec2(-t*0.4,t*0.45)+4.7));
float n=fbm(p*0.62+q*0.45+drift*0.6);
float n2=fbm(p*0.50+vec2(t*0.30,-t*0.40)+drift*0.4+2.3);
float w=mix(1.0,0.05,smoothstep(0.25,0.75,uv.y));
w*=smoothstep(0.0,0.30,uv.y)*0.06+0.94;
vec3 indigo=s2l(vec3(0.18,0.23,0.62));
vec3 peri=s2l(vec3(0.43,0.55,0.97));
vec3 violet=s2l(vec3(0.56,0.49,1.0));
vec3 orchid=s2l(vec3(0.84,0.61,0.94));
vec3 lperi=s2l(vec3(0.73,0.78,1.0));
vec3 lab=rgb2lab(s2l(vec3(0.043,0.043,0.063)));
lab=mix(lab,rgb2lab(indigo),smoothstep(-0.95,0.55,n)*0.5*w);
lab=mix(lab,rgb2lab(peri),smoothstep(-0.55,1.05,n2)*0.75*w);
lab=mix(lab,rgb2lab(violet),smoothstep(-0.8,0.85,n*0.4+q.y*0.6)*0.45*w);
lab=mix(lab,rgb2lab(orchid),smoothstep(0.15,1.25,n2+q.x*0.35)*0.3*w);
lab=mix(lab,rgb2lab(lperi),smoothstep(0.5,1.3,q.x*0.6+n*0.4)*0.18*w);
lab.x=min(lab.x,0.62);
vec3 col=l2s(lab2rgb(lab));
gl_FragColor=vec4(col,1.0);}`;
  const mk = (t, src) => { const sh = gl.createShader(t); gl.shaderSource(sh, src); gl.compileShader(sh); return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null; };
  const prog = gl.createProgram();
  const vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { cv.style.display = "none"; return; }
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const resize = () => {
    const r = cv.getBoundingClientRect();
    const w = Math.round((r.width || innerWidth) * 0.4), h = Math.round((r.height || innerHeight) * 0.4);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h); }
  };
  new ResizeObserver(resize).observe(cv);
  resize();
  cv.dataset.frames = "0";
  let visible = true, dead = false, running = false, last = 0;
  const frame = (t) => {
    running = false;
    if (dead || !visible || reducedMq.matches) return;
    if (t - last < 25) { running = true; requestAnimationFrame(frame); return; }
    last = t;
    gl.uniform1f(uTime, t / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cv.dataset.frames = String(+cv.dataset.frames + 1);
    running = true;
    requestAnimationFrame(frame);
  };
  const start = () => {
    if (!running && visible && !dead && !reducedMq.matches) {
      running = true;
      requestAnimationFrame(frame);
    }
  };
  const heroEl = document.querySelector(".hero") || cv;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !document.hidden) start();
  }).observe(heroEl);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible) start();
  });
  cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); dead = true; });
  cv.addEventListener("webglcontextrestored", () => { dead = false; start(); });
  // always render one frame (static for reduced motion / first paint)
  requestAnimationFrame((t) => {
    gl.uniform1f(uTime, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cv.dataset.frames = "1";
    start();
  });
})();

/* ====== scatter graphic: scroll-driven --p + caption swap ====== */
(function initScatter() {
  const sc = document.querySelector(".scatter");
  if (!sc) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const smooth = (x) => x * x * (3 - 2 * x);
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = sc.getBoundingClientRect();
    const vh = innerHeight;
    let p = (vh * 0.92 - r.top) / (vh * 0.92 - vh * 0.42);
    p = Math.max(0, Math.min(1, p));
    sc.style.setProperty("--p", reduced.matches ? 1 : smooth(p).toFixed(4));
    sc.dataset.full = p >= 0.6 ? "1" : "0";
  };
  if (reduced.matches) { sc.style.setProperty("--p", 1); sc.dataset.full = "1"; return; }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener("resize", update);
  update();
})();

/* ====== keep diagram: step buttons + autoplay ====== */
(function initKeepDiagram() {
  const steps = [...document.querySelectorAll(".kstep")];
  const stage = document.querySelector(".keep-stage");
  if (!steps.length || !stage) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let cur = 1, timer = null, idle = 0;
  const spokes = [...stage.querySelectorAll(".kd-spoke")];
  const nodes = [...stage.querySelectorAll(".kd-node")];
  const spokeSvg = stage.querySelector(".kd-spokes");
  const phone = stage.querySelector(".kd-phone");
  const layoutSpokes = () => {
    const sr = stage.getBoundingClientRect();
    if (!sr.width || stage.dataset.step !== "3") return;
    spokeSvg.setAttribute("viewBox", `0 0 ${sr.width} ${sr.height}`);
    stage.classList.add("kd-px");
    const ph = phone.getBoundingClientRect();
    const hub = [ph.right - sr.left, (ph.top + ph.bottom) / 2 - sr.top];
    nodes.forEach((n, i) => {
      const r = n.getBoundingClientRect();
      const l = r.left - sr.left, t = r.top - sr.top, rt = r.right - sr.left, b = r.bottom - sr.top;
      const mids = [[l, (t + b) / 2], [rt, (t + b) / 2], [(l + rt) / 2, t], [(l + rt) / 2, b]];
      let best = mids[0], bd = 1e9;
      for (const m of mids) { const dd = Math.hypot(m[0] - hub[0], m[1] - hub[1]); if (dd < bd) { bd = dd; best = m; } }
      if (bd < 1) return;
      const ux = (best[0] - hub[0]) / bd, uy = (best[1] - hub[1]) / bd;
      spokes[i].setAttribute("d", `M ${hub[0].toFixed(1)} ${hub[1].toFixed(1)} L ${(best[0] - ux * 1.5).toFixed(1)} ${(best[1] - uy * 1.5).toFixed(1)}`);
    });
  };
  new ResizeObserver(() => { clearTimeout(layoutSpokes._t); layoutSpokes._t = setTimeout(layoutSpokes, 80); }).observe(stage);
  phone.addEventListener("transitionend", () => { clearTimeout(layoutSpokes._t); layoutSpokes._t = setTimeout(layoutSpokes, 60); });
  const select = (n) => {
    cur = n;
    stage.dataset.step = String(n);
    clearTimeout(layoutSpokes._t2);
    layoutSpokes._t2 = setTimeout(() => { layoutSpokes(); layoutSpokes._t3 = setTimeout(layoutSpokes, 500); }, 800);
    steps.forEach((b) => {
      const on = +b.dataset.step === n;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
  };
  const next = () => select((cur % 3) + 1);
  const start = () => {
    stop();
    if (!reduced.matches) timer = setInterval(next, 5000);
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const userPause = () => { stop(); clearTimeout(idle); idle = setTimeout(start, 8000); };
  steps.forEach((b) =>
    b.addEventListener("click", () => { select(+b.dataset.step); userPause(); }),
  );
  const wrap = document.querySelector(".keep-split");
  wrap.addEventListener("mouseenter", stop);
  wrap.addEventListener("mouseleave", userPause);
  wrap.addEventListener("focusin", stop);
  wrap.addEventListener("focusout", userPause);
  wrap.addEventListener("touchstart", userPause, { passive: true });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && e.intersectionRatio >= 0.4 && !document.hidden) start();
    else stop();
  }, { threshold: [0, 0.4, 1] }).observe(stage);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else start();
  });
  if (reduced.matches) select(3); else select(1);
})();

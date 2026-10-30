// Captures live coach-app states into sanitized HTML fragments + pruned CSS.
//   node website/tools/capture-app.mjs [--only name1,name2]
// Local-only: reads http://127.0.0.1:3000, writes website/assets/app/.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome } from "./cdp.mjs";
import {
  STATES,
  BASE,
  STORAGE_KEY,
  ACCENT,
  SVG_FILE,
  VIEWPORTS,
  READY,
  SEED_EVAL,
} from "./capture-states.mjs";
import {
  sanitizeMarkup,
  rewriteForShadow,
  extractFontFaces,
  pruneCss,
  listSelectors,
  listMediaConditions,
  flattenMedia,
  resolveViewportUnits,
  resolveStyleUnits,
} from "./sanitize.mjs";

const WEBSITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(WEBSITE, "assets", "app");
const STATES_DIR = path.join(OUT, "states");
const FONTS_DIR = path.join(OUT, "fonts");

mkdirSync(STATES_DIR, { recursive: true });
mkdirSync(FONTS_DIR, { recursive: true });

// Vari8 wordmark for the sidebar brand swap (DOM-only, never source).
let wordmark = readFileSync(SVG_FILE, "utf8")
  .replace(/<\?xml[^?]*\?>/, "")
  .trim();
wordmark = wordmark.replace(
  /<svg\b/,
  '<svg height="22" style="height:22px;width:auto;display:block"',
);

const SWAP_BRAND = `(() => {
  const b = document.querySelector(".cd-brand");
  if (!b) return "no .cd-brand";
  b.innerHTML = ${JSON.stringify(wordmark)};
  return "swapped";
})()`;


// ---------------------------------------------------------------------------

async function waitFor(client, expression, timeoutMs = 60000, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await client.evaluate(`Boolean(${expression})`)) return;
    } catch {
      /* navigation in flight */
    }
    await delay(250);
  }
  let probe = "unavailable";
  try {
    probe = await client.evaluate(
      `JSON.stringify({url: location.href, ready: document.readyState, root: !!document.querySelector(".coach-root"), text: (document.body?.innerText || "").slice(0, 240)})`,
    );
  } catch (e) {
    probe = `probe failed: ${e.message}`;
  }
  throw new Error(
    `waitFor timed out (${timeoutMs}ms): ${label ?? expression} | page: ${probe}`,
  );
}

const waitExpr = (w) =>
  w.startsWith("expr:")
    ? w.slice(5)
    : `!!document.querySelector(${JSON.stringify(w)})`;

async function settle(client, ms = 700) {
  try {
    await client.evaluate("document.fonts.ready.then(() => 1)");
  } catch {}
  await delay(ms);
}

async function applyTyping(client, typing) {
  const sel = JSON.stringify(typing.selector);
  await waitFor(
    client,
    `!!document.querySelector(${sel})`,
    30000,
    `typing target ${typing.selector}`,
  );
  const ok = await client.evaluate(`(() => {
    const el = document.querySelector(${sel});
    if (!el) return false;
    el.focus();
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(
      el, ${JSON.stringify(typing.text)});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return el.value.length;
  })()`);
  if (!ok) throw new Error(`typing failed: ${typing.selector}`);
  await delay(300);
}

async function runSteps(client, steps) {
  for (const step of steps ?? []) {
    if (step.waitFor)
      await waitFor(client, waitExpr(step.waitFor), 45000, step.waitFor);
    if (step.click) {
      const ok = await client.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(step.click)});
        el?.click();
        return Boolean(el);
      })()`);
      if (!ok) throw new Error(`step click found nothing: ${step.click}`);
      await delay(250);
    }
    if (step.evaluate) {
      const result = await client.evaluate(step.evaluate);
      if (result === false)
        throw new Error(`step evaluate returned false: ${step.evaluate.slice(0, 120)}`);
    }
    if (step.delayMs) await delay(step.delayMs);
  }
}

// In-page serializer: deep-clones `select` matches under shallow clones of
// their ancestors (down from .coach-root), snapshots form values, inlines
// images as data URLs, and reports which stylesheet selectors match the
// captured nodes (for CSS pruning). Returns { html, width, height, matched }
// or { error }.
const CAPTURE_FN = `async (select, selectors, pinHeight) => {
  const roots = [...document.querySelectorAll(select)];
  if (!roots.length) return { error: "no match for " + select };
  const coach = document.querySelector(".coach-root");

  const marked = new Set();
  for (const r of roots) {
    for (let p = r; p; p = p.parentElement) marked.add(p);
    r.querySelectorAll("*").forEach((e) => marked.add(e));
  }

  // Pseudo-classes/elements are stripped for matching; :where()/:is() are
  // unwrapped so their inner selector still has to match a captured node.
  const stripPseudos = (sel) => {
    const inner = (s) => {
      let out = "";
      let i = 0;
      let depth = 0;
      let q = null;
      while (i < s.length) {
        const c = s[i];
        if (q) { out += c; if (c === q) q = null; i++; continue; }
        if (c === "\\\\") { out += s.slice(i, i + 2); i += 2; continue; }
        if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
        if (c === "[") { depth++; out += c; i++; continue; }
        if (c === "]") { depth--; out += c; i++; continue; }
        if (depth === 0 && c === ":") {
          let j = i + 1;
          if (s[j] === ":") j++;
          const nameStart = j;
          while (j < s.length && /[\\w-]/.test(s[j])) j++;
          const name = s.slice(nameStart, j).toLowerCase();
          if (s[j] === "(") {
            let d = 0;
            let k = j;
            while (k < s.length) {
              const ch = s[k];
              if (ch === "\\\\") { k += 2; continue; }
              if (ch === "(") d++;
              else if (ch === ")") { d--; if (!d) { k++; break; } }
              k++;
            }
            const arg = s.slice(j + 1, k - 1);
            if (name === "where" || name === "is" || name === "matches")
              out += inner(arg);
            i = k;
            continue;
          }
          i = j;
          continue;
        }
        out += c;
        i++;
      }
      return out;
    };
    return inner(sel).trim();
  };

  const matched = [];
  selectors.forEach((sel, idx) => {
    const bare = stripPseudos(sel);
    if (!bare) { matched.push(idx); return; }
    let hit = false;
    try {
      for (const el of document.querySelectorAll(bare))
        if (marked.has(el)) { hit = true; break; }
    } catch {}
    if (hit) matched.push(idx);
  });

  const fixNode = (src, dst) => {
    if (src instanceof HTMLInputElement) {
      if (src.type === "checkbox" || src.type === "radio") {
        if (src.checked) dst.setAttribute("checked", "");
        else dst.removeAttribute("checked");
      } else dst.setAttribute("value", src.value);
    } else if (src instanceof HTMLTextAreaElement) {
      dst.textContent = src.value;
    } else if (src instanceof HTMLSelectElement) {
      const opts = dst.querySelectorAll("option");
      [...src.options].forEach((o, idx) => {
        if (o.selected) opts[idx]?.setAttribute("selected", "");
        else opts[idx]?.removeAttribute("selected");
      });
    }
    const sc = src.children;
    const dc = dst.children;
    for (let i = 0; i < sc.length; i++) fixNode(sc[i], dc[i]);
  };
  const deepClone = (el) => {
    const c = el.cloneNode(true);
    fixNode(el, c);
    return c;
  };

  let lca = roots[0];
  if (roots.length > 1) {
    const chain = [];
    for (let p = roots[0]; p; p = p.parentElement) chain.push(p);
    lca = chain.find((el) => roots.every((r) => el.contains(r))) || roots[0];
  }

  const top = coach && (coach === lca || coach.contains(lca)) ? coach : null;
  const path = [];
  let p = roots.length === 1 ? roots[0].parentElement : lca;
  while (p) {
    if (top) {
      if (p === top) { path.unshift(p); break; }
      if (!top.contains(p)) break;
      path.unshift(p);
      p = p.parentElement;
    } else {
      path.unshift(p);
      p = p.parentElement;
    }
  }

  // Ancestor clones are passthrough wrappers: they keep class/data-mode and
  // inline theme custom properties (so :host-rewritten and theme rules still
  // match), but their page layout — sidebar grids, dialog inset/100vw sizing,
  // overflow clipping — must not position the subtree inside a demo frame.
  const NEUTRAL =
    "position:static!important;inset:auto!important;margin:0!important;" +
    "padding:0!important;width:auto!important;min-width:0!important;" +
    "max-width:none!important;height:auto!important;min-height:0!important;" +
    "max-height:none!important;overflow:visible!important;" +
    "display:block!important;transform:none!important;flex:none!important;" +
    "float:none!important;clear:none!important;background:transparent!important;" +
    "border:0!important;box-shadow:none!important";

  // Scroll offsets are runtime state and do not serialize — reset every
  // scrollable element inside the subtree so fragments render from the start.
  for (const r of roots) {
    r.scrollTop = 0;
    r.scrollLeft = 0;
    r.querySelectorAll("*").forEach((e) => {
      e.scrollTop = 0;
      e.scrollLeft = 0;
    });
  }

  const container = document.createElement("div");
  let inner = container;
  for (const anc of path) {
    const c = anc.cloneNode(false);
    const existing = c.getAttribute("style");
    c.setAttribute("style", (existing ? existing + ";" : "") + NEUTRAL);
    inner.appendChild(c);
    inner = c;
  }
  // Pin each captured root's measured width: live sizing came from grid/flex
  // ancestors that are neutralized here, and without a definite width fr-tracks
  // and flex layouts collapse to min-content inside a shrink-wrap frame.
  for (const r of roots) {
    const c = deepClone(r);
    const b = r.getBoundingClientRect();
    // pinHeight: some roots (the client-app shell) get their live height
    // from flex ancestors that are neutralized here; pin the box so
    // absolute-positioned children (the floating bottom nav) stay inside.
    c.setAttribute(
      "style",
      (c.getAttribute("style") ? c.getAttribute("style") + ";" : "") +
        "width:" + Math.round(b.width) + "px" +
        (pinHeight ? ";height:" + Math.round(b.height) + "px" : ""),
    );
    inner.appendChild(c);
  }

  const imgs = [...container.querySelectorAll("img")];
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      try {
        const blob = await (await fetch(src)).blob();
        const dataUrl = await new Promise((res2) => {
          const fr = new FileReader();
          fr.onload = () => res2(fr.result);
          fr.readAsDataURL(blob);
        });
        img.setAttribute("src", dataUrl);
        img.removeAttribute("srcset");
      } catch {}
    }),
  );

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of roots) {
    const b = r.getBoundingClientRect();
    minX = Math.min(minX, b.left); minY = Math.min(minY, b.top);
    maxX = Math.max(maxX, b.right); maxY = Math.max(maxY, b.bottom);
  }

  return {
    html: container.innerHTML,
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
    matched,
  };
}`;

const COLLECT_CSS = `(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let text = null;
    try { text = [...sheet.cssRules].map((r) => r.cssText).join("\\n"); }
    catch {}
    out.push({ href: sheet.href || location.href, text });
  }
  return out;
})()`;

// ---------------------------------------------------------------------------

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyIdx = process.argv.indexOf("--only");
const onlyList = onlyArg
  ? onlyArg.slice(7).split(",").filter(Boolean)
  : onlyIdx > -1
    ? (process.argv[onlyIdx + 1] ?? "").split(",").filter(Boolean)
    : null;
const specs = onlyList ? STATES.filter((s) => onlyList.includes(s.name)) : STATES;
if (onlyList && specs.length !== onlyList.length) {
  const known = new Set(STATES.map((s) => s.name));
  const missing = onlyList.filter((n) => !known.has(n));
  console.error(`unknown state names: ${missing.join(", ")}`);
  process.exit(2);
}

const client = await launchChrome({ width: 1440, height: 900, dpr: 1 });
// The app is captured in dark mode; emulate the scheme so matchMedia()
// (used to flatten @media blocks) resolves colour-scheme queries as the
// app actually saw them.
await client.send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "dark" }],
});
const failures = [];
const manifest = {};
const matchedByVp = new Map();

try {
  // --- hydrate, recolour, inject Emma's meal plan ---------------------------
  await client.send("Page.navigate", {
    url: `${BASE}/coach?section=clients`,
  });
  await waitFor(client, READY, 120000, "first hydration");
  await waitFor(
    client,
    `(() => { try { const s = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})); return !!(s && s.clients && s.clients[0] && s.clients[0].plans); } catch { return false; } })()`,
    30000,
    "localStorage seeded",
  );
  const mutate = await client.evaluate(SEED_EVAL);
  console.log("localStorage mutated:", JSON.stringify(mutate));
  await client.send("Page.navigate", { url: `${BASE}/coach?section=clients` });
  await waitFor(client, READY, 90000, "hydration after recolour");
  const accent = await client.evaluate(
    `getComputedStyle(document.querySelector(".coach-root")).getPropertyValue("--cd-accent").trim()`,
  );
  console.log("computed --cd-accent:", accent);
  if (accent.toLowerCase() !== ACCENT.toLowerCase())
    throw new Error(`recolour did not apply (accent=${accent})`);

  // --- stylesheet text (once) ----------------------------------------------
  const sheets = await client.evaluate(COLLECT_CSS);
  const cssParts = [];
  for (const sheet of sheets) {
    if (sheet.text != null) cssParts.push(sheet.text);
    else if (sheet.href) cssParts.push(await (await fetch(sheet.href)).text());
  }
  const cssAll = cssParts.join("\n");
  const allSelectors = listSelectors(cssAll);
  const mediaConds = listMediaConditions(cssAll);
  console.log(
    `collected ${sheets.length} sheets, ${cssAll.length} chars, ${allSelectors.length} selectors, ${mediaConds.length} media conditions`,
  );

  // For each viewport used by the requested states, record the layout
  // viewport the app actually sees (clientWidth/clientHeight) and evaluate
  // every @media condition there — the CSS is emitted per viewport with
  // media blocks flattened and viewport units resolved to px, so fragments
  // cannot reflow when the host page's viewport differs.
  const vpCtx = new Map();
  for (const vpName of new Set(specs.map((s) => s.viewport))) {
    const vp = VIEWPORTS[vpName];
    await client.setViewport(vp.width, vp.height, vp.dpr, vp.mobile);
    const dims = JSON.parse(
      await client.evaluate(
        `JSON.stringify({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight })`,
      ),
    );
    const results = JSON.parse(
      await client.evaluate(
        `JSON.stringify(${JSON.stringify(mediaConds)}.map((c) => { try { return matchMedia(c).matches; } catch { return false; } }))`,
      ),
    );
    const condMap = new Map(mediaConds.map((c, i) => [c, results[i]]));
    vpCtx.set(vpName, {
      dims,
      matches: (cond) => condMap.get(cond.trim()) ?? false,
    });
    console.log(
      `viewport ${vpName}: layout ${dims.width}x${dims.height}, ${results.filter(Boolean).length}/${results.length} media conditions match`,
    );
  }

  // --- states ---------------------------------------------------------------
  for (const spec of specs) {
    try {
      const vp = VIEWPORTS[spec.viewport];
      await client.setViewport(vp.width, vp.height, vp.dpr, vp.mobile);
      await client.send("Page.navigate", { url: `${BASE}${spec.url}` });
      await waitFor(client, READY, 90000, `hydrate ${spec.name}`);
      if (spec.typing) await applyTyping(client, spec.typing);
      await runSteps(client, spec.steps);
      await client.evaluate(SWAP_BRAND);
      await settle(client);
      const result = await client.evaluate(
        `(${CAPTURE_FN})(${JSON.stringify(spec.select)}, ${JSON.stringify(allSelectors)}, ${spec.pinHeight === true})`,
      );
      if (result?.error) throw new Error(result.error);
      if (!matchedByVp.has(spec.viewport))
        matchedByVp.set(spec.viewport, new Set());
      const matchedSet = matchedByVp.get(spec.viewport);
      for (const i of result.matched) matchedSet.add(allSelectors[i]);
      const html = resolveStyleUnits(
        sanitizeMarkup(result.html, { idPrefix: spec.name }),
        vpCtx.get(spec.viewport).dims,
      );
      writeFileSync(path.join(STATES_DIR, `${spec.name}.html`), html);
      manifest[spec.name] = {
        // phone fragments mount at the capture viewport width (the
        // client-app shell is full-bleed at 390px)
        width: spec.viewport === "phone" ? vp.width : result.width,
        height: result.height,
        viewport: spec.viewport,
        css: `app-${spec.viewport}.css`,
      };
      console.log(`${spec.name}: ${Buffer.byteLength(html)} bytes`);
    } catch (err) {
      failures.push(`${spec.name}: ${err.message}`);
      console.error(`FAILED ${spec.name}: ${err.message}`);
    }
  }

  // --- CSS + fonts + manifest ------------------------------------------------
  let fontFaces = extractFontFaces(cssAll);
  const cssSizes = [];
  for (const [vpName, ctx] of vpCtx) {
    const set = matchedByVp.get(vpName) ?? new Set();
    const flat = flattenMedia(cssAll, ctx.matches);
    const pruned = pruneCss(flat, (sel) => set.has(sel));
    const out = resolveViewportUnits(rewriteForShadow(pruned), ctx.dims);
    writeFileSync(path.join(OUT, `app-${vpName}.css`), out);
    cssSizes.push(`${vpName}: ${cssAll.length} -> ${out.length} chars`);
  }
  rmSync(path.join(OUT, "app.css"), { force: true });

  const fontUrlRe = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/g;
  const fontMap = new Map();
  for (const m of fontFaces.matchAll(fontUrlRe)) fontMap.set(m[1], null);
  for (const raw of fontMap.keys()) {
    try {
      const abs = new URL(raw, BASE);
      const file = path.basename(abs.pathname);
      const body = Buffer.from(await (await fetch(abs)).arrayBuffer());
      writeFileSync(path.join(FONTS_DIR, file), body);
      fontMap.set(raw, `fonts/${file}`);
    } catch (err) {
      console.error(`font fetch failed: ${raw}: ${err.message}`);
    }
  }
  fontFaces = fontFaces.replace(
    fontUrlRe,
    (_, u) => `url(${fontMap.get(u) ?? u})`,
  );

  writeFileSync(path.join(OUT, "app-fonts.css"), fontFaces + "\n");
  writeFileSync(
    path.join(OUT, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    `css: ${cssSizes.join(" | ")} | fonts: ${[...fontMap.values()].filter(Boolean).length}/${fontMap.size} files`,
  );
} finally {
  await client.close();
}

if (failures.length) {
  console.error(`\n${failures.length} state(s) failed:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("capture complete");

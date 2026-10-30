import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeMarkup,
  rewriteForShadow,
  extractFontFaces,
  pruneCss,
  flattenMedia,
  resolveViewportUnits,
  resolveStyleUnits,
} from "./sanitize.mjs";

test("sanitizeMarkup strips scripts and handlers", () => {
  const out = sanitizeMarkup(
    '<div class="a" onclick="x()"><script>1</script><b data-reactroot="">t</b></div>',
  );
  assert.equal(out, '<div class="a"><b>t</b></div>');
});

test("sanitizeMarkup prefixes ids and references when idPrefix is set", () => {
  const out = sanitizeMarkup(
    '<label id="l1" for="f1"><input id="f1" aria-labelledby="l1 other" aria-describedby="d1"></label><a href="#f1">x</a><svg><use xlink:href="#i1"/><rect fill="url(#g1)"/></svg><g id="g1"/><i id="i1"/>',
    { idPrefix: "state" },
  );
  assert.match(out, /id="state--l1"/);
  assert.match(out, /for="state--f1"/);
  assert.match(out, /aria-labelledby="state--l1 state--other"/);
  assert.match(out, /aria-describedby="state--d1"/);
  assert.match(out, /href="#state--f1"/);
  assert.match(out, /xlink:href="#state--i1"/);
  assert.match(out, /url\(#state--g1\)/);
  assert.doesNotMatch(out, /id="l1"/);
});

test("rewriteForShadow maps root selectors to :host and drops font-face", () => {
  const out = rewriteForShadow(
    ":root{--a:1}html,body{margin:0}@font-face{font-family:X;src:url(x.woff2)}.b{c:d}",
  );
  assert.match(out, /:host\{--a:1\}/);
  assert.doesNotMatch(out, /@font-face/);
  assert.match(out, /\.b\{c:d\}/);
});

test("extractFontFaces keeps only font-face", () => {
  assert.equal(
    extractFontFaces(".a{b:c}@font-face{font-family:X}").trim(),
    "@font-face{font-family:X}",
  );
});

test("pruneCss keeps matching rules inside media and drops empty blocks", () => {
  const out = pruneCss(
    ".keep{a:b}.drop{c:d}@media (min-width:1px){.keep{e:f}.drop{g:h}}@media print{.drop{i:j}}",
    (s) => s === ".keep",
  );
  assert.equal(
    out.replace(/\s+/g, ""),
    ".keep{a:b}@media(min-width:1px){.keep{e:f}}",
  );
});

test("flattenMedia unwraps matching @media and drops non-matching", () => {
  const out = flattenMedia("@media (min-width:600px){.a{b:c}}", () => true);
  assert.equal(out, ".a{b:c}");
  const off = flattenMedia("@media (min-width:600px){.a{b:c}}", () => false);
  assert.equal(off, "");
  const nested = flattenMedia(
    ".x{p:q}@layer l{@media (min-width:600px){.m{u:v}}}@supports (a:b){@media print{.s{t:u}}.k{l:m}}",
    (cond) => cond.trim() === "(min-width:600px)",
  );
  assert.equal(nested, ".x{p:q}@layer l{.m{u:v}}@supports (a:b){.k{l:m}}");
});

test("resolveViewportUnits resolves the vw/vh family against given dims", () => {
  const out = resolveViewportUnits(
    ".a{width:50vw}.b{height:calc(100dvh - 10px)}.c{top:10vmin}.d{left:10vmax}",
    { width: 1440, height: 844 },
  );
  assert.match(out, /width:720px/);
  assert.match(out, /calc\(844px - 10px\)/);
  assert.match(out, /top:84\.4px/);
  assert.match(out, /left:144px/);
  const untouched = resolveViewportUnits(
    '.a{background:url("data:image/svg+xml,3vw")}.b{content:"50vw"}',
    { width: 1440, height: 844 },
  );
  assert.match(untouched, /3vw/);
  assert.match(untouched, /"50vw"/);
});

test("resolveStyleUnits rewrites inline styles only", () => {
  const out = resolveStyleUnits(
    '<div style="width:100vw" data-x="2vw">50vw</div>',
    { width: 390, height: 844 },
  );
  assert.equal(out, '<div style="width:390px" data-x="2vw">50vw</div>');
});

test(
  "captured output has no pink and no scripts",
  { skip: !process.env.CHECK_OUTPUT },
  async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const dir = new URL("../assets/app/", import.meta.url);
    const files = [
      "app-desktop.css",
      "app-phone.css",
      ...readdirSync(new URL("states/", dir)).map((f) => "states/" + f),
    ];
    for (const f of files) {
      const s = readFileSync(new URL(f, dir), "utf8");
      assert.doesNotMatch(
        s,
        /#eb91b8|rgb\(235,\s*145,\s*184\)|<script|\son[a-z]+=/i,
        f,
      );
      if (f.startsWith("states/"))
        assert.doesNotMatch(s, />\s*infinity\s*</i, f);
    }
    const manifest = JSON.parse(
      readFileSync(new URL("manifest.json", dir), "utf8"),
    );
    for (const name of [
      "coach-overview",
      "coach-training-draft",
      "coach-checkins-queue",
      "coach-checkin-typed",
      "client-home",
      "client-tracker",
      "client-trends",
      "tile-training-w1",
      "tile-checkins",
      "tile-nutrition-rest",
      "tile-progress",
      "templates-card",
      "coach-timeline",
      "client-nutrition-refeed",
    ])
      assert.ok(manifest[name]?.width > 0, name);
  },
);

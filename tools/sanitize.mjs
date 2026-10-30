// String-level sanitizers for captured app markup and CSS. No DOM, no deps.

const BANNED_ATTRS =
  /^(?:on[a-z]+|autofocus|data-reactroot|data-react-[a-z-]*|__react[a-z$].*|data-capture)$/i;

const ATTR_NAME = /^[a-zA-Z_:][\w:.-]*/;
const ATTR_VALUE = /^\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/;

// Runs `fn` on every tag (text between < and > honoring quoted attribute
// values). Comments, doctypes, PIs and closing tags pass through untouched.
function processTags(html, fn) {
  let out = "";
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      const stop = end < 0 ? n : end + 3;
      out += html.slice(lt, stop);
      i = stop;
      continue;
    }
    const next = html[lt + 1];
    if (next === "!" || next === "?" || next === "/") {
      const end = html.indexOf(">", lt);
      const stop = end < 0 ? n : end + 1;
      out += html.slice(lt, stop);
      i = stop;
      continue;
    }
    // find tag end, respecting quoted attribute values
    let j = lt + 1;
    let quote = null;
    while (j < n) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === ">") {
        break;
      }
      j++;
    }
    out += fn(html.slice(lt, j + 1));
    i = j + 1;
  }
  return out;
}

function cleanTag(tag) {
  const headMatch = tag.match(/^<\s*[a-zA-Z][\w:-]*/);
  if (!headMatch) return tag;
  const head = headMatch[0];
  const tail = tag.endsWith("/>") ? "/>" : ">";
  const body = tag.slice(head.length, tag.length - tail.length);
  let out = "";
  let i = 0;
  while (i < body.length) {
    if (/\s/.test(body[i])) {
      const m = body.slice(i).match(/^(\s+)([a-zA-Z_:][\w:.-]*)?/);
      const space = m[1];
      const name = m[2];
      if (!name) {
        out += space;
        i += space.length;
        continue;
      }
      let j = i + space.length + name.length;
      const eq = body.slice(j).match(ATTR_VALUE);
      const end = eq ? j + eq[0].length : j;
      if (!BANNED_ATTRS.test(name)) out += body.slice(i, end);
      i = end;
      continue;
    }
    out += body[i];
    i++;
  }
  return head + out + tail;
}

/**
 * Sanitizes serialized app markup: drops <script>, inline handlers, React
 * internals and autofocus. With { idPrefix } every id="x" and every reference
 * to it (for, aria-labelledby/describedby/controls/activedescendant/owns,
 * href="#x", xlink:href="#x", url(#x)) is rewritten to `${idPrefix}--x`.
 */
export function sanitizeMarkup(html, { idPrefix } = {}) {
  let out = String(html);
  out = out
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*>/gi, "");
  out = processTags(out, cleanTag);
  if (idPrefix) {
    const p = `${idPrefix}--`;
    out = out.replace(/\bid="([^"]+)"/g, (_, v) => `id="${p}${v}"`);
    for (const attr of [
      "for",
      "aria-controls",
      "aria-activedescendant",
      "aria-owns",
      "aria-details",
    ])
      out = out.replace(
        new RegExp(`\\b${attr}="([^"]+)"`, "g"),
        (_, v) => `${attr}="${p}${v}"`,
      );
    for (const attr of ["aria-labelledby", "aria-describedby"])
      out = out.replace(
        new RegExp(`\\b${attr}="([^"]+)"`, "g"),
        (_, v) =>
          `${attr}="${v
            .trim()
            .split(/\s+/)
            .map((t) => `${p}${t}`)
            .join(" ")}"`,
      );
    out = out.replace(
      /\b(href|xlink:href)="#([^"]+)"/g,
      (_, attr, v) => `${attr}="#${p}${v}"`,
    );
    out = out.replace(/url\(\s*#([^)\s]+)\s*\)/g, (_, v) => `url(#${p}${v})`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// CSS helpers — a scanner that tracks brace depth and skips strings/comments.
// ---------------------------------------------------------------------------

function scanCss(css) {
  const items = [];
  let i = 0;
  const n = css.length;
  const skipTrivia = () => {
    while (i < n) {
      if (css.startsWith("/*", i)) {
        const end = css.indexOf("*/", i + 2);
        i = end < 0 ? n : end + 2;
      } else if (/\s/.test(css[i])) i++;
      else break;
    }
  };
  while (true) {
    skipTrivia();
    if (i >= n) break;
    const start = i;
    let depth = 0;
    let quote = null;
    while (i < n) {
      const c = css[i];
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (css.startsWith("/*", i)) {
        const end = css.indexOf("*/", i + 2);
        i = end < 0 ? n : end + 2;
        continue;
      } else if (c === "\\") {
        i++; // escaped char (e.g. \( \] \' in Tailwind idents) — skip it
      } else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (depth === 0 && (c === "{" || c === ";" || c === "}")) break;
      i++;
    }
    const header = css.slice(start, i).trim();
    if (css[i] === ";" || css[i] === "}") {
      if (header) items.push({ kind: "stmt", header });
      i++;
      continue;
    }
    if (css[i] === "{") {
      i++;
      const bodyStart = i;
      depth = 1;
      quote = null;
      while (i < n && depth > 0) {
        const c = css[i];
        if (quote) {
          if (c === "\\") i++;
          else if (c === quote) quote = null;
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (css.startsWith("/*", i)) {
          const end = css.indexOf("*/", i + 2);
          i = end < 0 ? n : end + 2;
          continue;
        } else if (c === "\\") i++;
        else if (c === "{") depth++;
        else if (c === "}") depth--;
        i++;
      }
      items.push({ kind: "block", header, body: css.slice(bodyStart, i - 1) });
      continue;
    }
    if (header) items.push({ kind: "stmt", header });
    break;
  }
  return items;
}

// Splits a selector list on top-level commas (skips (), [] and strings).
function splitSelectors(header) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < header.length; i++) {
    const c = header[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(header.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(header.slice(start));
  return parts;
}

function mapRootSelector(selector) {
  let s = selector.trim();
  s = s.replace(/^html\s+body\b/, ":host");
  s = s.replace(/^(?::root|html|body)\b/, ":host");
  return s;
}

const GROUP_AT_RULE = /^@(media|supports|container|layer|scope)\b/i;
const KEEP_AT_BLOCK =
  /^@(-\w+-)?(font-face|keyframes|property|font-feature-values|counter-style|viewport|starting-style)\b/i;

/**
 * Rewrites captured app CSS for use inside a shadow root: :root, html and body
 * selectors become :host; @font-face blocks are dropped (move them to a
 * page-level sheet via extractFontFaces).
 */
export function rewriteForShadow(css) {
  return scanCss(css)
    .map((item) => {
      if (item.kind === "stmt") return item.header ? `${item.header};` : "";
      const h = item.header.trim();
      if (!h) return "";
      if (h.startsWith("@")) {
        if (/^@font-face/i.test(h)) return "";
        if (GROUP_AT_RULE.test(h)) {
          const inner = rewriteForShadow(item.body);
          return inner ? `${h}{${inner}}` : "";
        }
        return `${h}{${item.body}}`;
      }
      const mapped = splitSelectors(h).map(mapRootSelector).filter(Boolean);
      const unique = [...new Set(mapped)];
      return `${unique.join(",")}{${item.body}}`;
    })
    .filter(Boolean)
    .join("");
}

/** Returns just the @font-face blocks of a stylesheet, joined by newlines. */
export function extractFontFaces(css) {
  return scanCss(css)
    .filter(
      (item) => item.kind === "block" && /^@font-face/i.test(item.header.trim()),
    )
    .map((item) => `@font-face{${item.body}}`)
    .join("\n");
}

/** Lists every style-rule selector text found in a stylesheet (any depth). */
export function listSelectors(css) {
  const out = [];
  const walk = (text) => {
    for (const item of scanCss(text)) {
      if (item.kind !== "block") continue;
      const h = item.header.trim();
      if (h.startsWith("@")) {
        if (GROUP_AT_RULE.test(h) || !KEEP_AT_BLOCK.test(h)) walk(item.body);
        continue;
      }
      for (const sel of splitSelectors(h)) {
        const s = sel.trim();
        if (s) out.push(s);
      }
    }
  };
  walk(css);
  return out;
}

/**
 * Keeps rules whose selector list has at least one matching selector.
 * @keyframes/@property/@font-face and bare @layer statements survive;
 * @media/@supports/@container/@layer blocks are recursed into and dropped
 * when they end up empty.
 */
export function pruneCss(css, matches) {
  return scanCss(css)
    .map((item) => {
      if (item.kind === "stmt") return `${item.header};`;
      const h = item.header.trim();
      if (!h) return "";
      if (h.startsWith("@")) {
        if (KEEP_AT_BLOCK.test(h)) return `${h}{${item.body}}`;
        if (GROUP_AT_RULE.test(h) || true) {
          const inner = pruneCss(item.body, matches);
          return inner ? `${h}{${inner}}` : "";
        }
      }
      const sels = splitSelectors(h)
        .map((s) => s.trim())
        .filter(Boolean);
      if (sels.some((sel) => matches(sel))) return `${h}{${item.body}}`;
      return "";
    })
    .filter(Boolean)
    .join("");
}

/** Collects every @media condition text in a stylesheet (any depth). */
export function listMediaConditions(css) {
  const out = [];
  const walk = (text) => {
    for (const item of scanCss(text)) {
      if (item.kind !== "block") continue;
      const h = item.header.trim();
      if (/^@media\b/i.test(h)) out.push(h.slice(6).trim());
      if (h.startsWith("@") && GROUP_AT_RULE.test(h)) walk(item.body);
    }
  };
  walk(css);
  return out;
}

/**
 * Flattens @media blocks for one fixed evaluation: `matches(conditionText)`
 * decides each block — matching ones are unwrapped (rules kept inline),
 * non-matching dropped. @supports/@container/@layer/@scope blocks survive
 * intact (nested @media inside them is still flattened); @font-face,
 * @keyframes and other leaf at-rules pass through verbatim.
 */
export function flattenMedia(css, matches) {
  const walk = (text) =>
    scanCss(text)
      .map((item) => {
        if (item.kind === "stmt") return item.header ? `${item.header};` : "";
        const h = item.header.trim();
        if (!h) return "";
        if (/^@media\b/i.test(h))
          return matches(h.slice(6).trim()) ? walk(item.body) : "";
        if (h.startsWith("@")) {
          if (GROUP_AT_RULE.test(h)) return `${h}{${walk(item.body)}}`;
          return `${h}{${item.body}}`;
        }
        return `${h}{${item.body}}`;
      })
      .filter(Boolean)
      .join("");
  return walk(css);
}

const VUNIT =
  /(-?\d*\.?\d+)(lvw|svw|dvw|lvh|svh|dvh|vmin|vmax|vw|vh)\b/gi;

/**
 * Replaces viewport-relative units with px resolved against `dims`
 * ({ width, height } — the layout viewport the captured page actually saw).
 * Comments, quoted strings and unquoted url() args are left untouched.
 */
export function resolveViewportUnits(css, { width, height }) {
  const vmin = Math.min(width, height);
  const vmax = Math.max(width, height);
  const replace = (seg) =>
    seg.replace(VUNIT, (m, raw, unit) => {
      const v = parseFloat(raw);
      const u = unit.toLowerCase();
      const basis =
        u === "vmin" ? vmin : u === "vmax" ? vmax : u.endsWith("w") ? width : height;
      const px = Math.round((v * basis) / 100 * 100) / 100;
      return `${px}px`;
    });
  let out = "";
  let seg = 0;
  let i = 0;
  const n = css.length;
  const cut = (end) => {
    out += replace(css.slice(seg, end));
  };
  while (i < n) {
    const c = css[i];
    if (css.startsWith("/*", i)) {
      cut(i);
      const e = css.indexOf("*/", i + 2);
      const stop = e < 0 ? n : e + 2;
      out += css.slice(i, stop);
      i = seg = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      cut(i);
      let j = i + 1;
      while (j < n && css[j] !== c) {
        if (css[j] === "\\") j++;
        j++;
      }
      out += css.slice(i, Math.min(j + 1, n));
      i = seg = j + 1;
      continue;
    }
    if (
      (c === "u" || c === "U") &&
      css.slice(i, i + 4).toLowerCase() === "url("
    ) {
      let k = i + 4;
      while (k < n && /\s/.test(css[k])) k++;
      if (k < n && css[k] !== '"' && css[k] !== "'") {
        // unquoted url(…) — copy verbatim so data URIs can't be rewritten
        cut(i);
        seg = i;
        let depth = 0;
        while (i < n) {
          if (css[i] === "(") depth++;
          else if (css[i] === ")") {
            depth--;
            if (!depth) {
              i++;
              break;
            }
          }
          i++;
        }
        out += css.slice(seg, i);
        seg = i;
        continue;
      }
    }
    i++;
  }
  out += replace(css.slice(seg));
  return out;
}

/** Applies resolveViewportUnits to style="…" attributes in markup. */
export function resolveStyleUnits(html, dims) {
  return processTags(html, (tag) =>
    tag.replace(
      /\bstyle="([^"]*)"/g,
      (_, v) => `style="${resolveViewportUnits(v, dims)}"`,
    ),
  );
}

// Inlines captured app fragments into index.html.
//   node website/tools/inline-states.mjs
// Replaces every `<!-- state:NAME -->…<!-- /state -->` block with the current
// contents of assets/app/states/NAME.html. Idempotent — the markers stay, so a
// second run produces no diff.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEBSITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(WEBSITE, "index.html");
const STATES = path.join(WEBSITE, "assets", "app", "states");

const MARKER = /(<!--\s*state:([\w-]+)\s*-->)[\s\S]*?(<!--\s*\/state\s*-->)/g;

const html = readFileSync(INDEX, "utf8");
let missing = 0;
const out = html.replace(MARKER, (m, open, name, close) => {
  let body;
  try {
    body = readFileSync(path.join(STATES, `${name}.html`), "utf8").trim();
  } catch {
    console.error(`missing state file: ${name}.html`);
    missing++;
    return m;
  }
  return `${open}${body}${close}`;
});
if (missing) process.exit(1);
if (out !== html) {
  writeFileSync(INDEX, out);
  console.log("index.html updated");
} else {
  console.log("index.html already up to date");
}

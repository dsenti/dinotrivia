#!/usr/bin/env node
/* Cache-busting: stamp a version query (?v=…) onto every local CSS/JS asset
   reference in the HTML pages, so a new deploy always invalidates the browser
   cache instead of serving a stale style.css / *.js.
   Usage: node tools/stamp-version.js [version]   (defaults to current epoch) */
const fs = require("fs");
const path = require("path");
const R = path.resolve(__dirname, "..");
const version = process.argv[2] || String(Date.now());
const files = ["index.html", "decide.html", "credits.html"];

// matches css/style.css or js/anything.js, with or without an existing ?v=...
const re = /(href|src)="((?:css|js)\/[A-Za-z0-9_.-]+\.(?:css|js))(?:\?v=[^"]*)?"/g;
let total = 0;
for (const f of files) {
  const p = path.join(R, f);
  if (!fs.existsSync(p)) continue;
  const before = fs.readFileSync(p, "utf8");
  let n = 0;
  const after = before.replace(re, (_, attr, asset) => { n++; return `${attr}="${asset}?v=${version}"`; });
  if (after !== before) { fs.writeFileSync(p, after); total += n; }
  console.log(`${f}: ${n} asset refs stamped`);
}
console.log(`version ${version} · ${total} refs total`);

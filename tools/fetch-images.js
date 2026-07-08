#!/usr/bin/env node
/* Fetch a LIFE-RECONSTRUCTION (paleoart) image per dinosaur from Wikimedia
   Commons. Primary source: the curated "Category:<Genus> life restorations"
   and "<Genus> on white background" categories. Scores candidates to prefer a
   clean single adult restoration and reject size charts, skeletons, babies,
   group scenes, SVGs, maps. Verifies a free license, downloads, downscales,
   and records attribution to assets/dino/credits.json.
   Run:  node tools/fetch-images.js         */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const R = path.resolve(__dirname, "..");
const OUT = path.join(R, "assets", "dino");
const OUT_SMALL = path.join(OUT, "small");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT_SMALL, { recursive: true });

const UA = "DinoTrivia/1.0 (https://github.com/dinotrivia; dominik.senti@gmail.com)";
const H = { headers: { "User-Agent": UA, "Api-User-Agent": UA } };
const COMMONS = "https://commons.wikimedia.org/w/api.php";

const data = JSON.parse(fs.readFileSync(path.join(R, "data/dinosaurs.json"), "utf8"));
const names = data.dinosaurs.map(d => d.name);
const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = h => (h || "").replace(/<[^>]*>/g, "").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

const REJECT = /(size|scale|comparison|compare|skelet|mount|skull|cranium|\bmap\b|stamp|logo|stub|diagram|chart|graph|\bsvg\b|baby|babies|juvenile|hatchling|\begg|nest|footprint|track|mural|parade|group|herd|multiple|fossil|holotype|specimen|tooth|teeth|\bbone|claw|\bcast\b|museum|phylogen|cladogram|coprolite|restoration of the sk|head|_vs_|\bvs\b)/i;
const BOOST = /(white[_ ]background|on[_ ]white|restoration|reconstruction|life)/i;
const ARTIST = /(_nt|_db|durbed|wierum|funkmonk|tamura|hartman|conty|dibgd|paleocolour|paleoart|palaeoart)/i;

async function jget(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, H); if (r.ok) return r.json(); } catch (e) {}
    await sleep(300);
  }
  throw new Error("fetch failed " + url);
}

async function catFiles(cat) {
  const url = `${COMMONS}?action=query&format=json&list=categorymembers&cmtype=file&cmlimit=60&cmtitle=Category:${encodeURIComponent(cat)}`;
  const j = await jget(url);
  return ((j.query && j.query.categorymembers) || []).map(x => x.title);
}

async function mediaListFallback(name) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(name)}`;
  try {
    const j = await jget(url);
    return (j.items || []).filter(it => it.type === "image" && it.title).map(it => it.title).slice(0, 20);
  } catch (e) { return []; }
}

async function infoBatch(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 40) {
    const chunk = titles.slice(i, i + 40);
    const url = `${COMMONS}?action=query&format=json&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=760&titles=`
      + chunk.map(t => encodeURIComponent(t)).join("|");
    const j = await jget(url);
    const pages = (j.query && j.query.pages) || {};
    for (const k in pages) { const p = pages[k]; if (p.imageinfo) out[p.title] = p.imageinfo[0]; }
  }
  return out;
}

function licenseOK(ex) {
  const l = strip(ex && ex.LicenseShortName && ex.LicenseShortName.value).toLowerCase();
  if (!l) return false;
  if (/fair use|non-free|nonfree|all rights/.test(l)) return false;
  return /cc|public domain|\bpd\b|cc0|attribution|share/i.test(l);
}

function scoreOf(title, info, genus) {
  const t = title.replace(/^File:/, "");
  const ex = info.extmetadata || {};
  const cats = strip(ex.Categories && ex.Categories.value);
  const hay = (t + " " + cats).toLowerCase();
  if ((info.mime || "").includes("svg") || /\.svg$/i.test(t)) return -1000;
  if (!(info.mime || "").startsWith("image/")) return -1000;
  let s = 0;
  if (REJECT.test(hay)) s -= 100;
  if (BOOST.test(hay)) s += 30;
  if (ARTIST.test(hay)) s += 25;
  // single-subject preference: penalise obvious multi-animal / compound titles
  if (/[&]| and |,|\+/i.test(t)) s -= 40;
  // genus name present in filename is a good sign it's that animal specifically
  if (t.toLowerCase().includes(genus.toLowerCase())) s += 20;
  if (info.width && info.height) {
    const ar = info.width / info.height;
    if (ar >= 1.1 && ar <= 2.4) s += 18; else if (ar < 0.75) s -= 12;
    if (info.width < 300) s -= 30;
  }
  return s;
}

async function pick(name) {
  let titles = [];
  for (const cat of [`${name} life restorations`, `${name} on white background`, `${name} restorations`]) {
    const f = await catFiles(cat);
    titles.push(...f);
  }
  titles = [...new Set(titles)];
  let usedFallback = false;
  if (titles.length < 2) { titles = [...new Set([...titles, ...(await mediaListFallback(name))])]; usedFallback = true; }
  if (!titles.length) return null;
  const info = await infoBatch(titles);
  const cands = [];
  for (const t of titles) {
    const i = info[t];
    if (!i || !licenseOK(i.extmetadata)) continue;
    cands.push({ title: t, info: i, score: scoreOf(t, i, name) });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  return Object.assign({ usedFallback }, cands[0]);
}

const dl = (url, dest) => execFileSync("curl", ["-sL", "-A", UA, "-o", dest, url], { stdio: "ignore" });
const rz = (src, dest, w) => execFileSync("sips", ["-Z", String(w), src, "--out", dest], { stdio: "ignore" });

(async () => {
  const credits = [], missing = [], review = [];
  for (const name of names) {
    try {
      const p = await pick(name);
      if (!p) { missing.push(name); console.log("✗ " + name); await sleep(120); continue; }
      const ex = p.info.extmetadata || {};
      const ext = (p.info.mime || "").includes("png") ? "png" : "jpg";
      const s = slug(name);
      const tmp = path.join(OUT, s + ".orig");
      dl(p.info.thumburl || p.info.url, tmp);
      rz(tmp, path.join(OUT, s + "." + ext), 720);
      rz(tmp, path.join(OUT_SMALL, s + "." + ext), 460);
      fs.unlinkSync(tmp);
      credits.push({
        name, slug: s, file: `assets/dino/${s}.${ext}`, ext,
        title: p.title, artist: strip(ex.Artist && ex.Artist.value) || "Unknown",
        license: strip(ex.LicenseShortName && ex.LicenseShortName.value) || "see source",
        licenseUrl: strip(ex.LicenseUrl && ex.LicenseUrl.value) || "",
        source: "https://commons.wikimedia.org/wiki/" + encodeURIComponent(p.title)
      });
      const flag = (p.score < 20 ? " ⚠low" : "") + (p.usedFallback ? " (fallback)" : "");
      console.log(`✓ ${name} [${p.score}] ${p.title.replace(/^File:/, "")}${flag}`);
      if (p.score < 20 || p.usedFallback) review.push(`${name}: ${p.title.replace(/^File:/, "")}`);
      await sleep(120);
    } catch (e) { missing.push(name); console.log("✗ " + name + " ERR " + e.message); await sleep(200); }
  }
  fs.writeFileSync(path.join(OUT, "credits.json"), JSON.stringify(credits, null, 2));
  console.log(`\nDONE ${credits.length} images, ${missing.length} missing`);
  if (missing.length) console.log("MISSING: " + missing.join(", "));
  if (review.length) { console.log("\nREVIEW:"); review.forEach(r => console.log("  - " + r)); }
})();

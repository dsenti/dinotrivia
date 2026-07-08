#!/usr/bin/env node
/* Bundle the whole site into ONE self-contained HTML file: inline CSS, JS,
   dinosaur data, image credits, and every reconstruction image as a data URI
   (downscaled for size). Output: dist/dinotrivia-standalone.html
   Run:  node tools/build-standalone.js         */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const R = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(R, f), "utf8");

const css = read("css/style.css");
const engine = read("js/engine.js");
const decide = read("js/decide.js");
const data = JSON.parse(read("data/dinosaurs.json"));
const credits = JSON.parse(read("assets/dino/credits.json"));

// Inline each image as a data URI, re-scaled to ~340px wide to keep the file lean.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dino-art-"));
const images = {};
let inlined = 0;
for (const c of credits) {
  const srcSmall = path.join(R, "assets/dino/small", path.basename(c.file));
  const src = fs.existsSync(srcSmall) ? srcSmall : path.join(R, c.file);
  if (!fs.existsSync(src)) continue;
  const out = path.join(tmpDir, c.slug + "." + c.ext);
  try { execFileSync("sips", ["-Z", "340", src, "--out", out], { stdio: "ignore" }); }
  catch (e) { fs.copyFileSync(src, out); }
  const b64 = fs.readFileSync(out).toString("base64");
  const mime = c.ext === "png" ? "image/png" : "image/jpeg";
  images[c.slug] = `data:${mime};base64,${b64}`;
  inlined++;
}
fs.rmSync(tmpDir, { recursive: true, force: true });

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>DinoTrivia — DinoDecide</title>
<style>
${css}
/* standalone credits view */
#credits .credits { background: var(--card); border: 1px solid var(--card-line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 6px 2px; margin-top: 10px; }
#credits ul { list-style: none; margin: 0; padding: 0; }
#credits li { display: flex; gap: 11px; align-items: center; padding: 9px 13px; border-bottom: 1px solid var(--card-line); }
#credits li:last-child { border-bottom: none; }
#credits li img { width: 50px; height: 38px; object-fit: contain; border-radius: 8px; background: linear-gradient(180deg,#dfeaf1,#e7ddc7); flex: none; }
#credits .c-name { font-weight: 700; font-size: 14.5px; }
#credits .c-meta { font-size: 12px; color: var(--ink-soft); line-height: 1.35; }
#credits a { color: var(--cretaceous); }
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <a class="brand" href="#" id="brand"><span class="logo">🦕</span> Dino<b>Trivia</b></a>
    <button class="iconbtn" id="home-btn" title="Menu" aria-label="Menu">🏠</button>
  </div>

  <div id="hub">
    <div class="hero">
      <div class="eyebrow">Triassic · Jurassic · Cretaceous</div>
      <h1>Daily Dino Games 🦖</h1>
      <p>Test what you really know about the prehistoric world.</p>
    </div>
    <div class="tiles">
      <a class="tile" href="#" id="tile-decide">
        <span class="emoji">⚖️</span>
        <span class="name">DinoDecide</span>
        <span class="desc">Higher or lower? Compare dinosaurs on weight, teeth, speed &amp; more.</span>
        <span class="tag">Play now</span>
      </a>
      <div class="tile soon"><span class="emoji">🔤</span><span class="name">Dinodle</span><span class="desc">Guess the daily mystery dinosaur.</span><span class="tag soon">Soon</span></div>
      <div class="tile soon"><span class="emoji">🏆</span><span class="name">DinoRankle</span><span class="desc">Put five dinosaurs in the right order.</span><span class="tag soon">Soon</span></div>
      <div class="tile soon"><span class="emoji">🔗</span><span class="name">DinoConnect</span><span class="desc">Find the hidden groups.</span><span class="tag soon">Soon</span></div>
    </div>
    <div class="footer">Made for dino fans · stats are approximate paleontological estimates<br /><a href="#" class="to-credits">Image credits</a></div>
  </div>

  <div id="mode-select" class="hidden">
    <div class="hero" style="padding-bottom:0">
      <h1 style="font-size:29px">⚖️ DinoDecide</h1>
      <p>Which dinosaur wins? Guess <b>higher</b> or <b>lower</b>.</p>
    </div>
    <div class="modecard">
      <h2>Choose a mode</h2>
      <p>New comparisons every round — weight, teeth, speed, brain power, eggs and more.</p>
      <button class="bigbtn daily" id="btn-daily">Daily Challenge
        <small>10 rounds · same for everyone today · shareable</small></button>
      <button class="bigbtn endless" id="btn-endless">Endless Streak
        <small>keep going until you slip up</small></button>
    </div>
    <div class="footer">Ties never happen — the two dinosaurs always differ on the stat shown.<br /><a href="#" class="to-credits">Image credits</a></div>
  </div>

  <div id="game" class="game hidden">
    <div class="scorebar" id="scorebar">
      <span class="pill"><span id="score-label">Streak</span>: <b id="score-val">0</b></span>
      <span class="pill">Best: <b id="best-val">0</b></span>
    </div>
    <div class="dots hidden" id="dots"></div>
    <div class="daily-cat hidden" id="daily-cat"></div>
    <div class="prompt" id="prompt"></div>
    <div class="arena">
      <div class="dino" id="left"></div>
      <div class="vs">VS</div>
      <div class="dino" id="right"></div>
    </div>
    <button class="bigbtn daily hidden" id="next-btn">Next ▶</button>
  </div>

  <div id="credits" class="hidden">
    <div class="hero" style="padding-bottom:2px"><h1 style="font-size:24px">Image credits</h1></div>
    <p class="footer" style="margin-top:0">Life reconstructions from Wikimedia Commons, used under their free licenses. Thanks to the paleoartists.</p>
    <div class="credits"><ul id="credits-list"></ul></div>
    <div class="footer"><a href="#" id="credits-back">← Back</a></div>
  </div>
</div>

<div id="overlay" class="overlay hidden"><div class="sheet" id="sheet"></div></div>

<script>window.DINO_JSON = ${JSON.stringify(data)};</script>
<script>window.DINO_CREDITS = ${JSON.stringify(credits)};</script>
<script>window.DINO_IMAGES = ${JSON.stringify(images)};</script>
<script>
window.__spa = {
  _hideAll: function(){ ["overlay","game","mode-select","credits","hub"].forEach(function(id){ document.getElementById(id).classList.add("hidden"); }); },
  home: function(){ this._hideAll(); document.getElementById("hub").classList.remove("hidden"); window.scrollTo(0,0); },
  credits: function(){ this._hideAll(); document.getElementById("credits").classList.remove("hidden"); window.scrollTo(0,0); }
};
</script>
<script>
${engine}
</script>
<script>
${decide}
</script>
<script>
(function () {
  function toDecide(e){ if(e) e.preventDefault();
    document.getElementById("hub").classList.add("hidden");
    document.getElementById("mode-select").classList.remove("hidden");
    window.scrollTo(0,0);
  }
  document.getElementById("tile-decide").addEventListener("click", toDecide);
  document.getElementById("home-btn").addEventListener("click", function(){ window.__spa.home(); });
  document.getElementById("brand").addEventListener("click", function(e){ e.preventDefault(); window.__spa.home(); });
  document.getElementById("credits-back").addEventListener("click", function(e){ e.preventDefault(); window.__spa.home(); });
  Array.prototype.forEach.call(document.querySelectorAll(".to-credits"), function(a){
    a.addEventListener("click", function(e){ e.preventDefault(); window.__spa.credits(); });
  });
  // render credits list from inlined data
  var list = document.getElementById("credits-list");
  var cs = (window.DINO_CREDITS || []).slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
  list.innerHTML = cs.map(function(c){
    var img = (window.DINO_IMAGES||{})[c.slug] || "";
    return '<li><img src="' + img + '" alt="" />' +
      '<div><div class="c-name">' + c.name + '</div>' +
      '<div class="c-meta">' + (c.artist ? c.artist + " · " : "") + c.license +
      ' · <a href="' + c.source + '" target="_blank" rel="noopener">source</a></div></div></li>';
  }).join("");
})();
</script>
</body>
</html>`;

const outDir = path.join(R, "dist");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "dinotrivia-standalone.html");
fs.writeFileSync(out, page);
console.log(`Wrote ${out}\n  ${(page.length/1024/1024).toFixed(2)} MB, ${inlined} images inlined`);

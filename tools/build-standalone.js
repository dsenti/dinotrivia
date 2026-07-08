#!/usr/bin/env node
/* Bundle the site into one self-contained HTML file (inline CSS/JS/data)
   for offline play or easy sharing. Output: dist/dinotrivia-standalone.html
   Run:  node tools/build-standalone.js  */
const fs = require("fs");
const path = require("path");
const R = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(R, f), "utf8");

const css = read("css/style.css");
const engine = read("js/engine.js");
const decide = read("js/decide.js");
const data = JSON.parse(read("data/dinosaurs.json"));

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>DinoTrivia — DinoDecide</title>
<style>
${css}
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
    <div class="footer">Made for dino fans · stats are approximate paleontological estimates</div>
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
    <div class="footer">Ties never happen — the two dinosaurs always differ on the stat shown.</div>
  </div>

  <div id="game" class="game hidden">
    <div class="scorebar" id="scorebar">
      <span class="pill"><span id="score-label">Streak</span>: <b id="score-val">0</b></span>
      <span class="pill">Best: <b id="best-val">0</b></span>
    </div>
    <div class="dots hidden" id="dots"></div>
    <div class="prompt" id="prompt"></div>
    <div class="arena">
      <div class="dino" id="left"></div>
      <div class="vs">VS</div>
      <div class="dino" id="right"></div>
    </div>
  </div>
</div>

<div id="overlay" class="overlay hidden"><div class="sheet" id="sheet"></div></div>

<script>window.DINO_JSON = ${JSON.stringify(data)};</script>
<script>
window.__spa = { home: function () {
  ["overlay","game","mode-select"].forEach(function(id){ document.getElementById(id).classList.add("hidden"); });
  document.getElementById("hub").classList.remove("hidden");
  window.scrollTo(0,0);
}};
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
})();
</script>
</body>
</html>`;

const outDir = path.join(R, "dist");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "dinotrivia-standalone.html");
fs.writeFileSync(out, page);
console.log("Wrote " + out + " (" + page.length + " bytes)");

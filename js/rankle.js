/* DinoRankle — one dinosaur at a time (big image). Assign it to one of the
   remaining categories WITHOUT knowing which dinosaurs come later. Each pick
   scores the dinosaur's rank in that category (1 = highest value = best).
   Lowest total wins. #dinosaurs = #categories. Daily + practice. */
(function () {
  "use strict";
  const E = window.DinoEngine;
  const $ = s => document.querySelector(s);

  const N = 5;
  const CATS = {
    weight: "Heaviest", length: "Longest", height: "Tallest",
    mya: "Oldest (lived earliest)", yearNamed: "Most recently named",
    teeth: "Most teeth", topSpeed: "Fastest", skull: "Biggest head"
  };
  const CAT_POOL = Object.keys(CATS);
  const RANK_COLORS = ["#2f9b64", "#7bb03f", "#f2a41c", "#e07a2f", "#df4f3d"];
  const RANK_EMOJI = ["🟩", "🟩", "🟨", "🟧", "🟥"];

  const els = {
    modeSelect: $("#mode-select"), game: $("#game"), round: $("#round"),
    hero: $("#hero"), cats: $("#cats"), score: $("#score"), modePill: $("#mode-pill"),
    overlay: $("#overlay"), sheet: $("#sheet")
  };
  const LS = seed => "dinorankle.daily." + seed;
  let mode, state;

  function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const sample = (rng, arr, n) => shuffle(rng, arr).slice(0, n);
  const distinct = xs => new Set(xs).size === xs.length;

  function buildGame(rng) {
    for (let t = 0; t < 300; t++) {
      const cats = sample(rng, CAT_POOL, N);
      const cand = E.all.filter(d => d.image && cats.every(c => d[c] != null));
      if (cand.length < N) continue;
      for (let u = 0; u < 60; u++) {
        const dinos = sample(rng, cand, N);
        if (cats.every(c => distinct(dinos.map(d => d[c])))) return { cats, dinos };
      }
    }
    return null;
  }

  function rankMap(cats, dinos) {
    const m = {};
    cats.forEach(c => { const o = dinos.slice().sort((a, b) => b[c] - a[c]); m[c] = {}; o.forEach((d, i) => (m[c][d.name] = i + 1)); });
    return m;
  }

  // optimal: min-cost perfect matching (category -> dinosaur). Brute force N!.
  function optimal(cats, dinos, ranks) {
    let best = Infinity, bestPerm = null;
    (function permute(rem, cur) {
      if (!rem.length) {
        let sum = 0; for (let c = 0; c < cats.length; c++) sum += ranks[cats[c]][dinos[cur[c]].name];
        if (sum < best) { best = sum; bestPerm = cur.slice(); }
        return;
      }
      for (let i = 0; i < rem.length; i++) permute(rem.slice(0, i).concat(rem.slice(i + 1)), cur.concat([rem[i]]));
    })(dinos.map((_, i) => i), []);
    return { total: best, perm: bestPerm }; // perm[catIndex] = dinoIndex
  }

  // ----- rendering -----
  function renderRound() {
    if (state.over || state.round >= N) return;
    const d = state.dinos[state.round];
    els.round.textContent = "Dinosaur " + (state.round + 1) + " of " + N + " · pick its category";
    els.hero.innerHTML = `<div class="rk-hero-img"><img src="${d.image}" alt="${d.name}" loading="lazy"
        onerror="this.replaceWith(document.createTextNode('${d.silhouette}'))" /></div>
      <div class="rk-hero-name">${d.name}</div>`;
    renderCats();
  }

  function renderCats() {
    els.cats.innerHTML = "";
    state.cats.forEach((c, ci) => {
      const usedByDino = state.catUsed[ci];
      const b = document.createElement("button");
      b.className = "rk-catbtn";
      const used = usedByDino != null;
      b.disabled = used || state.over;
      b.innerHTML = used
        ? `<span class="rk-cat-label">${CATS[c]}</span><span class="rk-cat-taken">${state.dinos[usedByDino].name}</span>`
        : `<span class="rk-cat-label">${CATS[c]}</span><span class="rk-cat-go">assign →</span>`;
      if (!used && !state.over) b.onclick = () => assign(ci);
      els.cats.appendChild(b);
    });
  }

  function assign(catIdx) {
    if (state.over || state.catUsed[catIdx] != null) return;
    const c = state.cats[catIdx];
    state.catUsed[catIdx] = state.round;
    state.choices[state.round] = catIdx;
    state.score += state.ranks[c][state.dinos[state.round].name];
    els.score.textContent = state.score;
    state.round++;
    if (state.round >= N) finish();
    else renderRound();
  }

  function finish() {
    state.over = true;
    if (mode === "daily") localStorage.setItem(LS(state.seed), JSON.stringify({ done: true, choices: state.choices }));
    showResult();
  }

  function badge(rank) { return `<span class="rk-badge" style="background:${RANK_COLORS[rank - 1]}">${rank}</span>`; }

  // rows for a given assignment perm[catIndex]=dinoIndex
  function assignmentRows(perm) {
    return state.cats.map((c, ci) => {
      const d = state.dinos[perm[ci]], rank = state.ranks[c][d.name];
      return `<div class="rk-result-row"><span class="r-cat">${CATS[c]}</span><span class="r-dino">${d.name}</span><span class="r-rank">${badge(rank)}</span></div>`;
    }).join("");
  }

  function showResult() {
    const yourPerm = state.cats.map((_, ci) => state.catUsed[ci]); // dinoIndex per category
    const total = state.score, best = state.opt.total, perfect = total === best;
    const emojiRow = state.cats.map((c, ci) => RANK_EMOJI[state.ranks[c][state.dinos[yourPerm[ci]].name] - 1]).join("");
    const dstr = mode === "daily" ? " " + fmtDate(state.date) : "";
    const share = `DinoRankle${dstr}\nScore ${total} (best possible ${best})\n${emojiRow}\n${location.origin}${location.pathname.replace(/rankle\.html$/, "")}`;
    els.sheet.innerHTML = `
      <h2>${perfect ? "Perfect ranking! 🏆" : "Nice ranking! 🦕"}</h2>
      <div class="big">${total}</div>
      <p class="streaknote">total score · lower is better · best possible was <b>${best}</b></p>
      <div id="rk-yours" style="text-align:left;margin:10px 0 4px">${assignmentRows(yourPerm)}</div>
      <div class="emojigrid" style="font-size:22px">${emojiRow}</div>
      ${perfect ? "" : `<button class="bigbtn endless" id="show-opt">See optimal solution</button>`}
      <div id="rk-opt" class="hidden" style="text-align:left;margin:8px 0"></div>
      ${mode === "daily" ? `<button class="bigbtn daily" id="share">Share result</button>` : ""}
      <button class="bigbtn endless" id="again">${mode === "daily" ? "Play practice" : "New round"}</button>
      <button class="bigbtn" style="background:#b0a08c;box-shadow:0 5px 0 #8f8069" id="tohub">Back to menu</button>`;
    els.overlay.classList.remove("hidden");
    renderRound();
    const so = $("#show-opt");
    if (so) so.onclick = () => {
      const box = $("#rk-opt");
      box.innerHTML = `<p class="streaknote" style="margin:4px 0">Optimal assignment (score ${best}):</p>${assignmentRows(state.opt.perm)}`;
      box.classList.remove("hidden");
      so.remove();
    };
    const sh = $("#share"); if (sh) sh.onclick = () => doShare(share);
    $("#again").onclick = () => { els.overlay.classList.add("hidden"); startPractice(); };
    $("#tohub").onclick = () => (location.href = "index.html");
  }

  function doShare(text) {
    if (navigator.share) navigator.share({ text: text }).catch(() => {});
    else navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard!"), () => toast("Copy failed"));
  }
  function fmtDate(d) { const p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  let toastT;
  function toast(m) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); Object.assign(t.style, { position: "fixed", left: "50%", bottom: "26px", transform: "translateX(-50%)", background: "#2c2016", color: "#fff", padding: "12px 18px", borderRadius: "999px", zIndex: 99 }); } t.textContent = m; t.style.opacity = "1"; clearTimeout(toastT); toastT = setTimeout(() => (t.style.opacity = "0"), 1600); }

  function begin(g, seed, date) {
    const ranks = rankMap(g.cats, g.dinos);
    state = { cats: g.cats, dinos: g.dinos, ranks: ranks, catUsed: g.cats.map(() => null), choices: [], round: 0, score: 0, over: false, seed: seed, date: date, opt: optimal(g.cats, g.dinos, ranks) };
    els.score.textContent = "0";
    els.modeSelect.classList.add("hidden");
    els.game.classList.remove("hidden");
    renderRound();
  }
  function startDaily() {
    mode = "daily"; els.modePill.textContent = "Daily";
    const today = new Date(), seed = E.dateSeed(today);
    begin(buildGame(E.makeRng(seed)), seed, today);
    const saved = JSON.parse(localStorage.getItem(LS(seed)) || "null");
    if (saved && saved.done && Array.isArray(saved.choices)) saved.choices.forEach(ci => { if (!state.over) assign(ci); });
  }
  function startPractice() {
    mode = "practice"; els.modePill.textContent = "Practice";
    begin(buildGame(() => Math.random()), null, new Date());
  }

  // test hook
  window.DinoRankleDebug = {
    state: () => ({ round: state.round, over: state.over, score: state.score, optimal: state.opt.total, cats: state.cats.slice(), dinos: state.dinos.map(d => d.name), ranks: state.ranks }),
    assignBest: () => { // assign current dino to the available category where it ranks best
      const d = state.dinos[state.round]; let bc = -1, br = Infinity;
      state.cats.forEach((c, ci) => { if (state.catUsed[ci] == null && state.ranks[c][d.name] < br) { br = state.ranks[c][d.name]; bc = ci; } });
      assign(bc);
    },
    assignFirst: () => { const ci = state.catUsed.findIndex(x => x == null); assign(ci); }
  };

  E.load().then(() => {
    $("#btn-daily").onclick = startDaily;
    $("#btn-practice").onclick = startPractice;
    if (location.hash === "#practice") startPractice();
  }).catch(e => { els.modeSelect.innerHTML = `<div class="modecard"><h2>Oops 🦴</h2><p>Couldn't load data. Run via a web server.</p></div>`; console.error(e); });
})();

/* DinoRankle — assign a dinosaur to each revealed category without seeing the
   later ones. Each pick scores its rank in that category (1 = highest value =
   best). Lowest total wins. #dinosaurs = #categories. Daily + practice. */
(function () {
  "use strict";
  const E = window.DinoEngine;
  const $ = s => document.querySelector(s);

  const N = 5; // categories == dinosaurs
  // categories a round can use: broadly covered numeric stats. `sup` is the
  // superlative shown to the player; rank 1 always = highest raw value.
  const CATS = {
    weight: "Heaviest", length: "Longest", height: "Tallest",
    mya: "Oldest (lived earliest)", yearNamed: "Most recently named",
    teeth: "Most teeth", topSpeed: "Fastest", skull: "Biggest head"
  };
  const CAT_POOL = Object.keys(CATS);
  const RANK_COLORS = ["#2f9b64", "#7bb03f", "#f2a41c", "#e07a2f", "#df4f3d"]; // 1..5

  const els = {
    modeSelect: $("#mode-select"), game: $("#game"), round: $("#round"), cat: $("#cat"),
    list: $("#list"), score: $("#score"), modePill: $("#mode-pill"),
    overlay: $("#overlay"), sheet: $("#sheet")
  };
  const LS = seed => "dinorankle.daily." + seed;
  let mode, state;

  function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const sample = (rng, arr, n) => shuffle(rng, arr).slice(0, n);
  const distinct = xs => new Set(xs).size === xs.length;

  // build a valid game: N categories + N dinosaurs, all covered, distinct
  // values per category (so ranks 1..N are unique).
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

  // rank of each dino within the set for a category (1 = highest value)
  function rankMap(cats, dinos) {
    const m = {};
    cats.forEach(c => {
      const ordered = dinos.slice().sort((a, b) => b[c] - a[c]);
      m[c] = {};
      ordered.forEach((d, i) => (m[c][d.name] = i + 1));
    });
    return m;
  }

  // best achievable total: min-cost perfect matching (brute force N! perms)
  function optimalTotal(cats, dinos, ranks) {
    const perms = [];
    (function permute(arr, cur) {
      if (!arr.length) { perms.push(cur); return; }
      for (let i = 0; i < arr.length; i++) permute(arr.slice(0, i).concat(arr.slice(i + 1)), cur.concat([arr[i]]));
    })(dinos, []);
    let best = Infinity;
    for (const p of perms) {
      let sum = 0;
      for (let i = 0; i < cats.length; i++) sum += ranks[cats[i]][p[i].name];
      if (sum < best) best = sum;
    }
    return best;
  }

  function renderRound() {
    if (!state.over && state.idx < N) {
      const c = state.cats[state.idx];
      els.round.textContent = "Round " + (state.idx + 1) + " of " + N;
      els.cat.innerHTML = `<div class="eyebrow">pick the</div><h2>${CATS[c]}</h2>
        <div class="sub">${E.STAT_BY_KEY[c].noun}</div>`;
    }
    els.list.innerHTML = "";
    state.dinos.forEach((d, i) => {
      const used = state.assignedCat[i] != null;
      const b = document.createElement("button");
      b.className = "rk-pick";
      b.disabled = used || state.over;
      b.innerHTML = `<img class="thumb" src="${d.image}" alt="" loading="lazy"
          onerror="this.replaceWith(document.createTextNode('${d.silhouette}'))" />
        <span class="rk-name">${d.name}</span>
        ${used ? `<span class="rk-assigned">→ ${CATS[state.cats[state.assignedCat[i]]]}</span>` : ""}`;
      if (!used && !state.over) b.onclick = () => pick(i);
      els.list.appendChild(b);
    });
  }

  function pick(dinoIdx) {
    if (state.over || state.assignedCat[dinoIdx] != null) return;
    const c = state.cats[state.idx];
    state.assignedCat[dinoIdx] = state.idx;      // this dino handles this round's category
    state.picks[state.idx] = state.dinos[dinoIdx];
    state.score += state.ranks[c][state.dinos[dinoIdx].name];
    els.score.textContent = state.score;
    state.idx++;
    if (state.idx >= N) finish();
    else renderRound();
  }

  function finish() {
    state.over = true;
    if (mode === "daily") localStorage.setItem(LS(state.seed), JSON.stringify({ done: true, picks: state.picks.map(d => d.name) }));
    showResult();
  }

  function badge(rank) { return `<span class="rk-badge" style="background:${RANK_COLORS[rank - 1]}">${rank}</span>`; }

  function showResult() {
    const rows = state.cats.map((c, i) => {
      const d = state.picks[i], rank = state.ranks[c][d.name];
      return `<div class="rk-result-row">
        <span class="r-cat">${CATS[c]}</span>
        <span class="r-dino">${d.name}</span>
        <span class="r-rank">${badge(rank)}</span>
      </div>`;
    }).join("");
    const best = state.optimal, total = state.score;
    const perfect = total === best;
    const emojiRow = state.cats.map((c, i) => RANK_COLORS_EMOJI(state.ranks[c][state.picks[i].name])).join("");
    const dstr = mode === "daily" ? " " + fmtDate(state.date) : "";
    const share = `DinoRankle${dstr}\nScore ${total} (best possible ${best})\n${emojiRow}\n${location.origin}${location.pathname.replace(/rankle\.html$/, "")}`;
    els.sheet.innerHTML = `
      <h2>${perfect ? "Perfect ranking! 🏆" : "Nice ranking! 🦕"}</h2>
      <div class="big">${total}</div>
      <p class="streaknote">total score · lower is better · best possible was <b>${best}</b></p>
      <div style="text-align:left;margin:10px 0 4px">${rows}</div>
      <div class="emojigrid" style="font-size:22px">${emojiRow}</div>
      ${mode === "daily" ? `<button class="bigbtn daily" id="share">Share result</button>` : ""}
      <button class="bigbtn endless" id="again">${mode === "daily" ? "Play practice" : "New round"}</button>
      <button class="bigbtn" style="background:#b0a08c;box-shadow:0 5px 0 #8f8069" id="tohub">Back to menu</button>`;
    els.overlay.classList.remove("hidden");
    renderRound();
    const s = $("#share"); if (s) s.onclick = () => doShare(share);
    $("#again").onclick = () => { els.overlay.classList.add("hidden"); startPractice(); };
    $("#tohub").onclick = () => (location.href = "index.html");
  }
  function RANK_COLORS_EMOJI(r) { return ["🟩", "🟩", "🟨", "🟧", "🟥"][r - 1]; }

  function doShare(text) {
    if (navigator.share) navigator.share({ text: text }).catch(() => {});
    else navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard!"), () => toast("Copy failed"));
  }
  function fmtDate(d) { const p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  let toastT;
  function toast(m) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); Object.assign(t.style, { position: "fixed", left: "50%", bottom: "26px", transform: "translateX(-50%)", background: "#2c2016", color: "#fff", padding: "12px 18px", borderRadius: "999px", zIndex: 99 }); } t.textContent = m; t.style.opacity = "1"; clearTimeout(toastT); toastT = setTimeout(() => (t.style.opacity = "0"), 1600); }

  function begin(g, seed, date) {
    const ranks = rankMap(g.cats, g.dinos);
    state = { cats: g.cats, dinos: g.dinos, ranks: ranks, assignedCat: g.dinos.map(() => null), picks: [], idx: 0, score: 0, over: false, seed: seed, date: date, optimal: optimalTotal(g.cats, g.dinos, ranks) };
    els.score.textContent = "0";
    els.modeSelect.classList.add("hidden");
    els.game.classList.remove("hidden");
    renderRound();
  }
  function startDaily() {
    mode = "daily"; els.modePill.textContent = "Daily";
    const today = new Date(), seed = E.dateSeed(today);
    const g = buildGame(E.makeRng(seed));
    begin(g, seed, today);
    const saved = JSON.parse(localStorage.getItem(LS(seed)) || "null");
    if (saved && saved.done) { // replay saved picks -> show result
      saved.picks.forEach(name => { const di = state.dinos.findIndex(d => d.name === name); if (di !== -1 && state.assignedCat[di] == null) pick(di); });
    }
  }
  function startPractice() {
    mode = "practice"; els.modePill.textContent = "Practice";
    begin(buildGame(() => Math.random()), null, new Date());
  }

  // test hook
  window.DinoRankleDebug = {
    state: () => ({ idx: state.idx, over: state.over, score: state.score, optimal: state.optimal, cats: state.cats.slice(), dinos: state.dinos.map(d => d.name), ranks: state.ranks }),
    pickBest: () => { // pick the dino with best (lowest) rank still available for the current category
      const c = state.cats[state.idx]; let bi = -1, br = Infinity;
      state.dinos.forEach((d, i) => { if (state.assignedCat[i] == null && state.ranks[c][d.name] < br) { br = state.ranks[c][d.name]; bi = i; } });
      pick(bi);
    },
    pickFirstAvailable: () => { const i = state.assignedCat.findIndex(x => x == null); pick(i); }
  };

  E.load().then(() => {
    $("#btn-daily").onclick = startDaily;
    $("#btn-practice").onclick = startPractice;
    if (location.hash === "#practice") startPractice();
  }).catch(e => { els.modeSelect.innerHTML = `<div class="modecard"><h2>Oops 🦴</h2><p>Couldn't load data. Run via a web server.</p></div>`; console.error(e); });
})();

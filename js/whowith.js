/* DinoWithWhom — a period is chosen (Triassic / Jurassic / Cretaceous); find
   the dinosaurs from that period. Single-tap guessing, five wrong guesses
   allowed. Daily (date-seeded) + practice modes. Reuses the Connections grid. */
(function () {
  "use strict";
  const E = window.DinoEngine;
  const $ = s => document.querySelector(s);

  const GRID = 16, MAX_MISTAKES = 5, MIN_FIND = 4, MAX_FIND = 7;
  const PERIODS = ["Triassic", "Jurassic", "Cretaceous"];
  // reveal colour class per period (maps to the site's theme vars)
  const PERIOD_CLASS = { Triassic: "rv-triassic", Jurassic: "rv-jurassic", Cretaceous: "rv-cretaceous" };

  const els = {
    modeSelect: $("#mode-select"), game: $("#game"), grid: $("#grid"),
    found: $("#found"), findTotal: $("#find-total"), lives: $("#lives"),
    modePill: $("#mode-pill"), wfind: $("#wfind"), legend: $("#legend"),
    overlay: $("#overlay"), sheet: $("#sheet")
  };
  const LS = seed => "dinowithwhom.daily." + seed;

  let mode, state;
  // test hook: lets automated tests inspect a built puzzle (no gameplay effect)
  window.DinoWhomDebug = {
    info: () => ({
      period: state.period, findTotal: state.findTotal,
      found: state.foundCount, mistakes: state.mistakes, over: state.over,
      tiles: state.tiles.map(t => t.d.name)
    })
  };

  // ----- seeded helpers (same shape as connections.js) -----
  function shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function sample(rng, arr, n) { return shuffle(rng, arr).slice(0, n); }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  // The pool: dinosaurs with an image and one of the three Mesozoic periods
  // (excludes the human joke entries, whose period is "Holocene").
  function pool() { return E.all.filter(d => d.image && PERIODS.indexOf(d.period) !== -1); }

  // Build one puzzle attempt. When `strict`, the chosen period must have at
  // least MIN_FIND members; otherwise (relaxed fallback) any period with >=1 is
  // accepted so a full 16-tile grid is always produced. Decoys are drawn from
  // the other two periods and lightly balanced so both appear in the reveal.
  function buildAttempt(rng, strict) {
    const all = pool();
    if (all.length < GRID) return null;
    const period = pick(rng, PERIODS);
    const matches = all.filter(d => d.period === period);
    const others = all.filter(d => d.period !== period);
    if (matches.length < (strict ? MIN_FIND : 1)) return null;

    const capF = Math.min(matches.length, MAX_FIND);
    const minF = strict ? MIN_FIND : 1;
    let F = minF + Math.floor(rng() * (capF - minF + 1));
    if (others.length < GRID - F) { F = GRID - others.length; if (F > matches.length) return null; }

    const chosenMatch = sample(rng, matches, F);
    const chosenDecoy = pickDecoys(rng, period, others, GRID - F);
    const tiles = shuffle(rng, chosenMatch.concat(chosenDecoy).map(d => ({ d: d })));
    return { period: period, findTotal: F, tiles: tiles };
  }

  // Pick `need` decoys from the other two periods, preferring a mix so the
  // reveal shows all three colours when possible.
  function pickDecoys(rng, period, others, need) {
    if (others.length <= need) return shuffle(rng, others);
    const groups = PERIODS.filter(p => p !== period).map(p => shuffle(rng, others.filter(d => d.period === p)));
    const out = [];
    let gi = 0;
    while (out.length < need) {
      const g = groups[gi % groups.length];
      if (g.length) out.push(g.pop());
      gi++;
      if (groups.every(g => !g.length)) break;
    }
    return out;
  }

  function buildPuzzle(rng) {
    for (let i = 0; i < 400; i++) { const p = buildAttempt(rng, true); if (p) return p; }
    for (let i = 0; i < 400; i++) { const p = buildAttempt(rng, false); if (p) return p; }
    return buildAttempt(rng, false); // last resort
  }

  // ----- rendering -----
  function nameFontSize(n) { return n <= 11 ? 10 : n <= 15 ? 9 : n <= 18 ? 8 : 7; }
  function tileInner(t) {
    const fs = nameFontSize(t.d.name.length);
    // once the round is over, reveal each dinosaur's true period under its name
    const period = state.over ? `<span class="wt-period">${t.d.period}</span>` : "";
    return `<img src="${t.d.image}" alt="${t.d.name}" loading="lazy"
      onerror="this.replaceWith(document.createTextNode('${t.d.silhouette}'))" />
      <span class="wt-name" style="font-size:${fs}px">${t.d.name}</span>${period}`;
  }
  function tileClass(t) {
    const c = "ctile wtile";
    if (state.over) return c + " " + PERIOD_CLASS[t.d.period];  // reveal: colour by true period
    if (t.found) return c + " found";
    if (t.miss) return c + " miss";
    return c;
  }
  function renderGrid() {
    els.grid.innerHTML = "";
    state.tiles.forEach((t, i) => {
      const el = document.createElement("button");
      el.className = tileClass(t);
      el.innerHTML = tileInner(t);
      if (!state.over) el.onclick = () => tap(i, el);
      els.grid.appendChild(el);
    });
  }
  function renderCounts() {
    els.found.textContent = state.foundCount;
    els.findTotal.textContent = state.findTotal;
    els.lives.textContent = MAX_MISTAKES - state.mistakes;
  }
  function renderFind() {
    els.wfind.innerHTML = `Find the <b>${state.findTotal}</b> dinosaurs from the <b>${state.period}</b> period.`;
  }

  // ----- interaction -----
  function tap(i, el) {
    const t = state.tiles[i];
    if (state.over || t.found || t.miss) return;
    const correct = t.d.period === state.period;
    state.guesses.push(correct);
    if (correct) {
      t.found = true;
      state.foundCount++;
      el.classList.add("found");
      el.onclick = null;
      renderCounts();
      if (state.foundCount === state.findTotal) finish(true);
    } else {
      t.miss = true;
      state.mistakes++;
      el.classList.add("miss", "shake");
      el.onclick = null;
      setTimeout(() => el.classList.remove("shake"), 500);
      renderCounts();
      if (state.mistakes >= MAX_MISTAKES) finish(false);
    }
  }

  // ----- reveal + result -----
  function renderLegend() {
    els.legend.innerHTML = `<div class="wlegend">
      <span><i style="background:var(--triassic)"></i>Triassic</span>
      <span><i style="background:var(--jurassic)"></i>Jurassic</span>
      <span><i style="background:var(--cretaceous)"></i>Cretaceous</span></div>`;
  }

  function finish(won) {
    state.over = true;
    state.won = won;
    renderGrid();     // one final render: now shows the by-period reveal
    renderLegend();
    if (mode === "daily") localStorage.setItem(LS(state.seed), JSON.stringify({
      done: true, won: won, found: state.foundCount, findTotal: state.findTotal,
      mistakes: state.mistakes, guesses: state.guesses
    }));
    showResult(won);
  }

  // guess sequence as squares (no names, no period — safe to share, no spoilers)
  function shareGrid() { return state.guesses.map(ok => (ok ? "🟩" : "🟥")).join(""); }

  function showResult(won) {
    const dstr = mode === "daily" ? " " + fmtDate(state.date) : "";
    const line = won
      ? "Found all " + state.findTotal + " with " + state.mistakes + " mistake" + (state.mistakes === 1 ? "" : "s")
      : "Found " + state.foundCount + "/" + state.findTotal + " before running out";
    const share = `DinoWithWhom${dstr}\n${line}\n${shareGrid()}\n${location.origin}${location.pathname.replace(/whowith\.html$/, "")}`;
    els.sheet.innerHTML = `
      <button class="wclose" id="close-res" title="See the board" aria-label="Close">×</button>
      <h2>${won ? "Period nailed! 🦕" : "Out of guesses 🦴"}</h2>
      <div class="big">${state.foundCount}/${state.findTotal}</div>
      <p class="streaknote">${line}.</p>
      <div class="emojigrid">${shareGrid() || "—"}</div>
      <button class="bigbtn" style="background:#6a7b52;box-shadow:0 5px 0 #55643f" id="board">See the board 👇</button>
      ${mode === "daily" ? `<button class="bigbtn daily" id="share">Share result</button>` : ""}
      <button class="bigbtn endless" id="again">${mode === "daily" ? "Play practice" : "New puzzle"}</button>
      <button class="bigbtn" style="background:#b0a08c;box-shadow:0 5px 0 #8f8069" id="tohub">Back to menu</button>`;
    els.overlay.classList.remove("hidden");
    reopenBtn().style.display = "none";
    const s = $("#share"); if (s) s.onclick = () => doShare(share);
    $("#close-res").onclick = closeResult;
    $("#board").onclick = closeResult;
    $("#again").onclick = () => { els.overlay.classList.add("hidden"); startPractice(); };
    $("#tohub").onclick = () => (location.href = "index.html");
  }

  // Hide the result overlay so the coloured reveal board is visible; leave a
  // button to bring the results back.
  function closeResult() { els.overlay.classList.add("hidden"); reopenBtn().style.display = ""; }
  function reopenBtn() {
    let b = $("#reopen-res");
    if (!b) {
      b = document.createElement("button");
      b.id = "reopen-res"; b.className = "cbtn solid"; b.textContent = "See results";
      b.style.marginTop = "14px"; b.style.width = "100%";
      b.onclick = () => { b.style.display = "none"; els.overlay.classList.remove("hidden"); };
      els.game.appendChild(b);
    }
    return b;
  }

  function doShare(text) {
    if (navigator.share) navigator.share({ text: text }).catch(() => {});
    else navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard!"), () => toast("Copy failed"));
  }
  function fmtDate(d) { const p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  let toastT;
  function toast(m) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); Object.assign(t.style, { position: "fixed", left: "50%", bottom: "26px", transform: "translateX(-50%)", background: "#2c2016", color: "#fff", padding: "12px 18px", borderRadius: "999px", zIndex: 99 }); } t.textContent = m; t.style.opacity = "1"; clearTimeout(toastT); toastT = setTimeout(() => (t.style.opacity = "0"), 1600); }

  // ----- start -----
  function begin(rng, seed, date) {
    const p = buildPuzzle(rng);
    state = {
      period: p.period, tiles: p.tiles, findTotal: p.findTotal,
      foundCount: 0, mistakes: 0, guesses: [], over: false, won: false,
      seed: seed, date: date
    };
    els.legend.innerHTML = "";
    reopenBtn().style.display = "none";
    els.modeSelect.classList.add("hidden");
    els.game.classList.remove("hidden");
    renderFind();
    renderCounts();
    renderGrid();
  }

  function startDaily() {
    mode = "daily";
    const today = new Date(), seed = E.dateSeed(today);
    els.modePill.textContent = "Daily";
    const saved = JSON.parse(localStorage.getItem(LS(seed)) || "null");
    begin(E.makeRng(seed), seed, today);
    if (saved && saved.done) {   // replay: reconstruct the finished view
      state.guesses = saved.guesses || [];
      state.mistakes = saved.mistakes || 0;
      state.foundCount = saved.found || 0;
      finish(saved.won);
    }
  }
  function startPractice() {
    mode = "practice";
    els.modePill.textContent = "Practice";
    begin(() => Math.random(), null, new Date());
  }

  E.load().then(() => {
    $("#btn-daily").onclick = startDaily;
    $("#btn-practice").onclick = startPractice;
    if (location.hash === "#practice") startPractice();
  }).catch(e => { els.modeSelect.innerHTML = `<div class="modecard"><h2>Oops 🦴</h2><p>Couldn't load data. Run via a web server.</p></div>`; console.error(e); });
})();

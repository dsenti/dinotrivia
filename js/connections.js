/* DinoConnections — group the 4 tiles (image + name + 2 facts) of each of 4
   dinosaurs. Daily (date-seeded) + practice modes. */
(function () {
  "use strict";
  const E = window.DinoEngine;
  const $ = s => document.querySelector(s);

  const GROUPS = 4, PER_GROUP = 4, MAX_MISTAKES = 4;
  const COLORS = ["#f2a41c", "#2f9b64", "#2f7fc4", "#c8592a"];
  const EMOJI = ["🟨", "🟩", "🟦", "🟥"];

  const els = {
    modeSelect: $("#mode-select"), game: $("#game"), grid: $("#grid"), solved: $("#solved"),
    lives: $("#lives"), modePill: $("#mode-pill"), submit: $("#submit"),
    shuffle: $("#shuffle"), deselect: $("#deselect"), overlay: $("#overlay"), sheet: $("#sheet")
  };
  const LS = seed => "dinoconn.daily." + seed;

  let mode, state;
  // test hook: lets automated tests see tile groups (no gameplay effect)
  window.DinoConnDebug = {
    visibleGroups: () => state.tiles.filter(t => !t.solved).map(t => t.groupId),
    info: () => ({ solved: state.solvedGroups.length, mistakes: state.mistakes, over: state.over, groups: GROUPS })
  };

  // ----- seeded helpers -----
  function shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function sample(rng, arr, n) { return shuffle(rng, arr).slice(0, n); }

  function factText(k, d) {
    switch (k) {
      case "weight": return "≈ " + E.STAT_BY_KEY.weight.fmt(d.weight) + " kg";
      case "length": return d.length + " m long";
      case "height": return d.height + " m tall";
      case "teeth": return d.teeth + " teeth";
      case "topSpeed": return d.topSpeed + " km/h";
      case "yearNamed": return "named " + d.yearNamed;
      case "fossilSpecimens": return d.fossilSpecimens + " fossils found";
      case "skull": return d.skull + " m skull";
      default: return "";
    }
  }
  const FACT_KEYS = ["weight", "length", "height", "teeth", "topSpeed", "yearNamed", "fossilSpecimens", "skull"];

  // One puzzle attempt. Each of the 4 groups must yield exactly PER_GROUP tiles
  // (image + name + 2 facts). Fact texts are kept globally unique so no tile is
  // ambiguous. When `strict`, a group that can't reach PER_GROUP unique tiles
  // (e.g. two dinos with identical stats — the joke humans) aborts the attempt
  // by returning null so the caller resamples. When not strict, duplicate facts
  // are allowed as a last resort so the grid is always full (16 tiles).
  function buildAttempt(rng, strict) {
    const pool = E.all.filter(d => d.image);
    const dinos = sample(rng, pool, GROUPS);
    const usedText = new Set(dinos.map(d => d.name.toLowerCase()));
    const tiles = [];
    for (let gi = 0; gi < dinos.length; gi++) {
      const d = dinos[gi];
      const group = [
        { type: "image", groupId: gi, dino: d },
        { type: "name", groupId: gi, text: d.name }
      ];
      const keys = shuffle(rng, FACT_KEYS.filter(k => d[k] != null && !(k === "teeth" && d[k] === 0)));
      for (const k of keys) {
        if (group.length === PER_GROUP) break;
        const t = factText(k, d);
        if (strict && usedText.has(t.toLowerCase())) continue;
        usedText.add(t.toLowerCase());
        group.push({ type: "fact", groupId: gi, text: t });
      }
      if (group.length < PER_GROUP) {
        if (strict) return null;      // resample: this dino set can't fill uniquely
      }
      tiles.push(...group);
    }
    return { dinos, tiles: shuffle(rng, tiles) };
  }

  function buildPuzzle(rng) {
    for (let i = 0; i < 300; i++) {
      const p = buildAttempt(rng, true);
      if (p) return p;
    }
    return buildAttempt(rng, false); // fallback: guarantees a full 16-tile grid
  }

  // ----- rendering -----
  function tileInner(t) {
    if (t.type === "image") return `<img src="${t.dino.image}" alt="${t.dino.name}" loading="lazy"
      onerror="this.replaceWith(document.createTextNode('${t.dino.silhouette}'))" />`;
    // Shrink long names so they fit on one line instead of wrapping.
    const n = t.text.length;
    const fs = n <= 10 ? 11 : n <= 13 ? 10 : n <= 16 ? 9 : n <= 19 ? 8 : 7;
    return `<span style="font-size:${fs}px">${t.text}</span>`;
  }
  function renderGrid() {
    els.grid.innerHTML = "";
    state.tiles.forEach((t, i) => {
      if (t.solved) return;
      const el = document.createElement("button");
      el.className = "ctile" + (t.type === "image" ? " img" : "") + (state.selected.has(i) ? " sel" : "");
      el.innerHTML = tileInner(t);
      el.onclick = () => toggle(i);
      els.grid.appendChild(el);
    });
  }
  function renderSolved() {
    els.solved.innerHTML = state.solvedGroups.map(gi => {
      const d = state.dinos[gi];
      const facts = state.tiles.filter(t => t.groupId === gi && t.type === "fact").map(t => t.text);
      return `<div class="csolved" style="background:${COLORS[gi]}">
        <div class="cs-name">${d.name}</div>
        <div class="cs-facts">image · name · ${facts.join(" · ")}</div>
      </div>`;
    }).join("");
  }

  function toggle(i) {
    if (state.over) return;
    if (state.selected.has(i)) state.selected.delete(i);
    else if (state.selected.size < PER_GROUP) state.selected.add(i);
    els.submit.disabled = state.selected.size !== PER_GROUP;
    renderGrid();
  }

  function onSubmit() {
    if (state.selected.size !== PER_GROUP || state.over) return;
    const idxs = [...state.selected];
    const gids = idxs.map(i => state.tiles[i].groupId);
    const gid = gids[0];
    const correct = gids.every(g => g === gid);
    state.guesses.push(gids.slice());
    if (correct) {
      idxs.forEach(i => (state.tiles[i].solved = true));
      state.solvedGroups.push(gid);
      state.selected.clear();
      els.submit.disabled = true;
      renderSolved(); renderGrid();
      if (state.solvedGroups.length === GROUPS) finish(true);
    } else {
      state.mistakes++;
      els.lives.textContent = MAX_MISTAKES - state.mistakes;
      flashWrong(idxs);
      if (state.mistakes >= MAX_MISTAKES) finish(false);
    }
  }

  function flashWrong(idxs) {
    const btns = els.grid.querySelectorAll(".ctile");
    // map visible order to tile indices
    let vi = 0; const map = [];
    state.tiles.forEach((t, i) => { if (!t.solved) { map.push(i); } });
    btns.forEach((b, k) => { if (idxs.indexOf(map[k]) !== -1) { b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 500); } });
    state.selected.clear();
    setTimeout(() => { els.submit.disabled = true; renderGrid(); }, 250);
  }

  // Reveal the answer: lay all 16 tiles out grouped into 4 colour-coded rows.
  function renderSolution() {
    const order = { image: 0, name: 1, fact: 2 };
    els.grid.innerHTML = "";
    for (let gi = 0; gi < GROUPS; gi++) {
      state.tiles.filter(t => t.groupId === gi)
        .sort((a, b) => order[a.type] - order[b.type])
        .forEach(t => {
          const el = document.createElement("div");
          el.className = "ctile sol" + (t.type === "image" ? " img" : "");
          el.style.borderColor = COLORS[gi];
          if (t.type === "image") el.style.boxShadow = "0 0 0 3px " + COLORS[gi];
          else { el.style.background = COLORS[gi]; el.style.color = "#fff"; }
          el.innerHTML = tileInner(t);
          els.grid.appendChild(el);
        });
    }
    const bar = document.querySelector(".cbtns");
    if (bar) {
      bar.innerHTML = '<button class="cbtn solid" id="backres">See results</button>';
      document.querySelector("#backres").onclick = () => showResult(state.won);
    }
  }

  function finish(won) {
    state.over = true;
    state.won = won;
    // reveal any unsolved groups
    for (let gi = 0; gi < GROUPS; gi++) if (state.solvedGroups.indexOf(gi) === -1) state.solvedGroups.push(gi);
    state.tiles.forEach(t => (t.solved = true));
    renderSolved(); renderGrid();
    if (mode === "daily") localStorage.setItem(LS(state.seed), JSON.stringify({ done: true, won: won, guesses: state.guesses, mistakes: state.mistakes }));
    showResult(won);
  }

  function shareGrid() {
    // one row of 4 squares per guess, coloured by each selected tile's group
    return state.guesses.map(g => g.map(gid => EMOJI[gid]).join("")).join("\n");
  }

  function showResult(won) {
    const grid = shareGrid();
    const dstr = mode === "daily" ? " " + fmtDate(state.date) : "";
    const share = `DinoConnections${dstr}\n${won ? "Solved with " + state.mistakes + " mistake" + (state.mistakes === 1 ? "" : "s") : "Missed it"}\n${grid}\n${location.origin}${location.pathname.replace(/connections\.html$/, "")}`;
    els.sheet.innerHTML = `
      <h2>${won ? "Nice grouping! 🦕" : "Out of tries 🦴"}</h2>
      <div class="big">${state.solvedGroups.length}/${GROUPS}</div>
      <p class="streaknote">${won ? "Solved with " + state.mistakes + " mistake" + (state.mistakes === 1 ? "" : "s") + "." : "Better luck next time."}</p>
      <div class="emojigrid" style="font-size:18px;line-height:1.3">${grid.replace(/\n/g, "<br>")}</div>
      ${!won ? `<button class="bigbtn" style="background:#6a7b52;box-shadow:0 5px 0 #55643f" id="showsol">Show solution</button>` : ""}
      ${mode === "daily" ? `<button class="bigbtn daily" id="share">Share result</button>` : ""}
      <button class="bigbtn endless" id="again">${mode === "daily" ? "Play practice" : "New puzzle"}</button>
      <button class="bigbtn" style="background:#b0a08c;box-shadow:0 5px 0 #8f8069" id="tohub">Back to menu</button>`;
    els.overlay.classList.remove("hidden");
    const sol = $("#showsol"); if (sol) sol.onclick = () => { els.overlay.classList.add("hidden"); renderSolution(); };
    const s = $("#share"); if (s) s.onclick = () => doShare(share);
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

  // ----- start -----
  function begin(rng, seed, date) {
    const p = buildPuzzle(rng);
    state = { dinos: p.dinos, tiles: p.tiles, selected: new Set(), solvedGroups: [], mistakes: 0, guesses: [], over: false, seed: seed, date: date };
    els.lives.textContent = MAX_MISTAKES;
    els.submit.disabled = true;
    els.modeSelect.classList.add("hidden");
    els.game.classList.remove("hidden");
    renderSolved(); renderGrid();
  }
  function startDaily() {
    mode = "daily";
    const today = new Date(), seed = E.dateSeed(today);
    els.modePill.textContent = "Daily";
    const saved = JSON.parse(localStorage.getItem(LS(seed)) || "null");
    begin(E.makeRng(seed), seed, today);
    if (saved && saved.done) { // replay: reconstruct outcome view
      state.guesses = saved.guesses || []; state.mistakes = saved.mistakes || 0;
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
    els.submit.onclick = onSubmit;
    els.deselect.onclick = () => { state.selected.clear(); els.submit.disabled = true; renderGrid(); };
    els.shuffle.onclick = () => { if (!state.over) { state.selected.clear(); els.submit.disabled = true; state.tiles = shuffleVisible(state.tiles); renderGrid(); } };
    if (location.hash === "#practice") startPractice();
  }).catch(e => { els.modeSelect.innerHTML = `<div class="modecard"><h2>Oops 🦴</h2><p>Couldn't load data. Run via a web server.</p></div>`; console.error(e); });

  function shuffleVisible(tiles) {
    // shuffle only unsolved tiles, keep solved in place conceptually (they're hidden)
    const unsolved = tiles.filter(t => !t.solved);
    const solved = tiles.filter(t => t.solved);
    const sh = shuffle(() => Math.random(), unsolved);
    return solved.concat(sh);
  }
})();

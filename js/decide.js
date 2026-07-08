/* DinoDecide — higher/lower game (endless + daily). */
(function () {
  "use strict";
  const E = window.DinoEngine;
  const $ = sel => document.querySelector(sel);
  // In the single-file SPA build, window.__spa.home() returns to the hub view.
  // In the multi-file site there is no SPA, so navigate to the hub page.
  const goHome = () => { if (window.__spa && window.__spa.home) window.__spa.home(); else location.href = "index.html"; };

  const els = {
    modeSelect: $("#mode-select"),
    game: $("#game"),
    scorebar: $("#scorebar"),
    scoreVal: $("#score-val"),
    scoreLabel: $("#score-label"),
    bestVal: $("#best-val"),
    dots: $("#dots"),
    prompt: $("#prompt"),
    left: $("#left"),
    right: $("#right"),
    overlay: $("#overlay"),
    sheet: $("#sheet")
  };

  const LS = {
    best: "dinodecide.best",
    daily: seed => "dinodecide.daily." + seed
  };
  const getBest = () => parseInt(localStorage.getItem(LS.best) || "0", 10);
  const setBest = v => localStorage.setItem(LS.best, String(v));

  let mode = null;      // "endless" | "daily"
  let state = null;     // per-mode state

  // ---------- rendering a dino card ----------
  function cardHTML(d, opts) {
    opts = opts || {};
    const stat = opts.stat;
    let statBlock;
    if (opts.reveal) {
      statBlock = `<div class="statline">${stat.noun}</div>
        <div class="statval">${stat.fmt(d[stat.key])} <span class="unit">${stat.unit}</span></div>`;
    } else if (opts.hidden) {
      statBlock = `<div class="statline">${stat.noun}</div>
        <div class="statval">?</div>
        <div class="guessrow">
          <button class="guess higher" data-guess="higher">Higher ⬆</button>
          <button class="guess lower" data-guess="lower">Lower ⬇</button>
        </div>`;
    } else {
      statBlock = "";
    }
    const media = d.image
      ? `<div class="dino-img"><img src="${d.image}" alt="Life reconstruction of ${d.name}" loading="lazy" decoding="async" onerror="this.parentNode.innerHTML='<span class=&quot;silhouette&quot;>${d.silhouette}</span>'" /></div>`
      : `<div class="dino-img"><span class="silhouette">${d.silhouette}</span></div>`;
    return `<div class="period-strip"></div>
      ${media}
      <div class="dname">${d.name}</div>
      <div class="meta"><span class="badge">${d.period}</span> · ${d.diet}</div>
      ${statBlock}`;
  }

  function renderRound(round, opts) {
    opts = opts || {};
    els.left.className = "dino period-" + round.left.period;
    els.right.className = "dino period-" + round.right.period;
    els.left.innerHTML = cardHTML(round.left, { stat: round.stat, reveal: true });
    els.right.innerHTML = cardHTML(round.right, { stat: round.stat, hidden: true });
    els.prompt.innerHTML = `Which had <b>${round.stat.label}</b>?`;
    bindGuess(round);
  }

  function bindGuess(round) {
    els.right.querySelectorAll(".guess").forEach(btn => {
      btn.addEventListener("click", () => onGuess(round, btn.dataset.guess));
    });
  }

  function tweenValue(el, stat, target) {
    const dur = 650, start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      const shown = stat.key === "eq" ? val.toFixed(1) : stat.fmt(Math.round(val));
      el.innerHTML = `${shown} <span class="unit">${stat.unit}</span>`;
      if (t < 1) requestAnimationFrame(step);
      else el.innerHTML = `${stat.fmt(target)} <span class="unit">${stat.unit}</span>`;
    }
    requestAnimationFrame(step);
  }

  function onGuess(round, guess) {
    els.right.querySelectorAll(".guess").forEach(b => (b.disabled = true));
    const correctDir = round.right[round.stat.key] > round.left[round.stat.key] ? "higher" : "lower";
    const correct = guess === correctDir;

    // reveal challenger value
    els.right.innerHTML = cardHTML(round.right, { stat: round.stat, reveal: true });
    const valEl = els.right.querySelector(".statval");
    if (round.stat.key === "yearNamed") {
      valEl.innerHTML = `${round.stat.fmt(round.right[round.stat.key])} <span class="unit">${round.stat.unit}</span>`;
    } else {
      tweenValue(valEl, round.stat, round.right[round.stat.key]);
    }
    els.right.classList.add(correct ? "correct" : "wrong");

    if (mode === "endless") endlessResult(round, correct);
    else dailyResult(round, correct);
  }

  // ---------- ENDLESS ----------
  function startEndless() {
    mode = "endless";
    state = { streak: 0 };
    els.scoreLabel.textContent = "Streak";
    els.dots.classList.add("hidden");
    els.bestVal.parentElement.classList.remove("hidden");
    els.bestVal.textContent = getBest();
    els.scoreVal.textContent = "0";
    showGame();
    const round = E.makeRound(Math.random);
    renderRound(round);
  }

  function endlessResult(round, correct) {
    if (correct) {
      state.streak++;
      els.scoreVal.textContent = state.streak;
      if (state.streak > getBest()) { setBest(state.streak); els.bestVal.textContent = state.streak; }
      setTimeout(() => {
        // challenger becomes the new anchor
        const next = E.makeRound(Math.random, { forcedLeft: round.right, avoid: new Set([round.left.name]) })
          || E.makeRound(Math.random);
        renderRound(next);
      }, 1150);
    } else {
      setTimeout(() => endlessOver(), 1150);
    }
  }

  function endlessOver() {
    const best = getBest();
    els.sheet.innerHTML = `
      <h2>Game over 🦴</h2>
      <div class="big">${state.streak}</div>
      <p>correct in a row</p>
      <p class="streaknote">Best streak: <b>${best}</b></p>
      <button class="bigbtn endless" id="again">Play again</button>
      <button class="bigbtn daily" id="tohub">Back to menu</button>`;
    openOverlay();
    $("#again").addEventListener("click", () => { closeOverlay(); startEndless(); });
    $("#tohub").addEventListener("click", () => goHome());
  }

  // ---------- DAILY ----------
  const DAILY_ROUNDS = 10;
  function startDaily() {
    mode = "daily";
    const today = new Date();
    const seed = E.dateSeed(today);
    const saved = JSON.parse(localStorage.getItem(LS.daily(seed)) || "null");
    if (saved && saved.done) { showDailyResult(seed, saved.results, today); return; }

    const rng = E.makeRng(seed);
    const rounds = [];
    for (let i = 0; i < DAILY_ROUNDS; i++) rounds.push(E.makeRound(rng));
    state = { seed, rounds, idx: 0, results: [], date: today };

    els.scoreLabel.textContent = "Round";
    els.bestVal.parentElement.classList.add("hidden");
    els.dots.classList.remove("hidden");
    renderDots();
    showGame();
    nextDaily();
  }

  function renderDots() {
    let h = "";
    for (let i = 0; i < DAILY_ROUNDS; i++) {
      let cls = "dot";
      if (i < state.results.length) cls += state.results[i] ? " correct" : " wrong";
      else if (i === state.idx) cls += " current";
      h += `<span class="${cls}"></span>`;
    }
    els.dots.innerHTML = h;
  }

  function nextDaily() {
    els.scoreVal.textContent = (state.idx + 1) + "/" + DAILY_ROUNDS;
    renderDots();
    renderRound(state.rounds[state.idx]);
  }

  function dailyResult(round, correct) {
    state.results.push(correct);
    renderDots();
    state.idx++;
    setTimeout(() => {
      if (state.idx < DAILY_ROUNDS) nextDaily();
      else finishDaily();
    }, 1150);
  }

  function finishDaily() {
    localStorage.setItem(LS.daily(state.seed), JSON.stringify({ done: true, results: state.results }));
    showDailyResult(state.seed, state.results, state.date);
  }

  function showDailyResult(seed, results, date) {
    const score = results.filter(Boolean).length;
    const grid = results.map(r => (r ? "🟩" : "🟥")).join("");
    const dstr = fmtDate(date || new Date());
    const shareText =
      `DinoDecide ${dstr}\n${score}/${DAILY_ROUNDS} ${score === DAILY_ROUNDS ? "🦖 perfect!" : "🦕"}\n${grid}\n${location.origin}${location.pathname.replace(/decide\.html$/, "")}`;

    els.sheet.innerHTML = `
      <h2>Daily done!</h2>
      <div class="big">${score}/${DAILY_ROUNDS}</div>
      <div class="emojigrid">${grid}</div>
      <p class="streaknote">Come back tomorrow for a new set 🥚</p>
      <button class="bigbtn daily" id="share">Share result</button>
      <button class="bigbtn endless" id="endless">Play endless mode</button>
      <button class="bigbtn" style="background:#b0a08c;box-shadow:0 5px 0 #8f8069" id="tohub">Back to menu</button>`;
    openOverlay();
    showGame(); // ensure game container visible behind overlay
    $("#share").addEventListener("click", () => doShare(shareText));
    $("#endless").addEventListener("click", () => { closeOverlay(); startEndless(); });
    $("#tohub").addEventListener("click", () => goHome());
  }

  function doShare(text) {
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(
        () => toast("Result copied to clipboard!"),
        () => toast("Copy failed — select and copy manually")
      );
    }
  }

  function fmtDate(d) {
    const p = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  // ---------- UI helpers ----------
  function showGame() {
    const hub = $("#hub");
    if (hub) hub.classList.add("hidden");
    els.modeSelect.classList.add("hidden");
    els.game.classList.remove("hidden");
  }
  function openOverlay() { els.overlay.classList.remove("hidden"); }
  function closeOverlay() { els.overlay.classList.add("hidden"); }

  let toastTimer = null;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t);
      Object.assign(t.style, { position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)",
        background: "#2c2016", color: "#fff", padding: "12px 18px", borderRadius: "999px",
        fontFamily: "inherit", zIndex: 99, boxShadow: "0 6px 20px rgba(0,0,0,.3)" }); }
    t.textContent = msg; t.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.style.opacity = "0"), 1800);
  }

  // ---------- boot ----------
  E.load().then(() => {
    $("#btn-daily").addEventListener("click", startDaily);
    $("#btn-endless").addEventListener("click", startEndless);
    // deep link: decide.html#endless / #daily
    if (location.hash === "#endless") startEndless();
    else if (location.hash === "#daily") startDaily();
  }).catch(err => {
    els.modeSelect.innerHTML = `<div class="modecard"><h2>Oops 🦴</h2><p>Couldn't load dinosaur data. If you opened this file directly, run it through a web server instead.</p></div>`;
    console.error(err);
  });
})();

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
    sheet: $("#sheet"),
    dailyCat: $("#daily-cat"),
    next: $("#next-btn"),
    arena: $(".arena")
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
  // The LEFT card is the known "anchor" (value shown); the RIGHT card is the new
  // challenger (value hidden as "?"). The player taps whichever they think has
  // the higher value for the round's category.
  function cardHTML(d, opts) {
    opts = opts || {};
    const stat = opts.stat;
    let statBlock = "";
    if (opts.reveal) {
      statBlock = `<div class="statline">${stat.noun}</div>
        <div class="statval">${stat.fmt(d[stat.key])} <span class="unit">${stat.unit}</span></div>`;
    } else if (opts.hidden) {
      statBlock = `<div class="statline">${stat.noun}</div>
        <div class="statval">?</div>`;
    }
    const media = d.image
      ? `<div class="dino-img"><img src="${d.image}" alt="Life reconstruction of ${d.name}" loading="lazy" decoding="async" onerror="this.parentNode.innerHTML='<span class=&quot;silhouette&quot;>${d.silhouette}</span>'" /></div>`
      : `<div class="dino-img"><span class="silhouette">${d.silhouette}</span></div>`;
    return `<div class="period-strip"></div>
      ${media}
      <div class="dname">${d.name}</div>
      ${statBlock}`;
  }

  function renderRound(round) {
    state.round = round;
    state.answered = false;
    els.left.className = "dino pick period-" + round.left.period;
    els.right.className = "dino pick period-" + round.right.period;
    els.left.innerHTML = cardHTML(round.left, { stat: round.stat, reveal: true });
    els.right.innerHTML = cardHTML(round.right, { stat: round.stat, hidden: true });
    els.prompt.innerHTML = `${round.stat.q}`;
    hideNext();
    els.left.onclick = () => onPick("left");
    els.right.onclick = () => onPick("right");
  }

  const TWEEN_DP = { eq: 1, length: 1, height: 1, skull: 2 }; // decimals to show mid-tween
  function tweenValue(el, stat, target) {
    const dur = 650, start = performance.now();
    const dp = TWEEN_DP[stat.key];
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      const shown = dp != null ? val.toFixed(dp) : stat.fmt(Math.round(val));
      el.innerHTML = `${shown} <span class="unit">${stat.unit}</span>`;
      if (t < 1) requestAnimationFrame(step);
      else el.innerHTML = `${stat.fmt(target)} <span class="unit">${stat.unit}</span>`;
    }
    requestAnimationFrame(step);
  }

  function onPick(side) {
    if (state.answered) return;
    state.answered = true;
    const round = state.round, key = round.stat.key;
    els.left.onclick = els.right.onclick = null;
    els.left.classList.remove("pick");
    els.right.classList.remove("pick");

    // reveal the challenger's value
    els.right.innerHTML = cardHTML(round.right, { stat: round.stat, reveal: true });
    const valEl = els.right.querySelector(".statval");
    if (key === "yearNamed") valEl.innerHTML = `${round.stat.fmt(round.right[key])} <span class="unit">${round.stat.unit}</span>`;
    else tweenValue(valEl, round.stat, round.right[key]);

    // the higher card is the right answer; highlight it, flag a wrong pick
    const higherSide = round.left[key] > round.right[key] ? "left" : "right";
    const correct = side === higherSide;
    (higherSide === "left" ? els.left : els.right).classList.add("correct");
    if (!correct) (side === "left" ? els.left : els.right).classList.add("wrong");

    if (mode === "endless") endlessAfter(correct);
    else dailyAfter(correct);
  }

  // ---------- Next button ----------
  function showNext(onNext) {
    if (els.arena) els.arena.classList.add("answered");
    els.next.classList.remove("hidden");
    els.next.onclick = () => { hideNext(); onNext(); };
  }
  function hideNext() {
    if (els.arena) els.arena.classList.remove("answered");
    els.next.classList.add("hidden");
    els.next.onclick = null;
  }

  // ---------- ENDLESS ----------
  function startEndless() {
    mode = "endless";
    state = { streak: 0, round: null, answered: false };
    els.scoreLabel.textContent = "Streak";
    els.dots.classList.add("hidden");
    if (els.dailyCat) els.dailyCat.classList.add("hidden");
    els.bestVal.parentElement.classList.remove("hidden");
    els.bestVal.textContent = getBest();
    els.scoreVal.textContent = "0";
    hideNext();
    showGame();
    renderRound(E.makeRound(Math.random));
  }

  function endlessAfter(correct) {
    if (correct) {
      state.streak++;
      els.scoreVal.textContent = state.streak;
      if (state.streak > getBest()) { setBest(state.streak); els.bestVal.textContent = state.streak; }
      const prev = state.round;
      showNext(() => {
        // the just-revealed challenger is kept as the new anchor
        const next = E.makeRound(Math.random, { forcedLeft: prev.right, avoid: new Set([prev.left.name]) })
          || E.makeRound(Math.random);
        renderRound(next);
      });
    } else {
      setTimeout(endlessOver, 1250);
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
  // Categories varied enough to fill a 10-round day without feeling repetitive.
  // (Brain EQ, eggs and fingers have too few dinosaurs / distinct values to
  //  carry a whole daily on their own, so they only appear in endless mode.)
  const DAILY_STAT_KEYS = ["weight", "length", "height", "skull", "mya", "yearNamed", "teeth", "topSpeed", "fossilSpecimens"];

  function pickDailyStat(rng) {
    const elig = E.STATS.filter(s => DAILY_STAT_KEYS.indexOf(s.key) !== -1 && E.withStat(s.key).length >= 10);
    return elig[Math.floor(rng() * elig.length)].key;
  }

  // Build the day's chain: up to 10 comparisons where each challenger becomes
  // the next anchor, and no dinosaur is reused — so each appears in at most two
  // (consecutive) rounds. Deterministic from the seed.
  function buildDailyChain(rng, statKey) {
    const chain = [], used = new Set();
    const first = E.makeRound(rng, { statKey });
    if (!first) return chain;
    chain.push(first); used.add(first.left.name); used.add(first.right.name);
    for (let i = 1; i < DAILY_ROUNDS; i++) {
      const prev = chain[i - 1];
      const r = E.makeRound(rng, { statKey, forcedLeft: prev.right, avoid: used })
        || E.makeRound(rng, { statKey, forcedLeft: prev.right, avoid: new Set([prev.left.name]) })
        || E.makeRound(rng, { statKey, forcedLeft: prev.right });
      if (!r) break;
      chain.push(r); used.add(r.right.name);
    }
    return chain;
  }

  function startDaily() {
    mode = "daily";
    const today = new Date();
    const seed = E.dateSeed(today);
    const saved = JSON.parse(localStorage.getItem(LS.daily(seed)) || "null");
    if (saved && saved.done) { showDailyResult(seed, saved.results, today); return; }

    const rng = E.makeRng(seed);
    const statKey = pickDailyStat(rng);          // one fixed category for everyone today
    const chain = buildDailyChain(rng, statKey);
    state = { seed, statKey, chain, idx: 0, results: [], date: today, round: null, answered: false };

    els.scoreLabel.textContent = "Round";
    els.bestVal.parentElement.classList.add("hidden");
    els.dots.classList.remove("hidden");
    if (els.dailyCat) {
      els.dailyCat.textContent = "Today's category · " + E.STAT_BY_KEY[statKey].cat;
      els.dailyCat.classList.remove("hidden");
    }
    els.scoreVal.textContent = "1/" + DAILY_ROUNDS;
    renderDots();
    showGame();
    renderRound(chain[0]);
  }

  function renderDots() {
    let h = "";
    for (let i = 0; i < DAILY_ROUNDS; i++) {
      let cls = "dot";
      if (i < state.results.length) cls += state.results[i] ? " correct" : " wrong";
      else if (i === state.idx && !state.answered) cls += " current";
      h += `<span class="${cls}"></span>`;
    }
    els.dots.innerHTML = h;
  }

  function dailyAfter(correct) {
    state.results.push(correct);
    renderDots();
    if (!correct) { setTimeout(finishDaily, 1250); return; } // one miss ends the run
    state.idx++;
    if (state.idx < state.chain.length) {
      showNext(() => {
        els.scoreVal.textContent = (state.idx + 1) + "/" + DAILY_ROUNDS;
        renderDots();
        renderRound(state.chain[state.idx]);
      });
    } else {
      setTimeout(finishDaily, 1250); // cleared every round
    }
  }

  function finishDaily() {
    localStorage.setItem(LS.daily(state.seed), JSON.stringify({ done: true, results: state.results }));
    showDailyResult(state.seed, state.results, state.date);
  }

  function showDailyResult(seed, results, date) {
    if (els.dailyCat) els.dailyCat.classList.add("hidden");
    hideNext();
    const score = results.filter(Boolean).length;
    // pad to 10: played rounds show 🟩/🟥, rounds never reached show ⬛
    let grid = "";
    for (let i = 0; i < DAILY_ROUNDS; i++) grid += i < results.length ? (results[i] ? "🟩" : "🟥") : "⬛";
    const dstr = fmtDate(date || new Date());
    const shareText =
      `DinoDecide ${dstr}\n${score}/${DAILY_ROUNDS} ${score === DAILY_ROUNDS ? "🦖 perfect!" : "🦕"}\n${grid}\n${location.origin}${location.pathname.replace(/decide\.html$/, "")}`;

    els.sheet.innerHTML = `
      <h2>${score === DAILY_ROUNDS ? "Perfect day! 🦖" : "Daily done!"}</h2>
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

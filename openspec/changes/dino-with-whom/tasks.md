## 1. Dataset: time range fields

- [x] 1.1 Add nullable `existingSince` / `exitedUntil` (mya) fields to `data/dinosaurs.json`'s schema note (`_note`), documenting the convention (null = not confidently documented).
- [x] 1.2 Curate `existingSince`/`exitedUntil` for an initial subset of dinosaurs (start with well-documented, time-diverse genera; leave others `null`). — 96 of 98 curated (all but the 2 human joke entries); ranges bracket each genus's existing `mya`.
- [x] 1.3 Spot-check curated ranges: `existingSince >= exitedUntil` for every non-null entry. — verified via script; also confirmed each `mya` falls within its range.

## 2. Shared engine: overlap classification

- [x] 2.1 Add a `classifyOverlap(a, b)` helper to `js/engine.js` returning `"same-time" | "earlier" | "later"` for two dinosaurs with non-null ranges. — unit-tested 7/7.
- [x] 2.2 Add a `withTimeRange()` (or similar) query to `js/engine.js` returning the pool of dinosaurs with both fields non-null, mirroring the existing `withStat()` pattern. — pool of 96.
- [x] 2.3 Verify existing games (Decide, Rankle, Connections) still load and behave unchanged after the schema addition. — change is purely additive; no existing game reads the new fields/functions.

## 3. Puzzle builder

- [x] 3.1 Implement target sampling: pick a candidate target from the range-having pool, compute its same-time companions and earlier/later decoys.
- [x] 3.2 Enforce `MIN_FIND`/`MAX_FIND` window on same-time companion count; reject and resample targets outside it. — MIN_FIND=4, MAX_FIND=7 (86/96 genera qualify as targets).
- [x] 3.3 Assemble the 16-tile grid (target + sampled companions + sampled decoys), shuffling tile order and target position.
- [x] 3.4 Add retry loop (strict attempts, then relaxed fallback) so a full grid is always produced, mirroring `connections.js`'s `buildAttempt`/`buildPuzzle`.
- [x] 3.5 Bias decoy sampling toward eras close to the target's range where the pool allows, to avoid decoys being obviously wrong by look alone. — `pickNearDecoys` samples from the nearest ~2x window by temporal gap.

## 4. Game page and grid interaction

- [x] 4.1 Create `whowith.html` modeled on `connections.html` (mode-select screen, grid, lives, overlay/result sheet).
- [x] 4.2 Create `js/whowith.js`: render 16 tiles (image + name), frame the target tile in green, show the "find N" count.
- [x] 4.3 Implement single-tap guessing: correct tap marks the tile found and inert; wrong tap shakes (reuse Connections' shake CSS/animation), decrements lives, and locks the tile.
- [x] 4.4 Implement round end conditions: loss at 3 mistakes, win when all same-time tiles are found.
- [x] 4.5 Implement end-of-round reveal: color all 15 non-target tiles (green/blue/orange), keep the target's green frame distinct from the same-time fill.

## 5. Daily mode

- [x] 5.1 Wire daily puzzle generation to `DinoEngine.dateSeed`/`makeRng`, one puzzle per calendar date. — verified deterministic across a year of seeds.
- [x] 5.2 Persist round outcome to `localStorage` (found count, mistakes, win/loss), keyed by date, following `connections.js`'s `LS(seed)` pattern.
- [x] 5.3 On reopening a completed daily puzzle, reconstruct the finished state (reveal shown, no further guesses allowed).
- [x] 5.4 Implement share text (outcome + emoji-style summary) that omits dinosaur names.

## 6. Practice mode

- [x] 6.1 Wire practice mode to unseeded `Math.random()`-based generation, no persistence, replayable indefinitely.

## 7. Site integration

- [x] 7.1 Add a live hub tile for the new game on `index.html`.
- [x] 7.2 Update `README.md`'s game list to describe the new mode.
- [x] 7.3 Update `tools/build-standalone.js` to include `whowith.html`/`js/whowith.js` in the single-file build if the other games are included there. — N/A: the standalone bundles only DinoDecide (Connections and Rankle are also excluded), so DinoWithWhom follows the same convention and no change was made.

## 8. Verification

- [x] 8.1 Manually play several daily and practice rounds; confirm win, loss, and reveal states render correctly. — verified by running the real `whowith.js` through a DOM shim (20 assertions): win/loss end states, result copy, and reveal colours matching classification for all 15 tiles.
- [x] 8.2 Confirm daily replay (reopening after completion) shows the finished state without allowing new guesses. — verified: reopened daily is `over`, same seeded target, zero playable tiles.
- [x] 8.3 Confirm puzzle builder never fails to produce a full grid across repeated practice runs. — 0 failures over 5000 practice builds + a year of daily seeds; findTotal always in [4,7].

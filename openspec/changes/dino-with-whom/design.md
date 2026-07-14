## Context

DinoTrivia is a static, no-build site (`index.html` hub + one page/script per game, shared `js/engine.js` for data loading and stats). Each existing game owns its `localStorage` daily-state key and its own puzzle-generation logic; `js/connections.js` is the closest precedent for a grid-based daily/practice game with a mistake counter and a share-card ending, and this game reuses that shape.

The dataset (`data/dinosaurs.json`) currently has one `mya` midpoint per dinosaur — enough to compare "who lived earlier" but not to know whether two dinosaurs' lifespans actually overlapped. This game needs real ranges, which don't exist anywhere in the codebase yet and have no automatable source (unlike images, which `tools/fetch-images.js` pulls from Wikimedia) — they have to be curated by hand, genus by genus, from published stratigraphic ranges.

## Goals / Non-Goals

**Goals:**
- Add nullable `existingSince` / `exitedUntil` (mya) fields to the dataset and a shared overlap classification usable by this game (and future ones).
- Ship a daily + practice game: 4×4 grid, one pre-framed target, find every tile that overlaps the target's era within 3 wrong guesses.
- Reuse Connections' visual language (shake-on-wrong, lives, daily `localStorage` replay, share card) so the game feels native to the site rather than bolted on.
- Guarantee every generated puzzle (daily or practice) is well-formed: the target has enough same-time companions to reach the "find" count and enough earlier/later dinosaurs to fill the remaining tiles.

**Non-Goals:**
- Not curating ranges for all 98 dinosaurs up front — the game ships against whatever subset has confidently documented ranges, and the pool grows over time.
- Not exposing exact dates during play — only the post-round reveal shows the earlier/same-time/later classification, never numeric mya.
- Not building a generic "any two dinosaurs" overlap-checker UI elsewhere in the site — just the shared classification helper in `engine.js`.

## Decisions

**Single-tap-per-guess, not select-then-submit.** Connections requires selecting exactly 4 tiles before submitting, because group membership can only be judged once all 4 are chosen. Here every candidate tile can be judged individually against the fixed target (overlap or not), so there's no reason to batch: tapping a tile *is* the guess. Correct tap → tile gets a "found" marker and becomes inert (target-relative info still hidden, just marked found); wrong tap → the same shake animation as Connections, a life is lost, and the tile locks out (no re-tapping to avoid farming extra shakes on a tile already known-wrong). This keeps "same error reaction as Connections" (the shake) while dropping Connections' multi-select mechanic, which doesn't fit a variable-size target set.

**No progress hint (unlike Connections' "N away").** Connections shows "N away!" after a wrong guess because a wrong 4-group selection is ambiguous (could be 1, 2, or 3 correct). Here a wrong guess is unambiguous (that one tile doesn't overlap), so there's nothing to hint — confirmed by the user: no hint text at all, just the shake + life loss.

**Reveal uses a 3-way fixed-meaning palette, not Connections' arbitrary per-group colors.** Every non-target tile is in exactly one of three mutually exclusive states relative to the target (ranges that don't intersect must be strictly before or after), so the reveal always uses the same three colors: green = same time, blue = lived earlier, orange = lived later. The target tile keeps its green *frame* (a border treatment) throughout, rather than being filled with the "same time" green, so it stays visually distinct from the group it defines — no ambiguity between "this is the reference" and "this matches the reference."

**Puzzle construction retries like Connections' `buildAttempt`/`buildPuzzle`.** Pick a random target from the pool of dinosaurs with non-null ranges; compute its same-time companions and earlier/later decoys (also range-having only); if the companion count isn't within a configurable `[MIN_FIND, MAX_FIND]` window or there aren't enough decoys to fill 16 tiles, resample a different target. Fall back to a relaxed attempt (as Connections does for its 16-tile guarantee) if no strict attempt succeeds within N tries, so the game never fails to render. Exact `MIN_FIND`/`MAX_FIND` values are a tuning question that can only really be answered once real range data exists — see Open Questions.

**Data pool is whatever has both fields set.** `existingSince`/`exitedUntil` are added incrementally, the same nullable convention as every other stat (`null` = not confidently documented, never guessed). The puzzle builder simply filters to dinosaurs with both fields present; the game can ship as soon as that subset is large and time-diverse enough to build valid puzzles, without blocking on full dataset coverage.

## Risks / Trade-offs

- **[Risk] Range data is sparse at launch (curated by hand, not automated) → puzzle builder may struggle to find valid targets.** Mitigation: retry-sampling + relaxed fallback (as above); track pool size and refuse to ship the mode until manual spot-checks show puzzles are consistently solvable and non-trivial.
- **[Risk] A target with very few same-time companions makes for a bland "find 1" round.** Mitigation: `MIN_FIND` floor in the builder rejects targets below it, same pattern as Connections rejecting groups that can't reach `PER_GROUP`.
- **[Risk] Naive decoy sampling could make wrong answers "obviously" wrong by era-typical look (e.g. feathered vs. armored) rather than by genuine trivia knowledge.** Mitigation: bias decoy sampling toward eras *close to* the target's range rather than uniformly across all non-overlapping dinosaurs, where the pool size allows it; treat as a tuning knob, not a launch blocker.
- **[Trade-off] Locking tiles after a wrong tap (vs. leaving them re-tappable) is a UX opinion, not something the user explicitly specified.** Chosen because it prevents an accidental double-tap from silently burning two of the three lives on information the player already has; easy to revisit if it feels wrong in play.

## Open Questions

- `MIN_FIND` / `MAX_FIND` and the total decoy pool size — needs real curated range data before these can be tuned with confidence.
- Working name **DinoWithWhom** vs. something else for the player-facing title/hub tile — not settled.
- How many dinosaurs need ranges before the mode is considered launch-ready (a hard minimum isn't set here; likely decided empirically during curation).

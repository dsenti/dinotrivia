## Why

The dataset only stores a single midpoint `mya` per dinosaur, which is enough to answer "who lived earlier" but not "did these two dinosaurs ever actually coexist" — a natural trivia question (e.g. Tyrannosaurus and Stegosaurus never overlapped, ~86 million years apart) that today's games can't ask. Adding a time *range* per dinosaur unlocks a new daily/practice game built around finding who shared an era.

## What Changes

- Extend `data/dinosaurs.json` with `existingSince` / `exitedUntil` (mya, nullable like other stats) for dinosaurs with a confidently documented time range.
- Add a shared overlap classification (in `js/engine.js`) for any pair of dinosaurs: **same time** (ranges intersect), **earlier** (fully precedes), or **later** (fully follows) relative to a reference dinosaur.
- New game mode — working name **DinoWithWhom**:
  - 4×4 grid of dinosaur tiles (image + name), one tile pre-selected/framed green as the target.
  - Player taps tiles to guess which of the other 15 lived at the same time as the target. Player is told up front how many they need to find.
  - Wrong guess: same shake/life-loss feedback as DinoConnections, but no "N away" hint text.
  - 3 wrong guesses ends the round (loss); finding every overlapping dinosaur ends it (win).
  - End-of-round reveal re-colors the full grid regardless of outcome: green = same time as target, blue = lived earlier, orange = lived later.
  - **Daily mode**: one date-seeded puzzle per day, shared across players, replay-safe (matches Connections' `localStorage` daily-result pattern) with a shareable emoji result.
  - **Practice mode**: unlimited randomly generated puzzles.
- Puzzle builder must guarantee a viable target: enough same-time companions to fill the "find" set and enough earlier/later decoys to fill the grid, retry-sampling like Connections' `buildAttempt`/`buildPuzzle` before falling back.
- New page (`whowith.html`) and script (`js/whowith.js`) following the existing per-game structure; add a live tile to `index.html`'s hub grid.

## Capabilities

### New Capabilities
- `dino-time-ranges`: time-range data on the shared dinosaur dataset and the same-time/earlier/later classification logic used to build and score puzzles.
- `dino-with-whom-game`: the daily + practice "find who overlapped" game mode — puzzle construction, grid interaction, scoring, and end-of-round reveal.

### Modified Capabilities
- None. `data/dinosaurs.json`'s existing fields and other games are unaffected; the new fields are additive and nullable.

## Impact

- `data/dinosaurs.json`: additive schema change (two new nullable fields per dinosaur); requires manual curation of time ranges (no existing automated source, similar in kind to the image-curation work in `tools/fetch-images.js` but not automatable the same way).
- `js/engine.js`: new shared helper(s) for range overlap classification, reusable by future games.
- New `whowith.html` + `js/whowith.js`, modeled on `connections.html` / `js/connections.js`.
- `index.html`: new hub tile linking to the game.
- `README.md`: mention the new mode alongside the other stubs/live games.
- `tools/build-standalone.js`: needs to know about the new page/script if the single-file build should include it.

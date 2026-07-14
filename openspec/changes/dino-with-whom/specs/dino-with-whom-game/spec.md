## ADDED Requirements

### Requirement: Puzzle pool restricted to dinosaurs with time ranges
The puzzle builder SHALL only pick target dinosaurs and candidate tiles from the subset of the dataset where both `existingSince` and `exitedUntil` are non-null.

#### Scenario: Dinosaur without a range is never used
- **WHEN** the puzzle builder assembles a 4x4 grid
- **THEN** no dinosaur with a null `existingSince` or `exitedUntil` appears as the target or as any of the 15 other tiles

### Requirement: Valid puzzle guarantee
The puzzle builder SHALL only accept a target dinosaur whose same-time companion count (within the range-having pool, excluding itself) falls within a configured `[MIN_FIND, MAX_FIND]` window, and for which enough earlier/later dinosaurs exist to fill the remaining grid tiles. If a sampled target does not satisfy this, the builder SHALL resample a different target, retrying before falling back to a relaxed attempt so a grid is always produced.

#### Scenario: Target with too few companions is rejected
- **WHEN** a candidate target has fewer same-time companions than `MIN_FIND` in the range-having pool
- **THEN** the builder discards that candidate and samples a different target

#### Scenario: Grid is always produced
- **WHEN** the builder cannot find a strictly valid target within its retry budget
- **THEN** it falls back to a relaxed attempt so a full 16-tile grid is still rendered

### Requirement: Daily puzzle
The game SHALL generate one puzzle per calendar day using a date-seeded random generator (consistent with the site's existing `dateSeed`/`makeRng` pattern), identical for every player on that date.

#### Scenario: Same puzzle for all players on a given day
- **WHEN** two players open the daily mode on the same calendar date
- **THEN** they are shown the same target dinosaur and the same set of 16 tiles

### Requirement: Daily replay from local storage
The game SHALL persist the outcome of a completed daily round (win/loss, guesses made, mistakes made) to `localStorage`, keyed by date, and SHALL reconstruct the finished state (including the end-of-round reveal) if the player reopens daily mode after already completing that day's puzzle, without allowing further guesses.

#### Scenario: Reopening a completed daily puzzle
- **WHEN** a player has already finished today's daily round and reopens daily mode
- **THEN** the game shows the same finished outcome (win/loss and reveal) instead of a fresh playable grid

### Requirement: Practice mode
The game SHALL offer a practice mode that generates a new, unseeded random puzzle each time it starts, with no daily limit and no persisted outcome.

#### Scenario: Starting practice repeatedly
- **WHEN** a player finishes or abandons a practice round and starts another
- **THEN** a newly sampled target and grid are generated, independent of any daily state

### Requirement: Target presentation
Each round SHALL present a 4x4 grid of 16 dinosaur tiles (image and name), with exactly one tile pre-marked as the target using a distinct green frame, and SHALL tell the player up front how many of the remaining 15 tiles they need to find.

#### Scenario: Target is visually distinguished
- **WHEN** a round starts
- **THEN** exactly one tile has a green frame and the other 15 do not

#### Scenario: Find count is shown
- **WHEN** a round starts
- **THEN** the player is shown the number of tiles they must find that overlap the target's time range

### Requirement: Single-tap guessing
Each tap on a non-target, not-yet-locked tile SHALL be evaluated immediately as one guess: if the tile's time range overlaps the target's, it SHALL be marked found and become inert; otherwise it SHALL play the same shake animation used by DinoConnections' wrong-guess feedback, consume one of the player's three lives, and then lock so it cannot be tapped again.

#### Scenario: Correct guess
- **WHEN** the player taps a tile whose range overlaps the target's
- **THEN** the tile is marked found, becomes non-interactive, and the found count increases by one

#### Scenario: Incorrect guess
- **WHEN** the player taps a tile whose range does not overlap the target's
- **THEN** the tile shakes, one life is lost, and the tile becomes locked against further taps

#### Scenario: No hint on a wrong guess
- **WHEN** the player makes an incorrect guess
- **THEN** no message indicating closeness or remaining count beyond the existing found/lives counters is shown

### Requirement: Round end conditions
A round SHALL end in a loss when the player has made three incorrect guesses, and SHALL end in a win when the player has found every same-time tile in the grid, whichever happens first.

#### Scenario: Loss on third mistake
- **WHEN** the player's third incorrect guess is made
- **THEN** the round ends immediately as a loss, even if unfound same-time tiles remain

#### Scenario: Win on finding all matches
- **WHEN** the player has correctly found every tile that overlaps the target's time range
- **THEN** the round ends immediately as a win, regardless of remaining lives

### Requirement: End-of-round reveal
When a round ends (win or loss), the game SHALL reveal the classification of all 15 non-target tiles using three fixed colors: green for same-time, blue for earlier, and orange for later, while the target tile retains its distinct green frame rather than the same-time fill.

#### Scenario: Reveal on loss shows full classification
- **WHEN** a round ends in a loss with unfound same-time tiles remaining
- **THEN** every tile (found or not) is shown colored by its true classification relative to the target

#### Scenario: Target stays visually distinct in reveal
- **WHEN** the end-of-round reveal is shown
- **THEN** the target tile displays its green frame and is not filled with the same-time color used for its matches

### Requirement: Daily result sharing
After completing a daily round, the game SHALL offer a shareable text summary (consistent with the site's other daily games) that does not reveal the identities of the dinosaurs involved.

#### Scenario: Share text omits dinosaur names
- **WHEN** a player shares their daily result
- **THEN** the shared text communicates the outcome (found count, mistakes, win/loss) without listing dinosaur names

## ADDED Requirements

### Requirement: Dinosaur time range fields
Each dinosaur entry in `data/dinosaurs.json` SHALL support two nullable numeric fields, `existingSince` and `exitedUntil`, both expressed in millions of years ago (mya), where `existingSince` is greater than or equal to `exitedUntil` (the dinosaur existed from the larger mya value until the smaller one). A dinosaur without a confidently documented range SHALL have both fields set to `null`, following the dataset's existing convention for undocumented stats (never an invented value).

#### Scenario: Dinosaur with a documented range
- **WHEN** a dinosaur entry has both `existingSince` and `exitedUntil` set to numbers
- **THEN** `existingSince` is greater than or equal to `exitedUntil`

#### Scenario: Dinosaur without a documented range
- **WHEN** a dinosaur's time range is not confidently documented
- **THEN** both `existingSince` and `exitedUntil` are `null` for that entry

### Requirement: Time range overlap classification
`js/engine.js` SHALL expose a function that classifies the relationship between two dinosaurs' time ranges as exactly one of: `same-time` (the ranges intersect), `earlier` (the first dinosaur's range fully precedes the second's), or `later` (the first dinosaur's range fully follows the second's). The function SHALL only be called with dinosaurs that both have non-null ranges.

#### Scenario: Overlapping ranges
- **WHEN** two dinosaurs' `[exitedUntil, existingSince]` ranges intersect
- **THEN** the classification is `same-time`

#### Scenario: Non-overlapping ranges, reference lived first
- **WHEN** dinosaur A's `exitedUntil` (in mya, i.e. more recent end of its range) is greater than dinosaur B's `existingSince`
- **THEN** classifying B relative to A yields `later` (B appeared after A went extinct)

#### Scenario: Non-overlapping ranges, reference lived later
- **WHEN** dinosaur A's `existingSince` is less than dinosaur B's `exitedUntil`
- **THEN** classifying B relative to A yields `earlier` (B went extinct before A appeared)

### Requirement: Range-aware dataset queries stay opt-in
Existing engine queries and games that do not use time ranges SHALL be unaffected by the new fields; only code that explicitly filters or reads `existingSince`/`exitedUntil` is impacted.

#### Scenario: Existing games unaffected
- **WHEN** DinoDecide, DinoRankle, or DinoConnections load the dataset after the new fields are added
- **THEN** their existing behavior is unchanged, since none of them read `existingSince` or `exitedUntil`

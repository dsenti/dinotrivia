/* DinoTrivia shared engine: data, stat config, seeded RNG, pair selection.
   Kept generic so future games (Dinodle, DinoRankle) reuse the same dataset. */
(function (global) {
  "use strict";

  // Silhouette emoji by rough group — playful, not scientific.
  const DIET_EMOJI = { carnivore: "🦖", herbivore: "🦕", omnivore: "🦴" };
  function silhouette(d) {
    if (d.name === "Stegosaurus" || d.name === "Kentrosaurus") return "🦕";
    if (d.name === "Triceratops" || d.name === "Torosaurus" || d.name === "Pentaceratops") return "🦏";
    if (d.name === "Archaeopteryx" || d.name === "Microraptor") return "🐦";
    return DIET_EMOJI[d.diet] || "🦖";
  }

  // Each comparable stat. `dir:"desc"` means a bigger raw number = the
  // "more/earlier/first" end; we always ask the player HIGHER or LOWER on the
  // displayed number, so direction only affects wording, not scoring.
  const STATS = [
    { key: "weight", label: "heavier", noun: "weight", unit: "kg", fmt: v => fmtNum(v) },
    { key: "mya", label: "older (lived earlier)", noun: "age", unit: "million yrs ago", fmt: v => fmtNum(v) },
    { key: "yearNamed", label: "named more recently", noun: "year first named", unit: "", fmt: v => String(v) },
    { key: "teeth", label: "more teeth", noun: "number of teeth", unit: "teeth", fmt: v => fmtNum(v) },
    { key: "topSpeed", label: "faster", noun: "top speed", unit: "km/h", fmt: v => fmtNum(v) },
    { key: "eq", label: "brainier", noun: "brain power (EQ)", unit: "EQ", fmt: v => v.toFixed(1) },
    { key: "fingers", label: "more fingers", noun: "fingers per hand", unit: "fingers", fmt: v => String(v) },
    { key: "eggClutch", label: "more eggs", noun: "eggs per clutch", unit: "eggs", fmt: v => String(v) },
    { key: "fossilSpecimens", label: "more fossils found", noun: "fossils discovered", unit: "specimens", fmt: v => fmtNum(v) }
  ];
  const STAT_BY_KEY = {};
  STATS.forEach(s => (STAT_BY_KEY[s.key] = s));

  function fmtNum(v) {
    if (v >= 1000) return v.toLocaleString("en-US");
    return String(v);
  }

  // --- seeded PRNG (mulberry32) so a given seed always yields the same run ---
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dateSeed(d) {
    // d: JS Date -> integer YYYYMMDD
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  const slugify = n => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  let DINOS = [];
  let CREDITS = [];
  function ingest(json, credits) {
    CREDITS = credits || [];
    const byName = {};
    CREDITS.forEach(c => (byName[c.name] = c));
    DINOS = json.dinosaurs.map(d => {
      const c = byName[d.name];
      const images = global.DINO_IMAGES || null; // slug -> data URI (single-file build)
      const s = slugify(d.name);
      return Object.assign({
        slug: s,
        silhouette: silhouette(d),
        image: images ? (images[s] || null) : (c ? c.file : null),
        credit: c || null
      }, d);
    });
    return DINOS;
  }
  function load() {
    // single-file build inlines data (DINO_JSON), images (DINO_IMAGES) and
    // credits (DINO_CREDITS); multi-file fetches the JSON files.
    if (global.DINO_JSON) return Promise.resolve(ingest(global.DINO_JSON, global.DINO_CREDITS));
    return Promise.all([
      fetch("data/dinosaurs.json", { cache: "no-cache" }).then(r => r.json()),
      fetch("assets/dino/credits.json", { cache: "no-cache" }).then(r => r.json()).catch(() => [])
    ]).then(([json, credits]) => ingest(json, credits));
  }

  // Which dinos have a usable (non-null) value for a stat.
  function withStat(key) {
    return DINOS.filter(d => d[key] !== null && d[key] !== undefined);
  }

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  /* Build one round: {stat, left, right} where left & right have DIFFERENT
     values for stat (never a tie). Optionally exclude a set of names from
     `right` (to avoid immediate repeats). Uses rejection sampling. */
  function makeRound(rng, opts) {
    opts = opts || {};
    const left0 = opts.forcedLeft || null;
    const has = (d, key) => d[key] !== null && d[key] !== undefined;
    // Candidate stats must have >=2 dinos overall AND, if the left card is
    // fixed (endless chain), be a stat that fixed dino actually has a value for
    // — otherwise we'd reveal a null value for it.
    let usableStats = STATS.filter(s => withStat(s.key).length >= 2);
    if (left0) usableStats = usableStats.filter(s => has(left0, s.key));
    if (opts.statKey) usableStats = usableStats.filter(s => s.key === opts.statKey); // fixed category (daily)
    if (!usableStats.length) return null;
    for (let tries = 0; tries < 500; tries++) {
      const stat = pick(rng, usableStats);
      const pool = withStat(stat.key);
      const left = left0 || pick(rng, pool);
      const right = pick(rng, pool);
      if (right.name === left.name) continue;
      if (right[stat.key] === left[stat.key]) continue; // never a tie
      if (opts.avoid && opts.avoid.has(right.name)) continue;
      return { stat: stat, left: left, right: right };
    }
    return null; // should never happen with this dataset
  }

  global.DinoEngine = {
    STATS, STAT_BY_KEY, load, withStat, makeRound, makeRng, dateSeed, silhouette, slugify,
    get all() { return DINOS; },
    get credits() { return CREDITS; }
  };
})(window);

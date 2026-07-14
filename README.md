# 🦕 DinoTrivia

Daily dinosaur brain games — a dinosaur-themed take on the "daily games" format.
First game: **DinoDecide** (higher / lower with dinosaurs).

Pure static site: HTML + CSS + vanilla JS. No build step, no backend, no dependencies.
Hosts for free on GitHub Pages.

## Games

- **DinoDecide** — Higher or lower? Two dinosaurs, one hidden stat. Guess which
  wins on weight, teeth, top speed, brain power (EQ), fingers, eggs per clutch,
  fossils found, when they lived, or when they were named.
  - **Daily Challenge** — 10 rounds, the same for everyone that day (date-seeded),
    with a shareable emoji result.
  - **Endless Streak** — keep going until you slip up; best streak saved locally.
  - The two dinosaurs shown always differ on the stat in play, so a tie is impossible.

- **DinoConnections** — Group each dinosaur's four tiles (picture, name and two
  facts) into its four sets. Daily + Practice, four mistakes allowed.

- **DinoWithWhom** — A geological period is named (Triassic, Jurassic or
  Cretaceous); tap the dinosaurs from the grid that lived in it. You're told how
  many to find and get five wrong guesses. The end-of-round reveal colours every
  tile by its true period: orange = Triassic, green = Jurassic, blue = Cretaceous.
  - **Daily Puzzle** — date-seeded, same for everyone, with a shareable result.
  - **Practice** — a fresh random puzzle every time.

More games (Dinodle) are stubbed on the home page.

## Run locally

It fetches `data/dinosaurs.json`, so open it through a web server (not `file://`):

```bash
python3 -m http.server 8199
# then visit http://localhost:8199
```

On **Python 3.6** `http.server` is single-threaded, so it serves the page's
images and data one request at a time and the site can feel very slow to load.
Python 3.7+ threads requests automatically; on 3.6 use a threaded one-liner:

```bash
python -c "import http.server,socketserver;socketserver.ThreadingTCPServer.allow_reuse_address=True;socketserver.ThreadingTCPServer(('',8199),http.server.SimpleHTTPRequestHandler).serve_forever()"
```

## Deploy (GitHub Pages)

Push this folder to a GitHub repo, then in **Settings → Pages** set the source to
`main` / root. The site goes live at `https://<user>.github.io/<repo>/`.

## Data

`data/dinosaurs.json` holds ~60 well-known dinosaurs. Stats are approximate
published paleontological estimates chosen so the *relative order* is trustworthy
for a trivia game. `null` means a stat isn't confidently documented for that
dinosaur — it's simply never used in a comparison involving it (no invented numbers).
This dataset is the shared foundation for future games.

Each land/marine/flying genus also carries a time range — `existingSince` and
`exitedUntil` (mya) — powering DinoWithWhom's overlap logic. Both are `null`
where a range isn't confidently documented (e.g. the human joke entries), and
those dinosaurs are skipped by that game.

## Images

Each dinosaur shows a **life reconstruction** (paleoart), stored in `assets/dino/`
(full size) and `assets/dino/small/` (thumbnails). They are fetched from Wikimedia
Commons by `tools/fetch-images.js`, which prefers the curated "life restorations"
categories and rejects skeletons, skulls, size charts and maps. Every image is
free-licensed; attribution (artist, license, source) is recorded in
`assets/dino/credits.json` and shown on `credits.html`.

To refresh images: `node tools/fetch-images.js`.

## Single-file build

`node tools/build-standalone.js` bundles the whole site — CSS, JS, data, credits
and every image (inlined as data URIs) — into `dist/dinotrivia-standalone.html`,
a single self-contained file that runs offline or from anywhere.

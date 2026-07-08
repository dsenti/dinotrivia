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

More games (Dinodle, DinoRankle, DinoConnect) are stubbed on the home page.

## Run locally

It fetches `data/dinosaurs.json`, so open it through a web server (not `file://`):

```bash
python3 -m http.server 8199
# then visit http://localhost:8199
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

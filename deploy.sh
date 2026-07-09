#!/usr/bin/env bash
# One-shot deploy of DinoTrivia to GitHub Pages.
# Prerequisite: you are logged in ->  gh auth login
set -euo pipefail

REPO="${1:-dinotrivia}"     # repo name (default: dinotrivia)
cd "$(dirname "$0")"

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in. Run:  gh auth login   then re-run this script." >&2
  exit 1
fi

USER=$(gh api user -q .login)
echo "Deploying as $USER to repo '$REPO'..."

# Cache-bust static assets so browsers fetch the new CSS/JS right away
# (GitHub Pages serves assets with a 10-minute cache; without this a redeploy
#  can keep showing the old style.css / *.js until the cache expires).
VER=$(date +%Y%m%d%H%M%S)
node tools/stamp-version.js "$VER" >/dev/null 2>&1 || true
if ! git diff --quiet; then
  git add -A
  git -c user.name='DinoTrivia' -c user.email='dominik.senti@gmail.com' commit -qm "deploy: cache-bust assets ($VER)"
  echo "Stamped asset version $VER."
fi

# create the repo from this local folder (idempotent-ish: skip if it exists)
if gh repo view "$USER/$REPO" >/dev/null 2>&1; then
  echo "Repo already exists; pushing to it."
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$USER/$REPO.git"
  git branch -M main
  git push -u origin main
else
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

# Pages is configured to build via GitHub Actions (.github/workflows/pages.yml).
# The push above triggers that workflow, which builds and deploys the site.
# (We intentionally do NOT touch the Pages source here — flipping it back to the
#  legacy build pipeline can hit a stuck build queue.)
echo
echo "Pushed. GitHub Actions is deploying — watch it with:  gh run watch"
echo "Live shortly at:  https://$USER.github.io/$REPO/"

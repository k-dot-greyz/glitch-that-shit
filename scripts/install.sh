#!/usr/bin/env bash
# glitch-that-shit — one-command installer.
#
# Verifies the toolchain, installs the exact devDependencies pinned in
# package-lock.json (npm ci), runs typecheck + tests, builds the unpacked
# extension + zips into dist/, and prints browser load instructions.
# Nothing is downloaded beyond the npm lockfile; no secrets are used.
#
#   ./scripts/install.sh                  # Chrome/Edge + Firefox builds
#   ./scripts/install.sh --target chrome  # one target only (chrome|firefox)
#   ./scripts/install.sh --skip-tests     # faster, build only
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$(pwd)"
TARGET=""
SKIP_TESTS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --skip-tests) SKIP_TESTS=1; shift ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1 (see --help)" >&2; exit 2 ;;
  esac
done
if [[ -n "$TARGET" && "$TARGET" != "chrome" && "$TARGET" != "firefox" ]]; then
  echo "--target must be chrome or firefox" >&2; exit 2
fi

say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "Node.js not found — install Node 22 LTS or newer (https://nodejs.org)"
command -v npm  >/dev/null || die "npm not found"
node -e '
  const [maj, min] = process.versions.node.split(".").map(Number);
  const ok = maj > 22 || (maj === 22 && min >= 12) || (maj === 20 && min >= 19);
  if (!ok) { console.error(`Node ${process.versions.node} is too old (need 20.19+ or 22.12+)`); process.exit(1); }
' || die "please upgrade Node.js"

say "Installing pinned dev dependencies (npm ci)…"
npm ci --no-audit --no-fund --loglevel=error

if [[ $SKIP_TESTS -eq 0 ]]; then
  say "Typecheck…"
  npm run --silent lint
  say "Unit tests…"
  npm test --silent
fi

say "Building…"
if [[ -n "$TARGET" ]]; then node scripts/build.mjs --target "$TARGET"; else node scripts/build.mjs; fi

VERSION="$(node -p 'require("./package.json").version')"
cat <<EOT

✅ glitch-that-shit ${VERSION} is built.

  Chrome / Edge / Brave / Opera (Chromium)
    1. Open chrome://extensions  (edge://extensions on Edge)
    2. Turn on "Developer mode"
    3. Click "Load unpacked" and pick:
         ${ROOT}/dist/chrome
    (Zip for sharing: ${ROOT}/dist/glitch-that-shit-${VERSION}-chrome.zip)

  Firefox 140+
    1. Open about:debugging#/runtime/this-firefox
    2. Click "Load Temporary Add-on…" and pick:
         ${ROOT}/dist/firefox/manifest.json
    (Temporary add-ons are removed on restart; permanent install needs AMO signing.)

  Then click the ⚡ toolbar icon. Shortcuts: Ctrl+Shift+G toggle · Ctrl+Shift+E cycle effect ·
  Ctrl+Shift+F quick filter · Ctrl+Shift+S settings (change at chrome://extensions/shortcuts).
EOT

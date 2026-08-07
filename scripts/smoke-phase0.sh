#!/usr/bin/env bash
# Phase 0 smoke: automated tests only (no long-lived servers).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

echo "== Backend pytest =="
(
  cd "$ROOT/backend"
  .venv/bin/pytest -q
)

echo "== Frontend vitest =="
(
  cd "$ROOT/frontend"
  npm test
)

echo "== Frontend build =="
(
  cd "$ROOT/frontend"
  npm run build
)

echo "Phase 0 automated smoke: PASS"

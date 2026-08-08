#!/usr/bin/env bash
# Start the FastAPI backend from any cwd. Always runs inside backend/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/.venv"
PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"

if [[ ! -x "$VENV/bin/uvicorn" ]]; then
  echo "Missing backend venv. Create it with:"
  echo "  cd \"$BACKEND\" && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"

cd "$BACKEND"
echo "Backend dir: $BACKEND"
echo "SQLite:      ${SQLITE_PATH:-$BACKEND/data/app.db}"
echo "Listening:   http://${HOST}:${PORT}"
echo "Health:      http://${HOST}:${PORT}/api/v1/health"
echo "Sessions:    POST http://${HOST}:${PORT}/api/v1/sessions"
echo ""

exec "$VENV/bin/uvicorn" app.main:app --reload --host "$HOST" --port "$PORT"

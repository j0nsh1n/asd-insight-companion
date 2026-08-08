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

# If something already answers our health endpoint, do not start a second server.
if curl -sf "http://${HOST}:${PORT}/api/v1/health" >/dev/null 2>&1; then
  echo "Backend already running on http://${HOST}:${PORT}"
  curl -sS "http://${HOST}:${PORT}/api/v1/health"
  echo ""
  echo "UI: http://127.0.0.1:5173"
  echo "To restart:  fuser -k ${PORT}/tcp   then re-run this script"
  exit 0
fi

# Port taken by something else (or a hung process without healthy API).
if ss -tln 2>/dev/null | grep -qE ":${PORT}\\b" || \
   fuser "${PORT}/tcp" >/dev/null 2>&1; then
  echo "ERROR: port ${PORT} is already in use, but health check failed."
  echo "Who is using it:"
  ss -tlnp 2>/dev/null | grep -E ":${PORT}\\b" || true
  fuser -v "${PORT}/tcp" 2>&1 || true
  echo ""
  echo "Free the port, then retry:"
  echo "  fuser -k ${PORT}/tcp"
  echo "  ./scripts/run-backend.sh"
  echo "Or use another port:"
  echo "  PORT=8001 ./scripts/run-backend.sh"
  exit 1
fi

cd "$BACKEND"
echo "Backend dir: $BACKEND"
echo "SQLite:      ${SQLITE_PATH:-$BACKEND/data/app.db}"
echo "Listening:   http://${HOST}:${PORT}"
echo "Health:      http://${HOST}:${PORT}/api/v1/health"
echo "Sessions:    POST http://${HOST}:${PORT}/api/v1/sessions"
echo ""

exec "$VENV/bin/uvicorn" app.main:app --reload --host "$HOST" --port "$PORT"

#!/usr/bin/env bash
# Start backend + frontend for local Phase 0 development.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8000}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"

BACKEND_VENV="$ROOT/backend/.venv"
if [[ ! -x "$BACKEND_VENV/bin/uvicorn" ]]; then
  echo "Backend venv missing. Run: python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt"
  exit 1
fi

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Frontend deps missing. Run: cd frontend && npm install"
  exit 1
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://127.0.0.1:8000 ..."
(
  cd "$ROOT/backend"
  CORS_ORIGINS="$CORS_ORIGINS" "$BACKEND_VENV/bin/uvicorn" app.main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

echo "Starting frontend on http://127.0.0.1:5173 ..."
(
  cd "$ROOT/frontend"
  VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run dev -- --host 127.0.0.1 --port 5173
) &
FRONTEND_PID=$!

echo "Backend PID=$BACKEND_PID  Frontend PID=$FRONTEND_PID"
echo "Health: $VITE_API_BASE_URL/api/v1/health"
wait

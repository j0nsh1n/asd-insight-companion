#!/usr/bin/env bash
# Start backend + frontend for local Phase 0 development.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load nvm when present (Node was installed via nvm on this machine).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://127.0.0.1:8000}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node or load nvm: export NVM_DIR=\"\$HOME/.nvm\"; . \"\$NVM_DIR/nvm.sh\""
  exit 1
fi

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

# Wait for backend health before starting UI (fail closed with clear error).
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:8000/api/v1/health" >/dev/null; then
    break
  fi
  sleep 0.15
done
if ! curl -sf "http://127.0.0.1:8000/api/v1/health" >/dev/null; then
  echo "Backend did not become ready on http://127.0.0.1:8000/api/v1/health"
  echo "Tip: run from repo with: ./scripts/run-backend.sh"
  echo "     (must use backend/.venv and cwd backend/ so 'app' imports)"
  exit 1
fi
echo "Backend health: ok"

echo "Starting frontend on http://127.0.0.1:5173 ..."
(
  cd "$ROOT/frontend"
  VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run dev
) &
FRONTEND_PID=$!

# Wait until frontend answers (or fail with a clear message).
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:5173/"; then
    break
  fi
  sleep 0.2
done

if ! curl -sf -o /dev/null "http://127.0.0.1:5173/"; then
  echo "Frontend did not become ready on http://127.0.0.1:5173"
  echo "Backend is still up at PID=$BACKEND_PID until this script exits."
  exit 1
fi

echo ""
echo "Open the UI:     http://127.0.0.1:5173"
echo "API health:      http://127.0.0.1:8000/api/v1/health"
echo "API sessions:    POST http://127.0.0.1:8000/api/v1/sessions"
echo "API root only:   http://127.0.0.1:8000/  (JSON, not the product UI)"
echo "Backend PID=$BACKEND_PID  Frontend PID=$FRONTEND_PID"
wait

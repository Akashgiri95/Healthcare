#!/usr/bin/env bash
# LOINC Predictor — start backend + frontend and open browser
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")" && pwd)"
VENV="$PROJECT/venv"
BACKEND_PORT=8001
FRONTEND_PORT=5500

if [ ! -f "$VENV/bin/activate" ]; then
  echo "ERROR: venv not found. Run: python3 -m venv venv && pip install -r requirements.txt"
  exit 1
fi

source "$VENV/bin/activate"

echo "Starting LOINC backend on port $BACKEND_PORT..."
cd "$PROJECT/backend"
uvicorn api:app --host 127.0.0.1 --port $BACKEND_PORT &
BACKEND_PID=$!

echo "Starting frontend server on port $FRONTEND_PORT..."
cd "$PROJECT/frontend/public"
python3 -m http.server $FRONTEND_PORT --bind 127.0.0.1 &
FRONTEND_PID=$!

echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
  curl -s "http://127.0.0.1:$BACKEND_PORT/health" > /dev/null 2>&1 && break
  sleep 1
done

echo ""
echo "  LOINC Predictor is running"
echo "  Frontend : http://127.0.0.1:$FRONTEND_PORT/index.html"
echo "  Backend  : http://127.0.0.1:$BACKEND_PORT"
echo "  API docs : http://127.0.0.1:$BACKEND_PORT/docs"
echo ""
echo "Press Ctrl+C to stop."

open "http://127.0.0.1:$FRONTEND_PORT/index.html" 2>/dev/null || true

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait

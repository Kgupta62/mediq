#!/usr/bin/env sh
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

[ -d "$ROOT/server/node_modules" ] || (cd "$ROOT/server" && npm install)
[ -d "$ROOT/client/node_modules" ] || (cd "$ROOT/client" && npm install)

(cd "$ROOT/server" && node src/server.js) &
BACKEND=$!
(cd "$ROOT/client" && npm run dev) &
FRONTEND=$!

trap 'kill $BACKEND $FRONTEND 2>/dev/null' INT TERM EXIT

echo "MediQ running: frontend http://localhost:5173, backend http://localhost:5000 (Ctrl+C to stop)"
wait

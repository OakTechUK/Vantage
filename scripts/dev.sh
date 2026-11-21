#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cleanup() {
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Vantage API on http://localhost:5189 ..."
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/Vantage.Api --urls http://localhost:5189 &
API_PID=$!

echo "Starting Vantage web on http://localhost:3000 ..."
(cd web && pnpm dev) &
WEB_PID=$!

wait

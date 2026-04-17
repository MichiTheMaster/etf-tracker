#!/usr/bin/env bash
set -euo pipefail

REPO=${1:-/opt/apps/etf-tracker}
HEALTH_URL=${HEALTH_URL:-http://localhost:8081/actuator/health}
TIMEOUT=${TIMEOUT:-120}

cd "$REPO"

# Ensure git safe.directory or ownership
if [ -d .git ]; then
  OWNER_UID=$(stat -c '%u' "$REPO")
  CURRENT_UID=$(id -u)
  if [ "$OWNER_UID" -ne "$CURRENT_UID" ]; then
    echo "Warning: repo owner uid=$OWNER_UID running uid=$CURRENT_UID"
    if command -v sudo >/dev/null 2>&1; then
      echo "Attempting to fix ownership with sudo..."
      sudo chown -R "$(id -u -n):$(id -g -n)" "$REPO" || true
    fi
    git config --global --add safe.directory "$REPO" || true
  fi
fi

# Build step: try compose build with plain progress, fallback to manual image builds if it fails
echo "Attempting docker compose build (plain progress)"
if docker compose build --progress=plain; then
  echo "Compose build succeeded"
else
  echo "Compose build failed — attempting manual image builds as fallback"
  # Try backend build
  if [ -f backend/Dockerfile ]; then
    echo "Building backend image..."
    docker build -f backend/Dockerfile -t etf-tracker-backend backend || echo "Backend build failed"
  fi
  # Try frontend build (common locations)
  if [ -f etf-frontend/Dockerfile ]; then
    echo "Building frontend image (etf-frontend)..."
    docker build -f etf-frontend/Dockerfile -t etf-tracker-frontend etf-frontend || echo "Frontend build failed"
  elif [ -f frontend/Dockerfile ]; then
    echo "Building frontend image (frontend)..."
    docker build -f frontend/Dockerfile -t etf-tracker-frontend frontend || echo "Frontend build failed"
  fi
  # Start compose without building
  echo "Bringing up compose without build"
  docker compose up -d --no-build
fi

# Start services
docker compose up -d

# Optional health-check loop
if command -v curl >/dev/null 2>&1; then
  echo "Waiting for health endpoint: $HEALTH_URL"
  end=$((SECONDS + TIMEOUT))
  until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
    if [ $SECONDS -ge $end ]; then
      echo "Health check timed out after $TIMEOUT seconds" >&2
      exit 2
    fi
    sleep 2
  done
  echo "Health check passed"
fi

echo "Deploy completed"

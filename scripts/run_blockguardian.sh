#!/bin/bash

# BlockGuardian Run Script
# This script starts the backend, blockchain, and frontend components.
# It can be run from anywhere - the project root is resolved from this
# script's own location, not the caller's current working directory.

# --- Configuration and Setup ---
set -euo pipefail # Exit on error, unset variable, and pipe failure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting BlockGuardian application...${NC}"

# PIDs of the background services we start below. These are only ever set in
# this top-level scope (never inside a `(...)` subshell) so that cleanup()
# and the final `wait` can actually see and act on them.
BACKEND_PID=""
BLOCKCHAIN_PID=""
FRONTEND_PID=""

# Function to check if a process is running and kill it
cleanup() {
  echo -e "\n${BLUE}Stopping services...${NC}"
  # Check if PIDs are set and kill them
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "${BLOCKCHAIN_PID:-}" ]; then
    kill "$BLOCKCHAIN_PID" 2>/dev/null || true
  fi
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}All services stopped${NC}"
  exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGINT SIGTERM

# --- Start Backend Server ---
echo -e "${BLUE}Starting backend server...${NC}"
BACKEND_DIR="$ROOT_DIR/code/backend"
if [ -d "$BACKEND_DIR" ]; then
  # Use the backend's own virtual environment (matching setup_blockguardian_env.sh
  # and code/backend/run.sh), creating it if it doesn't exist yet.
  if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${BLUE}Creating Python virtual environment for backend...${NC}"
    python3 -m venv "$BACKEND_DIR/venv"
  fi

  # The ENTIRE subshell is backgrounded as one job here (rather than
  # backgrounding a command *inside* the subshell), which is what allows
  # `$!` below to capture a PID that's still valid in this outer scope.
  # Backgrounding inside the subshell instead would background a process
  # that only the (already-finished) subshell ever knew the PID of, leaving
  # cleanup() and `wait` below with nothing to act on.
  (
    cd "$BACKEND_DIR"
    # shellcheck disable=SC1091
    source venv/bin/activate
    pip install -r requirements.txt > /dev/null
    # Points the backend's BlockchainService at the node started below.
    # Harmless if contracts aren't deployed yet when the backend boots -
    # BlockchainService retries the (cheap, local) deployment-file read on
    # each request rather than caching "not found" forever.
    export BLOCKCHAIN_RPC_URL="http://localhost:8545"
    export BLOCKCHAIN_NETWORK="localhost"
    export BLOCKCHAIN_DEPLOYMENTS_DIR="$ROOT_DIR/code/blockchain/deployments"
    exec python src/main.py
  ) &
  BACKEND_PID=$!
  echo -e "${GREEN}Backend started with PID: ${BACKEND_PID}${NC}"
else
  echo -e "${RED}Warning: Backend directory not found at $BACKEND_DIR. Skipping backend start.${NC}"
fi

# --- Start Blockchain Node ---
echo -e "${BLUE}Starting blockchain node...${NC}"
BLOCKCHAIN_DIR="$ROOT_DIR/code/blockchain"
if [ -d "$BLOCKCHAIN_DIR" ]; then
  (
    cd "$BLOCKCHAIN_DIR"
    npm install > /dev/null
    exec npm run node
  ) &
  BLOCKCHAIN_PID=$!
  echo -e "${GREEN}Blockchain node started with PID: ${BLOCKCHAIN_PID}${NC}"
else
  echo -e "${RED}Warning: Blockchain directory not found at $BLOCKCHAIN_DIR. Skipping blockchain start.${NC}"
fi

# --- Wait for services to initialize ---
echo -e "${BLUE}Waiting for services to initialize (8 seconds)...${NC}"
sleep 8

# --- Deploy contracts to the local blockchain node ---
# Runs synchronously (not backgrounded) so it finishes before the frontend
# starts. If this fails (e.g. the node needed a little longer to come up),
# it's not fatal - BlockchainService retries loading deployment artifacts
# on each request, so redeploying later (`cd code/blockchain && npm run
# deploy:local`) is all that's needed to pick it up.
if [ -d "$BLOCKCHAIN_DIR" ]; then
  echo -e "${BLUE}Deploying smart contracts to the local blockchain node...${NC}"
  (cd "$BLOCKCHAIN_DIR" && npm run deploy:local) || \
    echo -e "${RED}Warning: contract deployment failed. The blockchain node is still running; retry with 'cd code/blockchain && npm run deploy:local'.${NC}"
fi

# --- Start Web Frontend ---
echo -e "${BLUE}Starting web frontend...${NC}"
FRONTEND_DIR="$ROOT_DIR/web-frontend"
if [ -d "$FRONTEND_DIR" ]; then
  (
    cd "$FRONTEND_DIR"
    npm install > /dev/null
    exec npm run dev # 'dev' is the standard development start script for Next.js
  ) &
  FRONTEND_PID=$!
  echo -e "${GREEN}Web Frontend started with PID: ${FRONTEND_PID}${NC}"
else
  echo -e "${RED}Warning: Web Frontend directory not found at $FRONTEND_DIR. Skipping frontend start.${NC}"
fi

# --- Final Status ---
echo -e "${GREEN}BlockGuardian application is attempting to run!${NC}"
echo -e "${GREEN}Web frontend: http://localhost:3000${NC}"
echo -e "${GREEN}Backend API:  http://localhost:5000${NC}"
echo -e "${GREEN}Blockchain node (JSON-RPC): http://localhost:8545${NC}"
echo -e "${GREEN}Blockchain explorer API:    http://localhost:5000/api/blockchain/explorer${NC}"
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Keep the script running until interrupted. Because each service above was
# backgrounded directly in this shell (not inside a now-finished subshell),
# their jobs are actually tracked here, so `wait` correctly blocks until they
# exit or this script receives SIGINT/SIGTERM (handled by cleanup() above).
wait

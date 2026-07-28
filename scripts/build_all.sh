#!/bin/bash

# Build All Script for BlockGuardian
# This script automates the build process for all BlockGuardian components.

# --- Configuration and Setup ---
set -euo pipefail # Exit on error, unset variable, and pipe failure

# Set colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to build a specific component
build_component() {
  local component_name="$1"
  local component_dir="$2"
  local build_command="$3"

  echo -e "${BLUE}Building ${component_name}...${NC}"

  if [ ! -d "$component_dir" ]; then
    echo -e "${YELLOW}Warning: Component directory not found: $component_dir. Skipping build for ${component_name}.${NC}"
    return 0
  fi

  # Use a subshell for localized directory and environment changes
  (
    set +e # Allow build command to fail without exiting the subshell
    cd "$component_dir"

    # Execute the build command
    echo "Executing: $build_command"
    eval "$build_command"
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
      echo -e "${GREEN}✓ ${component_name} build successful.${NC}"
      return 0
    else
      echo -e "${RED}✗ ${component_name} build failed with exit code $exit_code.${NC}"
      return 1
    fi
  )
}

# -----------------------------------------------------------------------------
# Main Build Function
# -----------------------------------------------------------------------------
main() {
  echo -e "${BLUE}========== BlockGuardian Build All ==========${NC}"

  local failed_builds=0

  # 1. Backend Build (Python)
  # Assumes venv is already set up (e.g., by setup_blockguardian_env.sh)
  # For Python, "build" usually means installing dependencies and potentially collecting static files.
  if ! build_component "Backend" "${PROJECT_ROOT}/code/backend" "source venv/bin/activate && pip install -r requirements.txt && deactivate"; then
    failed_builds=$((failed_builds + 1))
  fi

  # 2. Blockchain Build (Hardhat/Solidity)
  if command_exists npx; then
    if ! build_component "Blockchain Contracts" "${PROJECT_ROOT}/code/blockchain" "npm install && npx hardhat compile"; then
      failed_builds=$((failed_builds + 1))
    fi
  else
    echo -e "${YELLOW}Warning: npx not found. Skipping Blockchain Contracts build.${NC}"
  fi

  # 3. Web Frontend Build (Next.js/React)
  if command_exists npm; then
    if ! build_component "Web Frontend" "${PROJECT_ROOT}/web-frontend" "npm install && npm run build"; then
      failed_builds=$((failed_builds + 1))
    fi
  else
    echo -e "${YELLOW}Warning: npm not found. Skipping Web Frontend build.${NC}"
  fi

  # 4. Mobile Frontend Build (Expo/React Native)
  # Uses npm (the project ships package-lock.json, not yarn.lock). Expo apps
  # don't define a generic "build" script, so export a static web bundle
  # directly via the Expo CLI instead of assuming `npm run build` exists.
  if command_exists npm; then
    if ! build_component "Mobile Frontend" "${PROJECT_ROOT}/mobile-frontend" "npm install && npx expo export --platform web --output-dir dist"; then
      failed_builds=$((failed_builds + 1))
    fi
  else
    echo -e "${YELLOW}Warning: npm not found. Skipping Mobile Frontend build.${NC}"
  fi

  # -----------------------------------------------------------------------------
  # Final Status
  # -----------------------------------------------------------------------------
  echo -e "${BLUE}========== Build All Summary ==========${NC}"
  if [ "$failed_builds" -eq 0 ]; then
    echo -e "${GREEN}All BlockGuardian components built successfully!${NC}"
    return 0
  else
    echo -e "${RED}Build failed for $failed_builds component(s). Please check the logs above.${NC}"
    return 1
  fi
}

# Execute main function
main
exit_code=$?

# Return the exit code
exit $exit_code

#!/bin/bash

# Clean All Script for BlockGuardian
# This script automates the cleanup of build artifacts, dependencies, and temporary files
# across all components of the BlockGuardian project.

# --- Configuration and Setup ---
set -euo pipefail # Exit on error, unset variable, and pipe failure

# Set colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

# Function to clean a specific component
clean_component() {
  local component_name="$1"
  local component_dir="$2"
  local clean_targets="$3"

  echo -e "${BLUE}Cleaning ${component_name}...${NC}"

  if [ ! -d "$component_dir" ]; then
    echo -e "${BLUE}Directory not found: $component_dir. Skipping clean for ${component_name}.${NC}"
    return 0
  fi

  # Use a subshell for localized directory changes
  (
    cd "$component_dir"
    echo "Removing targets: $clean_targets"
    # Use find to safely delete files/directories
    find . -maxdepth 1 -type d -name "venv" -exec rm -rf {} + || true
    find . -maxdepth 1 -type d -name "node_modules" -exec rm -rf {} + || true
    find . -maxdepth 1 -type d -name "build" -exec rm -rf {} + || true
    find . -maxdepth 1 -type d -name ".next" -exec rm -rf {} + || true
    find . -maxdepth 1 -type d -name "dist" -exec rm -rf {} + || true
    find . -maxdepth 1 -type d -name "coverage" -exec rm -rf {} + || true
    find . -maxdepth 1 -type d -name "artifacts" -exec rm -rf {} + || true
    find . -maxdepth 1 -type d -name "cache" -exec rm -rf {} + || true
    find . -maxdepth 1 -type f -name "*.log" -exec rm -f {} + || true
    find . -maxdepth 1 -type f -name "*.pyc" -exec rm -f {} + || true
    find . -maxdepth 1 -type d -name "__pycache__" -exec rm -rf {} + || true

    # Execute custom clean targets if provided
    if [ -n "$clean_targets" ]; then
      echo "Executing custom clean command: $clean_targets"
      eval "$clean_targets" || true
    fi

    echo -e "${GREEN}✓ ${component_name} clean successful.${NC}"
  )
}

# -----------------------------------------------------------------------------
# Main Clean Function
# -----------------------------------------------------------------------------
main() {
  echo -e "${BLUE}========== BlockGuardian Clean All ==========${NC}"

  # 1. Backend Clean
  clean_component "Backend" "${PROJECT_ROOT}/code/backend" ""

  # 2. Blockchain Clean
  clean_component "Blockchain" "${PROJECT_ROOT}/code/blockchain" "rm -rf cache artifacts"

  # 3. Web Frontend Clean
  clean_component "Web Frontend" "${PROJECT_ROOT}/web-frontend" "rm -rf out"

  # 4. Mobile Frontend Clean
  clean_component "Mobile Frontend" "${PROJECT_ROOT}/mobile-frontend" "rm -rf web-build"

  # 5. Root-level Clean (logs, test results, global venv/node_modules)
  echo -e "${BLUE}Cleaning root-level artifacts...${NC}"
  rm -rf "${PROJECT_ROOT}/venv" || true
  rm -rf "${PROJECT_ROOT}/node_modules" || true
  rm -rf "${PROJECT_ROOT}/logs" || true
  rm -rf "${PROJECT_ROOT}/test-results" || true
  rm -rf "${PROJECT_ROOT}/deployment-logs" || true
  rm -rf "${PROJECT_ROOT}/health-checks" || true
  rm -rf "${PROJECT_ROOT}/.lint-venv" || true
  echo -e "${GREEN}✓ Root-level clean successful.${NC}"

  # -----------------------------------------------------------------------------
  # Final Status
  # -----------------------------------------------------------------------------
  echo -e "${BLUE}========== Clean All Summary ==========${NC}"
  echo -e "${GREEN}All BlockGuardian components and artifacts cleaned successfully!${NC}"
}

# Execute main function
main
exit_code=$?

# Return the exit code
exit $exit_code

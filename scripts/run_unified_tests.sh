#!/bin/bash

# Unified Testing Script for BlockGuardian
# This script automates the testing process across all components of the BlockGuardian project
# It runs unit tests, integration tests, and generates a consolidated test report

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

# Test results directory
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results"
mkdir -p "$TEST_RESULTS_DIR"

# Log file and summary file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${TEST_RESULTS_DIR}/test_run_${TIMESTAMP}.log"
SUMMARY_FILE="${TEST_RESULTS_DIR}/test_summary_${TIMESTAMP}.md"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to log messages
log_message() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp
  timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to run tests for a specific component
run_component_tests() {
  local component="$1"
  local component_dir="$2"
  local test_command="$3"
  local test_output_log="${TEST_RESULTS_DIR}/${component}_test_output.log"

  log_message "Running tests for ${component} in ${component_dir}..." "INFO"

  if [ ! -d "$component_dir" ]; then
    log_message "Component directory not found: $component_dir" "ERROR"
    echo "| $component | ⚠️ Skipped | Directory not found |" >> "$SUMMARY_FILE"
    return 2
  fi

  # Use a subshell for localized directory and environment changes
  (
    set +e # Allow test command to fail without exiting the subshell
    cd "$component_dir"

    # Execute the test command
    log_message "Executing: $test_command" "DEBUG"
    eval "$test_command" > "$test_output_log" 2>&1
    local exit_code=$?

    # Return the exit code of the test command
    return $exit_code
  )

  local test_status=$?
  if [ $test_status -eq 0 ]; then
    log_message "Tests for ${component} completed successfully" "SUCCESS"
    echo "| $component | ✅ Passed | [View Logs](${test_output_log}) |" >> "$SUMMARY_FILE"
    return 0
  elif [ $test_status -eq 2 ]; then
    log_message "Tests for ${component} skipped due to missing directory" "WARNING"
    return 2
  else
    log_message "Tests for ${component} failed with exit code $test_status" "ERROR"
    echo "| $component | ❌ Failed | [View Logs](${test_output_log}) |" >> "$SUMMARY_FILE"
    return 1
  fi
}

# Main function to run all tests
run_all_tests() {
  log_message "Starting unified test run for BlockGuardian" "INFO"
  echo -e "${BLUE}========== BlockGuardian Unified Testing ==========${NC}"

  # Initialize counters
  local passed=0
  local failed=0
  local skipped=0
  local status

  # Create test summary header
  echo "# BlockGuardian Test Summary" > "$SUMMARY_FILE"
  echo "Generated on: $(date)" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "## Test Results" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "| Component | Status | Details |" >> "$SUMMARY_FILE"
  echo "|-----------|--------|---------|" >> "$SUMMARY_FILE"

  # Define components and their test commands
  local components=(
    "Backend:${PROJECT_ROOT}/code/backend:source venv/bin/activate && python -m pytest tests/ --junitxml=${TEST_RESULTS_DIR}/backend_test_results.xml"
    "Blockchain:${PROJECT_ROOT}/code/blockchain:npx hardhat test"
    "Web-Frontend:${PROJECT_ROOT}/web-frontend:npx jest --ci"
    "Mobile-Frontend:${PROJECT_ROOT}/mobile-frontend:npx jest --ci"
  )

  for component_info in "${components[@]}"; do
    IFS=':' read -r component_name component_dir test_command <<< "$component_info"

    echo -e "${BLUE}Running ${component_name} tests...${NC}"
    # run_component_tests legitimately returns 1 (failed) or 2 (skipped) -
    # as a bare statement under `set -e` that would silently kill this whole
    # script on the very first component that doesn't pass, before the
    # summary/statistics below are ever produced.
    status=0
    run_component_tests "$component_name" "$component_dir" "$test_command" || status=$?

    # NOTE: `var=$((var + 1))` rather than `((var++))`. Under `set -e`, the
    # post-increment form evaluates to the *pre*-increment value, so
    # incrementing from 0 is arithmetic 0 (shell "false") and kills the
    # whole script right there the first time any counter is bumped from 0.
    case $status in
      0) passed=$((passed + 1)) ;;
      1) failed=$((failed + 1)) ;;
      2) skipped=$((skipped + 1)) ;;
    esac
  done

  # Add summary statistics
  echo "" >> "$SUMMARY_FILE"
  echo "## Summary Statistics" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "- **Passed:** $passed" >> "$SUMMARY_FILE"
  echo "- **Failed:** $failed" >> "$SUMMARY_FILE"
  echo "- **Skipped:** $skipped" >> "$SUMMARY_FILE"
  echo "- **Total:** $((passed + failed + skipped))" >> "$SUMMARY_FILE"

  # Print summary to console
  echo -e "${BLUE}========== Test Summary ==========${NC}"
  echo -e "${GREEN}Passed: $passed${NC}"
  echo -e "${RED}Failed: $failed${NC}"
  echo -e "${YELLOW}Skipped: $skipped${NC}"
  echo -e "${BLUE}Total: $((passed + failed + skipped))${NC}"

  log_message "Test run completed. Results saved to $SUMMARY_FILE" "INFO"

  # Return non-zero exit code if any tests failed
  if [ $failed -gt 0 ]; then
    return 1
  else
    return 0
  fi
}

# --- Script Execution ---
run_all_tests
exit_code=$?

# Return the exit code
exit $exit_code

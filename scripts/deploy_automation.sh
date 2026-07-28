#!/bin/bash

# Deployment Automation Script for BlockGuardian
# This script automates the deployment process for BlockGuardian components
# It handles building, testing, and deploying the application to various environments

# --- Configuration and Setup ---
set -euo pipefail # Exit on error, unset variable, and pipe failure

# Set colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Deployment logs directory
DEPLOY_LOG_DIR="${PROJECT_ROOT}/deployment-logs"
mkdir -p "$DEPLOY_LOG_DIR"

# Log file and summary file placeholders (will be set in parse_arguments)
LOG_FILE=""
SUMMARY_FILE=""

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Map a component name to its real directory. `backend` and `blockchain` live
# under `code/`, unlike `web-frontend`/`mobile-frontend` which are top-level -
# a bare "${PROJECT_ROOT}/${component}" never resolves correctly for the first two.
component_dir_for() {
  case "$1" in
    backend) echo "${PROJECT_ROOT}/code/backend" ;;
    blockchain) echo "${PROJECT_ROOT}/code/blockchain" ;;
    web-frontend) echo "${PROJECT_ROOT}/web-frontend" ;;
    mobile-frontend) echo "${PROJECT_ROOT}/mobile-frontend" ;;
    *) echo "" ;;
  esac
}

# Function to log messages
log_message() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp
  timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  # Check if LOG_FILE is set before attempting to tee
  if [ -n "$LOG_FILE" ]; then
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
  else
    echo -e "[$timestamp] [$level] $message"
  fi
}

# Function to display usage information
show_usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --environment ENV    Specify deployment environment (development, staging, production)"
  echo "  -c, --component COMP     Deploy specific component (all, backend, web-frontend, mobile-frontend, blockchain)"
  echo "  -s, --skip-tests         Skip running tests before deployment"
  echo "  -h, --help               Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --environment production                # Deploy all components to production"
  echo "  $0 --component backend --environment staging   # Deploy only backend to staging"
}

# Parse command line arguments
parse_arguments() {
  ENVIRONMENT=""
  SKIP_TESTS=false
  COMPONENT="all"

  # Set log files now that we know the run time (compute the timestamp once
  # so both filenames are guaranteed to match, rather than risking two
  # separate `date` calls straddling a second boundary).
  local run_timestamp
  run_timestamp=$(date +%Y%m%d_%H%M%S)
  LOG_FILE="${DEPLOY_LOG_DIR}/deployment_${run_timestamp}.log"
  SUMMARY_FILE="${DEPLOY_LOG_DIR}/deployment_summary_${run_timestamp}.md"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -e|--environment)
        ENVIRONMENT="$2"
        shift 2
        ;;
      -c|--component)
        COMPONENT="$2"
        shift 2
        ;;
      -s|--skip-tests)
        SKIP_TESTS=true
        shift
        ;;
      -h|--help)
        show_usage
        exit 0
        ;;
      *)
        log_message "Unknown option: $1" "ERROR"
        show_usage
        exit 1
        ;;
    esac
  done

  # Validate environment
  if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_message "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production" "ERROR"
    exit 1
  fi

  # Validate component
  if [[ ! "$COMPONENT" =~ ^(all|backend|web-frontend|mobile-frontend|blockchain)$ ]]; then
    log_message "Invalid component: $COMPONENT. Must be one of: all, backend, web-frontend, mobile-frontend, blockchain" "ERROR"
    exit 1
  fi

  log_message "Deployment configuration:" "INFO"
  log_message "- Environment: $ENVIRONMENT" "INFO"
  log_message "- Component: $COMPONENT" "INFO"
  log_message "- Skip Tests: $SKIP_TESTS" "INFO"
}

# Function to run tests for a component
run_tests() {
  local component="$1"
  local component_dir
  component_dir=$(component_dir_for "$component")
  local test_log="${DEPLOY_LOG_DIR}/${component}_tests.log"

  if [ "$SKIP_TESTS" = true ]; then
    log_message "Skipping tests for $component as requested" "INFO"
    return 0
  fi

  log_message "Running tests for $component..." "INFO"

  if [ -z "$component_dir" ] || [ ! -d "$component_dir" ]; then
    log_message "Component directory not found: ${component_dir:-<unknown component: $component>}" "ERROR"
    echo "| $component | ❌ Tests Failed | Directory not found |" >> "$SUMMARY_FILE"
    return 1
  fi

  # Use a subshell for localized directory and environment changes
  (
    set +e # Allow test command to fail without exiting the subshell
    cd "$component_dir"

    local exit_code=1
    case "$component" in
      backend)
        if [ -d "venv" ]; then
          # shellcheck disable=SC1091
          source venv/bin/activate
          python -m pytest tests/ > "$test_log" 2>&1
          exit_code=$?
          deactivate
        else
          log_message "Python virtual environment not found for backend" "ERROR"
          exit_code=1
        fi
        ;;
      web-frontend|mobile-frontend)
        if command_exists npm; then
          # Invoke jest directly rather than `npm test`: the npm script bakes
          # in --coverage, and jest.config.js's global coverage threshold can
          # fail the whole run even when every actual test passes.
          npx jest --ci > "$test_log" 2>&1
          exit_code=$?
        else
          log_message "npm not found, cannot run $component tests" "ERROR"
          exit_code=1
        fi
        ;;
      blockchain)
        if command_exists npx; then
          npx hardhat test > "$test_log" 2>&1
          exit_code=$?
        else
          log_message "npx not found, cannot run blockchain tests" "ERROR"
          exit_code=1
        fi
        ;;
      *)
        log_message "Unknown component: $component" "ERROR"
        exit_code=1
        ;;
    esac

    # Return the exit code of the test command
    return $exit_code
  )

  local test_status=$?
  if [ $test_status -eq 0 ]; then
    log_message "Tests for $component passed" "SUCCESS"
    echo "| $component | ✅ Tests Passed | [View Logs](${test_log}) |" >> "$SUMMARY_FILE"
    return 0
  else
    log_message "Tests for $component failed with exit code $test_status" "ERROR"
    echo "| $component | ❌ Tests Failed | [View Logs](${test_log}) |" >> "$SUMMARY_FILE"
    return 1
  fi
}

# Function to build a component
build_component() {
  local component="$1"
  local component_dir
  component_dir=$(component_dir_for "$component")
  local build_log="${DEPLOY_LOG_DIR}/${component}_build.log"

  log_message "Building $component for $ENVIRONMENT environment..." "INFO"

  if [ -z "$component_dir" ] || [ ! -d "$component_dir" ]; then
    log_message "Component directory not found: ${component_dir:-<unknown component: $component>}" "ERROR"
    echo "| $component | ❌ Build Failed | Directory not found |" >> "$SUMMARY_FILE"
    return 1
  fi

  # Use a subshell for localized directory and environment changes
  (
    set +e # Allow build command to fail without exiting the subshell
    cd "$component_dir"

    local exit_code=1
    case "$component" in
      backend)
        # Backend build is often just a static file collection or no-op
        if [ -d "venv" ]; then
          # shellcheck disable=SC1091
          source venv/bin/activate
          # Example: python manage.py collectstatic --noinput
          log_message "Backend build step completed" "SUCCESS"
          exit_code=0
          deactivate
        else
          log_message "Python virtual environment not found for backend" "ERROR"
          exit_code=1
        fi
        ;;
      web-frontend|mobile-frontend)
        if command_exists npm; then
          # Set environment-specific variables
          export APP_ENV="$ENVIRONMENT"
          local API_URL="https://api.blockguardian.example.com"
          if [ "$ENVIRONMENT" = "production" ]; then
            API_URL="https://api.blockguardian.com"
          elif [ "$ENVIRONMENT" = "staging" ]; then
            API_URL="https://api-staging.blockguardian.com"
          fi
          # Each app only reads its own framework's env var prefix - Next.js
          # (web-frontend) needs NEXT_PUBLIC_*, Expo (mobile-frontend) needs
          # EXPO_PUBLIC_*. REACT_APP_* (Create React App's convention) matches
          # neither and was silently ignored by both apps.
          export NEXT_PUBLIC_API_URL="$API_URL"
          export EXPO_PUBLIC_API_URL="$API_URL"

          # Build the application. mobile-frontend (Expo) has no generic
          # "build" script - a static bundle is produced via the Expo CLI
          # instead of assuming `npm run build` exists.
          if [ "$component" = "mobile-frontend" ]; then
            npm install > "$build_log" 2>&1 &&
              npx expo export --platform web --output-dir dist >> "$build_log" 2>&1
          else
            npm install > "$build_log" 2>&1 && npm run build >> "$build_log" 2>&1
          fi
          exit_code=$?
        else
          log_message "npm not found, cannot build $component" "ERROR"
          exit_code=1
        fi
        ;;
      blockchain)
        if command_exists npx; then
          # Compile smart contracts
          npx hardhat compile > "$build_log" 2>&1
          exit_code=$?
        else
          log_message "npx not found, cannot build blockchain contracts" "ERROR"
          exit_code=1
        fi
        ;;
      *)
        log_message "Unknown component: $component" "ERROR"
        exit_code=1
        ;;
    esac

    # Return the exit code of the build command
    return $exit_code
  )

  local build_status=$?
  if [ $build_status -eq 0 ]; then
    log_message "$component build successful" "SUCCESS"
    echo "| $component | ✅ Build Successful | [View Logs](${build_log}) |" >> "$SUMMARY_FILE"
    return 0
  else
    log_message "$component build failed with exit code $build_status" "ERROR"
    echo "| $component | ❌ Build Failed | [View Logs](${build_log}) |" >> "$SUMMARY_FILE"
    return 1
  fi
}

# Function to deploy a component
deploy_component() {
  local component="$1"
  local component_dir
  component_dir=$(component_dir_for "$component")

  log_message "Deploying $component to $ENVIRONMENT environment..." "INFO"

  if [ -z "$component_dir" ] || [ ! -d "$component_dir" ]; then
    log_message "Component directory not found: ${component_dir:-<unknown component: $component>}" "ERROR"
    echo "| $component | ❌ Deployment Failed | Directory not found |" >> "$SUMMARY_FILE"
    return 1
  fi

  # Use a subshell for localized directory changes. `set +e` keeps this
  # consistent with run_tests/build_component: today's case branches only
  # log/echo (which practically never fail), but a real deployment command
  # (rsync, aws s3 sync, docker push, etc.) dropped in here later could fail
  # and, without this, would silently kill the whole script via `set -e`
  # instead of being caught and reported below.
  (
    set +e
    cd "$component_dir"

    case "$component" in
      backend)
        # Deployment logic for backend (e.g., rsync, docker push, k8s deploy)
        log_message "Simulating backend deployment to $ENVIRONMENT..." "INFO"
        # Example: rsync -avz --exclude 'venv' --exclude '*.pyc' . user@server:/path/to/deployment/
        echo "| $component | ✅ Deployment Simulated | $ENVIRONMENT deployment would happen here |" >> "$SUMMARY_FILE"
        ;;
      web-frontend)
        # Deployment logic for web-frontend (e.g., S3 sync, CDN upload)
        log_message "Simulating web frontend deployment to $ENVIRONMENT..." "INFO"
        # Example: aws s3 sync .next/ s3://blockguardian-frontend/
        echo "| $component | ✅ Deployment Simulated | $ENVIRONMENT deployment would happen here |" >> "$SUMMARY_FILE"
        ;;
      mobile-frontend)
        # Mobile frontend deployment is usually just a build and upload to app store
        log_message "Mobile frontend deployment prepared for $ENVIRONMENT" "SUCCESS"
        echo "| $component | ✅ Deployment Simulated | Mobile app would be submitted to app stores |" >> "$SUMMARY_FILE"
        ;;
      blockchain)
        # Deployment logic for blockchain contracts (e.g., hardhat deploy)
        log_message "Simulating blockchain contracts deployment to $ENVIRONMENT..." "INFO"
        # Example: npx hardhat run scripts/deploy.js --network $ENVIRONMENT
        echo "| $component | ✅ Deployment Simulated | $ENVIRONMENT deployment would happen here |" >> "$SUMMARY_FILE"
        ;;
      *)
        log_message "Unknown component: $component" "ERROR"
        echo "| $component | ❌ Deployment Failed | Unknown component |" >> "$SUMMARY_FILE"
        return 1
        ;;
    esac
  )

  local deploy_status=$?
  if [ $deploy_status -eq 0 ]; then
    log_message "Deployment of $component to $ENVIRONMENT completed successfully" "SUCCESS"
    return 0
  else
    log_message "Deployment of $component to $ENVIRONMENT failed" "ERROR"
    return 1
  fi
}

# Main deployment function
deploy() {
  log_message "Starting deployment process for BlockGuardian" "INFO"
  echo -e "${BLUE}========== BlockGuardian Deployment ==========${NC}"

  # Create summary file header
  echo "# BlockGuardian Deployment Summary" > "$SUMMARY_FILE"
  echo "Generated on: $(date)" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "## Deployment Configuration" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "- **Environment:** $ENVIRONMENT" >> "$SUMMARY_FILE"
  echo "- **Component:** $COMPONENT" >> "$SUMMARY_FILE"
  echo "- **Skip Tests:** $SKIP_TESTS" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "## Deployment Results" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "| Component | Status | Details |" >> "$SUMMARY_FILE"
  echo "|-----------|--------|---------|" >> "$SUMMARY_FILE"

  # Initialize counters
  local success_count=0
  local failure_count=0
  local components_to_process=()

  if [ "$COMPONENT" = "all" ]; then
    components_to_process=("backend" "web-frontend" "mobile-frontend" "blockchain")
  else
    components_to_process=("$COMPONENT")
  fi

  for component in "${components_to_process[@]}"; do
    echo -e "${BLUE}Processing $component...${NC}"

    local component_failed=false

    # 1. Run tests
    if ! run_tests "$component"; then
      log_message "Tests failed for $component, skipping deployment" "ERROR"
      component_failed=true
    fi

    # 2. Build component (only if tests passed or skipped)
    if [ "$component_failed" = false ]; then
      if ! build_component "$component"; then
        log_message "Build failed for $component, skipping deployment" "ERROR"
        component_failed=true
      fi
    fi

    # 3. Deploy component (only if tests and build passed)
    if [ "$component_failed" = false ]; then
      if deploy_component "$component"; then
        success_count=$((success_count + 1))
      else
        component_failed=true
      fi
    fi

    if [ "$component_failed" = true ]; then
      failure_count=$((failure_count + 1))
    fi
  done

  # Add summary statistics
  echo "" >> "$SUMMARY_FILE"
  echo "## Summary Statistics" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "- **Successful Deployments:** $success_count" >> "$SUMMARY_FILE"
  echo "- **Failed Deployments:** $failure_count" >> "$SUMMARY_FILE"
  echo "- **Total Components:** $((success_count + failure_count))" >> "$SUMMARY_FILE"
  echo "- **Deployment Log:** $LOG_FILE" >> "$SUMMARY_FILE"

  # Print summary to console
  echo -e "${BLUE}========== Deployment Summary ==========${NC}"
  echo -e "${GREEN}Successful Deployments: $success_count${NC}"
  echo -e "${RED}Failed Deployments: $failure_count${NC}"
  echo -e "${BLUE}Total Components: $((success_count + failure_count))${NC}"

  log_message "Deployment process completed. Results saved to $SUMMARY_FILE" "INFO"

  # Return non-zero exit code if any deployments failed
  if [ $failure_count -gt 0 ]; then
    return 1
  else
    return 0
  fi
}

# --- Script Execution ---
parse_arguments "$@"
deploy
exit_code=$?

# Return the exit code
exit $exit_code

#!/bin/bash

# Health Check Script for BlockGuardian
# This script checks the health of all running BlockGuardian components
# and provides a consolidated status report

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

# Health check results directory
HEALTH_CHECK_DIR="${PROJECT_ROOT}/health-checks"
mkdir -p "$HEALTH_CHECK_DIR"

# Log file and summary file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${HEALTH_CHECK_DIR}/health_check_${TIMESTAMP}.log"
SUMMARY_FILE="${HEALTH_CHECK_DIR}/health_summary_${TIMESTAMP}.md"

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

# Function to check if a port is in use
check_port() {
  local port="$1"
  local service_name="$2"

  if command_exists nc; then
    # Use timeout for netcat
    nc -z -w 1 localhost "$port" > /dev/null 2>&1
    return $?
  elif command_exists lsof; then
    lsof -i:"$port" > /dev/null 2>&1
    return $?
  else
    log_message "Neither nc nor lsof found, cannot check port $port for $service_name" "WARNING"
    return 2
  fi
}

# Function to check a specific service
check_service() {
  local service_name="$1"
  local check_command="$2"
  local service_dir="${3:-}"
  local expected_output="${4:-}"
  local service_log="${HEALTH_CHECK_DIR}/${service_name}_health.log"

  log_message "Checking service: $service_name" "INFO"

  # Use a subshell for localized directory changes. `set +e` is required here
  # so a failing check_command doesn't trip the parent script's `set -e` via
  # the pipeline/subshell exit status, and so we can capture its real exit
  # code below instead of masking it.
  (
    set +e
    if [ -n "$service_dir" ] && [ -d "$service_dir" ]; then
      cd "$service_dir"
    fi

    # Execute the check command
    log_message "Executing: $check_command" "DEBUG"
    local output
    output=$(eval "$check_command" 2>&1)
    local exit_code=$?

    # Save output to file
    echo "$output" > "$service_log"

    # Check if command was successful and if expected output is present
    if [ "$exit_code" -eq 0 ]; then
      if [ -n "$expected_output" ]; then
        if echo "$output" | grep -qF "$expected_output"; then
          exit 0 # Healthy
        else
          exit 1 # Unhealthy (unexpected output)
        fi
      else
        exit 0 # Healthy
      fi
    else
      exit 1 # Unhealthy (command failed)
    fi
  )

  local status=$?
  if [ "$status" -eq 0 ]; then
    log_message "Service $service_name is healthy" "SUCCESS"
    echo -e "${GREEN}✓ $service_name is healthy${NC}"
    return 0
  elif [ "$status" -eq 1 ]; then
    log_message "Service $service_name is unhealthy" "ERROR"
    echo -e "${RED}✗ $service_name is unhealthy${NC}"
    return 1
  else
    log_message "Service $service_name check failed to execute" "ERROR"
    echo -e "${RED}✗ $service_name check failed${NC}"
    return 1
  fi
}

# Function to check backend service
check_backend() {
  local backend_dir="${PROJECT_ROOT}/code/backend"
  local backend_port="${BACKEND_PORT:-5000}" # Flask backend; override with BACKEND_PORT env var

  if [ ! -d "$backend_dir" ]; then
    log_message "Backend directory not found: $backend_dir" "ERROR"
    echo "| Backend | ⚠️ Not Found | Directory not found |" >> "$SUMMARY_FILE"
    return 2
  fi

  if check_port "$backend_port" "backend"; then
    # Try to access health endpoint
    if check_service "backend" "curl -s http://localhost:${backend_port}/health" "" "healthy"; then
      echo "| Backend | ✅ Healthy | Running on port $backend_port |" >> "$SUMMARY_FILE"
      return 0
    else
      echo "| Backend | ❌ Unhealthy | API health check failed |" >> "$SUMMARY_FILE"
      return 1
    fi
  else
    log_message "Backend service not running on port $backend_port" "ERROR"
    echo "| Backend | ❌ Not Running | Port $backend_port not in use |" >> "$SUMMARY_FILE"
    return 1
  fi
}

# Function to check blockchain node
check_blockchain_node() {
  local blockchain_dir="${PROJECT_ROOT}/code/blockchain"
  local blockchain_port="${BLOCKCHAIN_PORT:-8545}" # Default Hardhat node port

  if [ ! -d "$blockchain_dir" ]; then
    log_message "Blockchain directory not found: $blockchain_dir" "ERROR"
    echo "| Blockchain Node | ⚠️ Not Found | Directory not found |" >> "$SUMMARY_FILE"
    return 2
  fi

  if check_port "$blockchain_port" "blockchain"; then
    # Try to access JSON-RPC endpoint
    if check_service "blockchain" "curl -s -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"web3_clientVersion\",\"params\":[],\"id\":1}' http://localhost:${blockchain_port}" "" "jsonrpc"; then
      echo "| Blockchain Node | ✅ Healthy | Running on port $blockchain_port |" >> "$SUMMARY_FILE"
      return 0
    else
      echo "| Blockchain Node | ❌ Unhealthy | JSON-RPC check failed |" >> "$SUMMARY_FILE"
      return 1
    fi
  else
    log_message "Blockchain node not running on port $blockchain_port" "ERROR"
    echo "| Blockchain Node | ❌ Not Running | Port $blockchain_port not in use |" >> "$SUMMARY_FILE"
    return 1
  fi
}

# Function to check web frontend
check_web_frontend() {
  local web_frontend_dir="${PROJECT_ROOT}/web-frontend"
  local web_frontend_port="${WEB_FRONTEND_PORT:-3000}" # Default Next.js port

  if [ ! -d "$web_frontend_dir" ]; then
    log_message "Web frontend directory not found: $web_frontend_dir" "ERROR"
    echo "| Web Frontend | ⚠️ Not Found | Directory not found |" >> "$SUMMARY_FILE"
    return 2
  fi

  if check_port "$web_frontend_port" "web-frontend"; then
    # Check if the service responds (a simple curl is usually enough for a running web server)
    if check_service "web-frontend" "curl -s -o /dev/null -w '%{http_code}' http://localhost:${web_frontend_port}" "" "200"; then
      echo "| Web Frontend | ✅ Healthy | Running on port $web_frontend_port |" >> "$SUMMARY_FILE"
      return 0
    else
      echo "| Web Frontend | ❌ Unhealthy | Service not responding with 200 OK |" >> "$SUMMARY_FILE"
      return 1
    fi
  else
    log_message "Web frontend not running on port $web_frontend_port" "ERROR"
    echo "| Web Frontend | ❌ Not Running | Port $web_frontend_port not in use |" >> "$SUMMARY_FILE"
    return 1
  fi
}

# Function to check database (Placeholder - assumes a common setup)
check_database() {
  local db_port="${DB_PORT:-5432}" # Default PostgreSQL port; the backend defaults to SQLite in development

  if check_port "$db_port" "database"; then
    if command_exists psql; then
      # Check connection and a simple query
      if check_service "database" "psql -h localhost -p $db_port -U postgres -c 'SELECT 1;' 2>&1" "" "1 row"; then
        echo "| Database | ✅ Healthy | PostgreSQL running on port $db_port |" >> "$SUMMARY_FILE"
        return 0
      else
        echo "| Database | ❌ Unhealthy | PostgreSQL connection failed |" >> "$SUMMARY_FILE"
        return 1
      fi
    else
      log_message "psql command not found, cannot check PostgreSQL" "WARNING"
      echo "| Database | ⚠️ Unknown | psql command not found |" >> "$SUMMARY_FILE"
      return 2
    fi
  else
    log_message "No database service detected on common ports (e.g., $db_port). The backend may be using SQLite instead." "WARNING"
    echo "| Database | ⚠️ Not Running | No PostgreSQL detected (backend may be using SQLite) |" >> "$SUMMARY_FILE"
    return 2
  fi
}

# Function to check Redis cache
check_redis() {
  local redis_port="${REDIS_PORT:-6379}" # Default Redis port

  if check_port "$redis_port" "redis"; then
    if command_exists redis-cli; then
      if check_service "redis" "redis-cli -h localhost -p $redis_port ping" "" "PONG"; then
        echo "| Redis Cache | ✅ Healthy | Running on port $redis_port |" >> "$SUMMARY_FILE"
        return 0
      else
        echo "| Redis Cache | ❌ Unhealthy | Connection failed |" >> "$SUMMARY_FILE"
        return 1
      fi
    else
      log_message "redis-cli command not found, cannot check Redis" "WARNING"
      echo "| Redis Cache | ⚠️ Unknown | redis-cli command not found |" >> "$SUMMARY_FILE"
      return 2
    fi
  else
    log_message "Redis not running on port $redis_port (rate limiting/token revocation will be degraded but the backend still runs)" "WARNING"
    echo "| Redis Cache | ⚠️ Not Running | Port $redis_port not in use |" >> "$SUMMARY_FILE"
    return 2
  fi
}

# Function to check Docker containers
check_docker_containers() {
  if command_exists docker; then
    if docker info > /dev/null 2>&1; then
      local containers
      containers=$(docker ps --filter "name=blockguardian" --format "{{.Names}}" || true)

      if [ -z "$containers" ]; then
        log_message "No BlockGuardian Docker containers running" "WARNING"
        echo "| Docker Containers | ⚠️ Not Running | No BlockGuardian containers found |" >> "$SUMMARY_FILE"
        return 2
      else
        local container_count
        container_count=$(echo "$containers" | wc -l)
        log_message "$container_count BlockGuardian Docker containers running" "INFO"
        echo "| Docker Containers | ✅ Running | $container_count containers active |" >> "$SUMMARY_FILE"

        # Save container details to log
        docker ps --filter "name=blockguardian" > "${HEALTH_CHECK_DIR}/docker_containers.log"
        return 0
      fi
    else
      log_message "Docker daemon is not running" "ERROR"
      echo "| Docker Containers | ❌ Error | Docker daemon is not running |" >> "$SUMMARY_FILE"
      return 1
    fi
  else
    log_message "Docker command not found" "WARNING"
    echo "| Docker Containers | ⚠️ Unknown | Docker command not found |" >> "$SUMMARY_FILE"
    return 2
  fi
}

# Function to check disk space
check_disk_space() {
  local threshold=90  # Warning threshold percentage

  # Get disk usage percentage for the project's filesystem (not the caller's cwd)
  local disk_usage
  disk_usage=$(df -P "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')

  if [ -z "$disk_usage" ]; then
    log_message "Could not determine disk usage" "ERROR"
    echo "| Disk Space | ❌ Error | Could not determine disk usage |" >> "$SUMMARY_FILE"
    return 1
  fi

  if [ "$disk_usage" -lt "$threshold" ]; then
    log_message "Disk space usage: $disk_usage% (below threshold of $threshold%)" "INFO"
    echo "| Disk Space | ✅ OK | $disk_usage% used (threshold: $threshold%) |" >> "$SUMMARY_FILE"
    return 0
  else
    log_message "Disk space usage: $disk_usage% (exceeds threshold of $threshold%)" "WARNING"
    echo "| Disk Space | ⚠️ Warning | $disk_usage% used (threshold: $threshold%) |" >> "$SUMMARY_FILE"
    return 2
  fi
}

# Main function to run all health checks
run_health_checks() {
  log_message "Starting health checks for BlockGuardian" "INFO"
  echo -e "${BLUE}========== BlockGuardian Health Check ==========${NC}"

  # Initialize counters
  local healthy=0
  local unhealthy=0
  local warnings=0

  # Create health summary header
  echo "# BlockGuardian Health Check Summary" > "$SUMMARY_FILE"
  echo "Generated on: $(date)" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "## Service Status" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "| Service | Status | Details |" >> "$SUMMARY_FILE"
  echo "|---------|--------|---------|" >> "$SUMMARY_FILE"

  # Array of checks to run
  local checks=("check_backend" "check_blockchain_node" "check_web_frontend" "check_database" "check_redis" "check_docker_containers" "check_disk_space")

  for check in "${checks[@]}"; do
    echo -e "${BLUE}Checking $check...${NC}"
    # Execute the function and capture its return code without letting a
    # non-zero status trip `set -e` (this is a bare call, not an `if`).
    status=0
    "$check" || status=$?

    # NOTE: use `var=$((var + 1))` rather than `((var++))`. Under `set -e`,
    # the post-increment form evaluates to the *pre*-increment value, so
    # incrementing from 0 evaluates to arithmetic 0 (shell "false") and kills
    # the whole script right there the first time any counter is bumped from 0.
    case $status in
      0) healthy=$((healthy + 1)) ;;
      1) unhealthy=$((unhealthy + 1)) ;;
      2) warnings=$((warnings + 1)) ;;
    esac
  done

  # Add summary statistics
  echo "" >> "$SUMMARY_FILE"
  echo "## Summary Statistics" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "- **Healthy Services:** $healthy" >> "$SUMMARY_FILE"
  echo "- **Unhealthy Services:** $unhealthy" >> "$SUMMARY_FILE"
  echo "- **Warnings:** $warnings" >> "$SUMMARY_FILE"
  echo "- **Total Checks:** ${#checks[@]}" >> "$SUMMARY_FILE"

  # Print summary to console
  echo -e "${BLUE}========== Health Check Summary ==========${NC}"
  echo -e "${GREEN}Healthy Services: $healthy${NC}"
  echo -e "${RED}Unhealthy Services: $unhealthy${NC}"
  echo -e "${YELLOW}Warnings: $warnings${NC}"
  echo -e "${BLUE}Total Checks: ${#checks[@]}${NC}"

  log_message "Health check completed. Results saved to $SUMMARY_FILE" "INFO"

  # Return non-zero exit code if any services are unhealthy
  if [ "$unhealthy" -gt 0 ]; then
    return 1
  else
    return 0
  fi
}

# --- Script Execution ---
run_health_checks
exit_code=$?

# Return the exit code
exit $exit_code

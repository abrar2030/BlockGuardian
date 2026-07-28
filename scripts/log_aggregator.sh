#!/bin/bash

# Log Aggregation Script for BlockGuardian
# This script collects and aggregates logs from all BlockGuardian components
# into a centralized location for easier monitoring and troubleshooting

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

# Log aggregation directory
LOG_DIR="${PROJECT_ROOT}/logs"
AGGREGATED_LOG_DIR="${LOG_DIR}/aggregated"
mkdir -p "$AGGREGATED_LOG_DIR"

# Timestamp for this run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
AGGREGATED_LOG_FILE="${AGGREGATED_LOG_DIR}/blockguardian_logs_${TIMESTAMP}.log"
SUMMARY_FILE="${AGGREGATED_LOG_DIR}/log_summary_${TIMESTAMP}.md"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

# Function to log messages
log_message() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp
  timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "[$timestamp] [$level] $message" | tee -a "$AGGREGATED_LOG_FILE"
}

# Function to collect logs from a specific component
collect_component_logs() {
  local component="$1"
  local component_dir="$2"
  local log_pattern="$3"
  local max_age_days="${4:-7}"  # Default to 7 days

  log_message "Collecting logs for ${component} from ${component_dir}..." "INFO"

  if [ ! -d "$component_dir" ]; then
    log_message "Component directory not found: $component_dir" "WARNING"
    echo "| $component | 0 | 0B | Directory not found |" >> "$SUMMARY_FILE"
    return 1
  fi

  # Create component log directory
  local component_log_dir="${AGGREGATED_LOG_DIR}/${component}"
  mkdir -p "$component_log_dir"

  # Find log files matching the pattern, not older than max_age_days
  # Use find -print0 and xargs -0 for safe handling of filenames with spaces
  local log_files_count=0
  local total_size="0B"

  # Find log files and process them. Process substitution (`< <(...)`)
  # rather than piping into the while loop (`find ... | while ...`) is
  # required here: a piped while loop runs in a subshell, so log_files_count
  # would be lost the moment the loop ends instead of being visible below.
  while IFS= read -r -d $'\0' log_file; do
    local base_name
    base_name=$(basename "$log_file")
    cp "$log_file" "${component_log_dir}/${base_name}"

    # Add to aggregated log with component header
    echo -e "\n\n========== ${component}: ${base_name} ==========\n" >> "$AGGREGATED_LOG_FILE"
    cat "$log_file" >> "$AGGREGATED_LOG_FILE"

    # NOTE: `log_files_count=$((log_files_count + 1))` rather than
    # `((log_files_count++))` -- under `set -e`, the post-increment form
    # evaluates to the *pre*-increment value, so incrementing from 0 is
    # arithmetic 0 (shell "false") and kills the whole script right here.
    log_files_count=$((log_files_count + 1))
  done < <(find "$component_dir" -name "$log_pattern" -type f -mtime -"$max_age_days" -print0)

  if [ "$log_files_count" -eq 0 ]; then
    log_message "No log files found for ${component} matching pattern ${log_pattern}" "WARNING"
    echo "| $component | 0 | 0B | No log files found |" >> "$SUMMARY_FILE"
    return 1
  fi

  # Calculate total size of copied logs
  total_size=$(du -sh "$component_log_dir" | awk '{print $1}')

  log_message "Found $log_files_count log files for ${component}. Total size: $total_size" "INFO"

  # Create a summary entry for this component
  echo "| $component | $log_files_count | $total_size | ${component_log_dir} |" >> "$SUMMARY_FILE"

  return 0
}

# Function to collect Docker container logs
collect_docker_logs() {
  if ! command -v docker >/dev/null 2>&1; then
    log_message "Docker command not found, skipping container logs" "WARNING"
    echo "| Docker Containers | 0 | 0B | Docker command not found |" >> "$SUMMARY_FILE"
    return 1
  fi

  if ! docker info >/dev/null 2>&1; then
    log_message "Docker daemon is not running, skipping container logs" "WARNING"
    echo "| Docker Containers | 0 | 0B | Docker daemon not running |" >> "$SUMMARY_FILE"
    return 1
  fi

  local docker_log_dir="${AGGREGATED_LOG_DIR}/docker"
  mkdir -p "$docker_log_dir"

  local containers
  containers=$(docker ps -a --filter "name=blockguardian" --format "{{.Names}}" || true)

  if [ -z "$containers" ]; then
    log_message "No BlockGuardian Docker containers found" "WARNING"
    echo "| Docker Containers | 0 | 0B | No BlockGuardian containers found |" >> "$SUMMARY_FILE"
    return 1
  fi

  local container_count=0

  for container in $containers; do
    # Use docker logs -t to include timestamps
    docker logs -t "$container" > "${docker_log_dir}/${container}.log" 2>&1

    echo -e "\n\n========== Docker Container: ${container} ==========\n" >> "$AGGREGATED_LOG_FILE"
    cat "${docker_log_dir}/${container}.log" >> "$AGGREGATED_LOG_FILE"

    container_count=$((container_count + 1))
  done

  local total_size
  total_size=$(du -sh "$docker_log_dir" | awk '{print $1}')

  echo "| Docker Containers | $container_count | $total_size | ${docker_log_dir} |" >> "$SUMMARY_FILE"

  return 0
}

# Function to collect system logs related to BlockGuardian
collect_system_logs() {
  local system_log_dir="${AGGREGATED_LOG_DIR}/system"
  mkdir -p "$system_log_dir"

  log_message "Collecting system logs..." "INFO"

  # System information
  uname -a > "${system_log_dir}/system_info.log"
  free -h > "${system_log_dir}/memory_usage.log"
  df -h > "${system_log_dir}/disk_usage.log"
  ps aux | grep -E 'blockguardian|python|node|npm|docker' | grep -v 'grep' > "${system_log_dir}/processes.log" || true
  netstat -tuln > "${system_log_dir}/network_connections.log" 2>/dev/null || \
  ss -tuln > "${system_log_dir}/network_connections.log" 2>/dev/null || true

  # Add to aggregated log
  echo -e "\n\n========== System Information ==========\n" >> "$AGGREGATED_LOG_FILE"
  cat "${system_log_dir}/system_info.log" >> "$AGGREGATED_LOG_FILE"

  echo -e "\n\n========== Memory Usage ==========\n" >> "$AGGREGATED_LOG_FILE"
  cat "${system_log_dir}/memory_usage.log" >> "$AGGREGATED_LOG_FILE"

  echo -e "\n\n========== Disk Usage ==========\n" >> "$AGGREGATED_LOG_FILE"
  cat "${system_log_dir}/disk_usage.log" >> "$AGGREGATED_LOG_FILE"

  echo -e "\n\n========== Process Information ==========\n" >> "$AGGREGATED_LOG_FILE"
  cat "${system_log_dir}/processes.log" >> "$AGGREGATED_LOG_FILE"

  echo -e "\n\n========== Network Connections ==========\n" >> "$AGGREGATED_LOG_FILE"
  cat "${system_log_dir}/network_connections.log" >> "$AGGREGATED_LOG_FILE"

  local file_count
  file_count=$(ls -1 "$system_log_dir" | wc -l)
  local total_size
  total_size=$(du -sh "$system_log_dir" | awk '{print $1}')

  echo "| System Logs | $file_count | $total_size | ${system_log_dir} |" >> "$SUMMARY_FILE"

  return 0
}

# Function to analyze logs for errors and warnings
analyze_logs() {
  log_message "Analyzing logs for errors and warnings..." "INFO"

  local analysis_dir="${AGGREGATED_LOG_DIR}/analysis"
  mkdir -p "$analysis_dir"

  # Extract errors and warnings
  grep -i "error" "$AGGREGATED_LOG_FILE" > "${analysis_dir}/errors.log" || true
  grep -i "warn" "$AGGREGATED_LOG_FILE" > "${analysis_dir}/warnings.log" || true
  grep -i "exception" "$AGGREGATED_LOG_FILE" > "${analysis_dir}/exceptions.log" || true
  grep -i "fail" "$AGGREGATED_LOG_FILE" > "${analysis_dir}/failures.log" || true

  # Count occurrences
  local error_count
  local warning_count
  local exception_count
  local failure_count

  error_count=$(grep -c -i "error" "$AGGREGATED_LOG_FILE" || true)
  warning_count=$(grep -c -i "warn" "$AGGREGATED_LOG_FILE" || true)
  exception_count=$(grep -c -i "exception" "$AGGREGATED_LOG_FILE" || true)
  failure_count=$(grep -c -i "fail" "$AGGREGATED_LOG_FILE" || true)

  # Add analysis to summary
  echo "" >> "$SUMMARY_FILE"
  echo "## Log Analysis" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "| Issue Type | Count | Details |" >> "$SUMMARY_FILE"
  echo "|------------|-------|---------|" >> "$SUMMARY_FILE"
  echo "| Errors | $error_count | [View Details](${analysis_dir}/errors.log) |" >> "$SUMMARY_FILE"
  echo "| Warnings | $warning_count | [View Details](${analysis_dir}/warnings.log) |" >> "$SUMMARY_FILE"
  echo "| Exceptions | $exception_count | [View Details](${analysis_dir}/exceptions.log) |" >> "$SUMMARY_FILE"
  echo "| Failures | $failure_count | [View Details](${analysis_dir}/failures.log) |" >> "$SUMMARY_FILE"

  # Print analysis to console
  echo -e "${BLUE}========== Log Analysis ==========${NC}"
  echo -e "${RED}Errors: $error_count${NC}"
  echo -e "${YELLOW}Warnings: $warning_count${NC}"
  echo -e "${RED}Exceptions: $exception_count${NC}"
  echo -e "${RED}Failures: $failure_count${NC}"

  return 0
}

# Main function to aggregate all logs
aggregate_logs() {
  log_message "Starting log aggregation for BlockGuardian" "INFO"
  echo -e "${BLUE}========== BlockGuardian Log Aggregation ==========${NC}"

  # Create summary file header
  echo "# BlockGuardian Log Aggregation Summary" > "$SUMMARY_FILE"
  echo "Generated on: $(date)" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "## Collected Logs" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "| Component | Files | Size | Location |" >> "$SUMMARY_FILE"
  echo "|-----------|-------|------|----------|" >> "$SUMMARY_FILE"

  # Define components and their log directories/patterns
  local components=(
    "Backend:${PROJECT_ROOT}/code/backend:*.log"
    "Blockchain:${PROJECT_ROOT}/code/blockchain:*.log"
    "Web-Frontend:${PROJECT_ROOT}/web-frontend:*.log"
    "Mobile-Frontend:${PROJECT_ROOT}/mobile-frontend:*.log"
  )

  for component_info in "${components[@]}"; do
    IFS=':' read -r component_name component_dir log_pattern <<< "$component_info"
    # collect_component_logs legitimately returns 1 when a component simply
    # has no log files yet (already handled/reported internally) - as a bare
    # statement under `set -e` that would otherwise kill the whole script.
    collect_component_logs "$component_name" "$component_dir" "$log_pattern" || true
  done

  echo -e "${BLUE}Collecting Docker container logs...${NC}"
  collect_docker_logs || true

  echo -e "${BLUE}Collecting system logs...${NC}"
  collect_system_logs

  echo -e "${BLUE}Analyzing logs...${NC}"
  analyze_logs

  local total_size
  total_size=$(du -sh "$AGGREGATED_LOG_DIR" | awk '{print $1}')

  echo "" >> "$SUMMARY_FILE"
  echo "## Summary Statistics" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "- **Total Log Size:** $total_size" >> "$SUMMARY_FILE"
  echo "- **Aggregated Log File:** $AGGREGATED_LOG_FILE" >> "$SUMMARY_FILE"
  echo "- **Collection Date:** $(date)" >> "$SUMMARY_FILE"

  echo -e "${BLUE}========== Log Aggregation Summary ==========${NC}"
  echo -e "${GREEN}Log aggregation completed successfully${NC}"
  echo -e "${BLUE}Total Log Size: $total_size${NC}"
  echo -e "${BLUE}Aggregated Log File: $AGGREGATED_LOG_FILE${NC}"

  log_message "Log aggregation completed. Results saved to $SUMMARY_FILE" "INFO"

  return 0
}

# --- Script Execution ---
aggregate_logs
exit_code=$?

# Return the exit code
exit $exit_code

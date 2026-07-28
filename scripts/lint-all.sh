#!/bin/bash

# Linting and Fixing Script for BlockGuardian Project (Python, JavaScript, Solidity, YAML, Terraform)

# --- Configuration and Setup ---
set -euo pipefail # Exit on error, unset variable, and pipe failure

# Script directory and project root (robust to the caller's current working
# directory - all other scripts in this directory use the same pattern).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$PROJECT_ROOT"

# Dedicated virtual environment for lint tooling. Installing into a venv
# (rather than the system Python) avoids PEP 668 "externally-managed-environment"
# failures on modern Debian/Ubuntu systems, without requiring --break-system-packages.
LINT_VENV="${PROJECT_ROOT}/.lint-venv"

echo "----------------------------------------"
echo "Starting linting and fixing process for BlockGuardian..."
echo "----------------------------------------"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to install a Python package into the dedicated lint venv
install_python_package() {
  local package_name="$1"
  echo "Installing/Updating Python package: $package_name..."
  "${LINT_VENV}/bin/pip" install --upgrade --quiet "$package_name" || {
    echo "Error: Failed to install Python package $package_name." >&2
    exit 1
  }
}

# Function to install a global npm package
install_npm_package() {
  local package_name="$1"
  echo "Installing/Updating global npm package: $package_name..."
  # Use sudo for global install, but check if it's already installed to avoid
  # unnecessary sudo. Skip sudo entirely when already root or when sudo isn't
  # available (common in containers/CI runners) - `npm install --global` works
  # fine without it in both of those cases.
  if ! command_exists "$package_name"; then
    local npm_installer=(npm install --global "$package_name")
    if [ "$(id -u)" -ne 0 ] && command_exists sudo; then
      npm_installer=(sudo "${npm_installer[@]}")
    fi
    "${npm_installer[@]}" || {
      echo "Error: Failed to install global npm package $package_name." >&2
      exit 1
    }
  fi
}

# --- Check and Install Required Tools ---
echo "Checking for required tools..."

if [ ! -d "$LINT_VENV" ]; then
  echo "Creating Python virtual environment for lint tools at $LINT_VENV..."
  python3 -m venv "$LINT_VENV"
fi

# Python tools
install_python_package "black"
install_python_package "isort"
install_python_package "flake8"
install_python_package "pylint"
install_python_package "pyyaml" # For YAML validation

# Node.js tools
install_npm_package "eslint"
install_npm_package "prettier"
install_npm_package "solhint"

# Check for optional tools
YAMLLINT_AVAILABLE=false
if command_exists yamllint; then
  echo "yamllint is installed."
  YAMLLINT_AVAILABLE=true
else
  echo "Warning: yamllint is not installed. Will use basic Python YAML validation."
fi

TERRAFORM_AVAILABLE=false
if command_exists terraform; then
  echo "terraform is installed."
  TERRAFORM_AVAILABLE=true
else
  echo "Warning: terraform is not installed. Terraform validation will be limited."
fi

# --- Define Directories to Process ---
# All paths are relative to $ROOT_DIR and resolved against it below - they are
# NOT resolved against the caller's current working directory.
PYTHON_DIRECTORIES=(
  "code/backend"
)

JS_DIRECTORIES=(
  "web-frontend"
  "mobile-frontend"
  "code/blockchain"
)

SOLIDITY_DIRECTORIES=(
  "code/blockchain/contracts"
)

YAML_DIRECTORIES=(
  "infrastructure/kubernetes"
  "infrastructure/ansible"
  ".github/workflows"
)

TERRAFORM_DIRECTORIES=(
  "infrastructure/terraform"
)

# --- 1. Python Linting ---
echo "----------------------------------------"
echo "Running Python linting tools..."

for dir in "${PYTHON_DIRECTORIES[@]}"; do
  full_dir="${ROOT_DIR}/${dir}"
  if [ -d "$full_dir" ]; then
    echo "Processing Python directory: $dir"
    (
      cd "$full_dir"

      # Find and activate the component's own venv if it exists (so tools
      # like isort can see the project's real dependencies); otherwise fall
      # back to the dedicated lint venv set up above.
      VENV_PATH=$(find . -maxdepth 2 -type d -name "venv" | head -n 1)
      if [ -n "$VENV_PATH" ]; then
        # shellcheck disable=SC1091
        source "$VENV_PATH/bin/activate"
        PYTHON_BIN="python3"
      else
        PYTHON_BIN="${LINT_VENV}/bin/python3"
      fi

      # 1.1 Run Black (code formatter)
      echo "  - Running Black..."
      "$PYTHON_BIN" -m black . || echo "    Black encountered issues in $dir."

      # 1.2 Run isort (import sorter)
      echo "  - Running isort..."
      "$PYTHON_BIN" -m isort . || echo "    isort encountered issues in $dir."

      # 1.3 Run flake8 (linter)
      echo "  - Running flake8..."
      "$PYTHON_BIN" -m flake8 . || echo "    Flake8 found issues in $dir."

      # 1.4 Run pylint (more comprehensive linter)
      echo "  - Running pylint..."
      find . -type f -name "*.py" -print0 |
        xargs -0 -r "$PYTHON_BIN" -m pylint --disable=C0111,C0103,C0303,W0621,C0301,W0612,W0611,R0913,R0914,R0915 ||
        echo "    Pylint found issues in $dir."

      if [ -n "$VENV_PATH" ]; then
        deactivate
      fi
    )
  else
    echo "Warning: Python directory $dir not found. Skipping."
  fi
done
echo "Python linting completed."

# --- 2. JavaScript/TypeScript Linting ---
echo "----------------------------------------"
echo "Running JavaScript/TypeScript linting tools..."

# Ensure config files exist in the root for global tools to pick up
if [ ! -f "$ROOT_DIR/eslint.config.js" ]; then
  echo "Warning: ESLint config not found at $ROOT_DIR/eslint.config.js. Using project's existing config or default."
fi

for dir in "${JS_DIRECTORIES[@]}"; do
  full_dir="${ROOT_DIR}/${dir}"
  if [ -d "$full_dir" ]; then
    echo "Processing JavaScript/TypeScript directory: $dir"
    (
      cd "$full_dir"
      # 2.1 Run Prettier (formatter)
      echo "  - Running Prettier..."
      npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,scss,md}" || echo "    Prettier encountered issues in $dir."

      # 2.2 Run ESLint (linter)
      echo "  - Running ESLint..."
      # Use npx to ensure local installation is preferred, or fall back to global
      npx eslint . --ext .js,.jsx,.ts,.tsx --fix || echo "    ESLint found issues in $dir."
    )
  else
    echo "Warning: JS/TS directory $dir not found. Skipping."
  fi
done
echo "JavaScript/TypeScript linting completed."

# --- 3. Solidity Linting ---
echo "----------------------------------------"
echo "Running Solidity linting tools..."

for dir in "${SOLIDITY_DIRECTORIES[@]}"; do
  full_dir="${ROOT_DIR}/${dir}"
  if [ -d "$full_dir" ]; then
    echo "Processing Solidity directory: $dir"
    (
      cd "$full_dir"
      # 3.1 Run Prettier (formatter)
      echo "  - Running Prettier for Solidity..."
      npx prettier --write "**/*.sol" || echo "    Prettier encountered issues in $dir."

      # 3.2 Run solhint (linter)
      echo "  - Running solhint..."
      npx solhint "**/*.sol" || echo "    solhint found issues in $dir."
    )
  else
    echo "Warning: Solidity directory $dir not found. Skipping."
  fi
done
echo "Solidity linting completed."

# --- 4. YAML Linting ---
echo "----------------------------------------"
echo "Running YAML linting tools..."

for dir in "${YAML_DIRECTORIES[@]}"; do
  full_dir="${ROOT_DIR}/${dir}"
  if [ -d "$full_dir" ]; then
    echo "Processing YAML directory: $dir"
    if [ "$YAMLLINT_AVAILABLE" = true ]; then
      echo "  - Running yamllint..."
      yamllint "$full_dir" || echo "    yamllint found issues in $dir."
    else
      echo "  - Performing basic YAML validation using Python..."
      # Pass the filename as a real argv entry (sys.argv[1]) rather than via
      # `find -exec ... {} ...` string substitution: `find` replaces every
      # occurrence of the literal `{}` sequence in an -exec argument, which
      # would also mangle the `{}` used for f-string brace-escaping below.
      find "$full_dir" -type f \( -name "*.yaml" -o -name "*.yml" \) -print0 |
        while IFS= read -r -d '' yaml_file; do
          "${LINT_VENV}/bin/python3" -c "
import sys
import yaml
try:
    # Kubernetes manifests and similar files commonly contain multiple
    # '---'-separated documents in one file, which safe_load() (single
    # document only) would incorrectly flag as an error.
    list(yaml.safe_load_all(open(sys.argv[1])))
except Exception as e:
    print(f'YAML Error in {sys.argv[1]}: {e}', file=sys.stderr)
    sys.exit(1)
" "$yaml_file" || echo "    Basic YAML validation found issues in $yaml_file."
        done
    fi
  else
    echo "Warning: YAML directory $dir not found. Skipping."
  fi
done
echo "YAML linting completed."

# --- 5. Terraform Linting ---
echo "----------------------------------------"
echo "Running Terraform linting tools..."

for dir in "${TERRAFORM_DIRECTORIES[@]}"; do
  full_dir="${ROOT_DIR}/${dir}"
  if [ -d "$full_dir" ]; then
    echo "Processing Terraform directory: $dir"
    if [ "$TERRAFORM_AVAILABLE" = true ]; then
      (
        cd "$full_dir"
        # 5.1 Run terraform fmt
        echo "  - Running terraform fmt..."
        terraform fmt -recursive . || echo "    terraform fmt encountered issues in $dir."

        # 5.2 Run terraform validate
        echo "  - Running terraform validate..."
        # terraform init is required before validate
        terraform init -backend=false > /dev/null && terraform validate || echo "    terraform validate encountered issues in $dir."
      )
    else
      echo "  - Skipping Terraform linting (terraform not installed)."
    fi
  else
    echo "Warning: Terraform directory $dir not found. Skipping."
  fi
done
echo "Terraform linting completed."

# --- 6. Common Fixes for All File Types ---
echo "----------------------------------------"
echo "Applying common fixes to all file types..."

# 6.1 Fix trailing whitespace
echo "Fixing trailing whitespace..."
find "$ROOT_DIR" -type f \( -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.sol" -o -name "*.yaml" -o -name "*.yml" -o -name "*.tf" -o -name "*.tfvars" -o -name "*.sh" \) -not -path "*/node_modules/*" -not -path "*/venv/*" -not -path "*/.lint-venv/*" -exec sed -i 's/[ \t]*$//' {} \;

# 6.2 Ensure newline at end of file
echo "Ensuring newline at end of files..."
find "$ROOT_DIR" -type f \( -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.sol" -o -name "*.yaml" -o -name "*.yml" -o -name "*.tf" -o -name "*.tfvars" -o -name "*.sh" \) -not -path "*/node_modules/*" -not -path "*/venv/*" -not -path "*/.lint-venv/*" -exec sh -c '[ -n "$(tail -c1 "$1")" ] && echo "" >> "$1"' sh {} \;

echo "----------------------------------------"
echo "Linting and fixing process for BlockGuardian completed!"
echo "----------------------------------------"

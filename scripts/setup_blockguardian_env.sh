#!/bin/bash

# BlockGuardian Environment Setup Script
# This script automates the setup of the development environment for the BlockGuardian project.
# It can be run from anywhere - the project root is resolved from this script's
# own location, not the caller's current working directory.

# --- Configuration and Setup ---
set -euo pipefail # Exit on error, unset variable, and pipe failure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting BlockGuardian Environment Setup..."

# -----------------------------------------------------------------------------
# Helper functions
# -----------------------------------------------------------------------------
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Run a command with sudo only when actually needed: skip it entirely when
# already root (common in Docker/CI images) or when sudo isn't installed at
# all (also common in such images) - otherwise `sudo apt-get ...` fails
# immediately with "sudo: command not found" and, under `set -e`, that used
# to take down the whole script before it did anything.
maybe_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command_exists sudo; then
        sudo "$@"
    else
        echo "Warning: 'sudo' not found and not running as root; attempting '$*' without it." >&2
        "$@"
    fi
}

# -----------------------------------------------------------------------------
# Install System-Level Dependencies
# -----------------------------------------------------------------------------
echo "Updating package lists..."
maybe_sudo apt-get update -y || echo "Warning: 'apt-get update' reported errors (e.g. an unreachable third-party repo); continuing with the existing package lists." >&2

echo "Installing system-level dependencies..."

# Install Python 3 and venv
if ! command_exists python3; then
    echo "Installing Python 3..."
    maybe_sudo apt-get install -y python3
else
    echo "Python 3 is already installed."
fi

if ! command_exists pip3; then
    echo "Installing pip3..."
    maybe_sudo apt-get install -y python3-pip
else
    echo "pip3 is already installed."
fi

if ! dpkg -s python3-venv >/dev/null 2>&1; then
    echo "Installing python3-venv..."
    maybe_sudo apt-get install -y python3-venv
else
    echo "python3-venv is already installed."
fi

# Install Node.js and npm (e.g., Node.js 20.x)
if ! command_exists node; then
    echo "Installing Node.js and npm..."
    # Using the official NodeSource setup script for a specific version (20.x)
    curl -fsSL https://deb.nodesource.com/setup_20.x | maybe_sudo bash -
    maybe_sudo apt-get install -y nodejs
else
    echo "Node.js is already installed. Version: $(node -v)"
fi

echo "System-level dependencies installation check complete."

# -----------------------------------------------------------------------------
# Project Component Setup
# Paths are resolved relative to $ROOT_DIR (this script's own project root),
# not the caller's current working directory.
# Using subshells () to safely manage directory changes
# -----------------------------------------------------------------------------

# Backend Setup (Python/Flask)
BACKEND_DIR="$ROOT_DIR/code/backend"
if [ -d "$BACKEND_DIR" ]; then
    echo "Setting up Backend (Python/Flask) in $BACKEND_DIR ..."
    (
        cd "$BACKEND_DIR"
        VENV_PATH="./venv"
        if [ ! -d "$VENV_PATH" ]; then
            echo "Creating Python virtual environment for backend..."
            python3 -m venv "$VENV_PATH"
        fi
        echo "Activating virtual environment and installing backend dependencies..."
        # shellcheck disable=SC1091
        source "$VENV_PATH/bin/activate"
        pip install -r requirements.txt
        deactivate
        echo "Backend setup complete."
    )
else
    echo "Warning: Backend directory '$BACKEND_DIR' not found. Skipping backend setup."
fi

# Blockchain Setup (Node.js/Hardhat)
# This project has a single blockchain component, at code/blockchain, using
# Hardhat (see code/blockchain/hardhat.config.js) - not Truffle, and not a
# top-level blockchain/ directory (neither of which exist in this repo).
BLOCKCHAIN_DIR="$ROOT_DIR/code/blockchain"
if [ -d "$BLOCKCHAIN_DIR" ]; then
    echo "Setting up Blockchain (Node.js/Hardhat) in $BLOCKCHAIN_DIR ..."
    (
        cd "$BLOCKCHAIN_DIR"
        echo "Installing blockchain dependencies..."
        npm install
        echo "Blockchain setup complete. Use 'npx hardhat compile', 'npx hardhat test', etc. within this directory."
    )
else
    echo "Warning: Blockchain directory '$BLOCKCHAIN_DIR' not found. Skipping blockchain setup."
fi

# Mobile Frontend Setup (Expo/React Native)
MOBILE_FRONTEND_DIR="$ROOT_DIR/mobile-frontend"
if [ -d "$MOBILE_FRONTEND_DIR" ]; then
    echo "Setting up Mobile Frontend (Expo/React Native) in $MOBILE_FRONTEND_DIR ..."
    (
        cd "$MOBILE_FRONTEND_DIR"
        # The project ships package-lock.json (npm), not yarn.lock.
        echo "Installing mobile-frontend dependencies using npm..."
        npm install
        echo "Mobile Frontend setup complete. Use 'npx expo start' to run it."
    )
else
    echo "Warning: Mobile Frontend directory '$MOBILE_FRONTEND_DIR' not found. Skipping mobile-frontend setup."
fi

# Web Frontend Setup (Next.js)
WEB_FRONTEND_DIR="$ROOT_DIR/web-frontend"
if [ -d "$WEB_FRONTEND_DIR" ]; then
    echo "Setting up Web Frontend (Next.js) in $WEB_FRONTEND_DIR ..."
    (
        cd "$WEB_FRONTEND_DIR"
        echo "Installing web-frontend dependencies..."
        npm install
        echo "Web Frontend setup complete."
    )
else
    echo "Warning: Web Frontend directory '$WEB_FRONTEND_DIR' not found. Skipping web-frontend setup."
fi

# -----------------------------------------------------------------------------
# Final Instructions
# -----------------------------------------------------------------------------
echo ""
echo "BlockGuardian Development Environment Setup Script Finished!"
echo "---------------------------------------------------------"
echo "Summary of components and their setup locations:"
echo "  - Backend (Python/Flask): code/backend/ (venv created inside)"
echo "  - Blockchain (Node.js/Hardhat): code/blockchain/"
echo "  - Mobile Frontend (Expo/React Native): mobile-frontend/"
echo "  - Web Frontend (Next.js): web-frontend/"
echo ""
echo "To run the project, use the 'run_blockguardian.sh' script or start each component separately."
echo "Remember to check for any specific Node.js or Python version requirements if you encounter issues during runtime."

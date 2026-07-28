# BlockGuardian Automation Scripts

Shell scripts that automate setup, running, building, linting, testing, deploying, and
monitoring the BlockGuardian project across its four components:

- **Backend** — Flask API at `code/backend`
- **Blockchain** — Hardhat/Solidity contracts at `code/blockchain`
- **Web Frontend** — Next.js app at `web-frontend`
- **Mobile Frontend** — Expo/React Native app at `mobile-frontend`

All scripts resolve the project root from their own location (not the caller's current
directory), so they can be run from anywhere, e.g. `./scripts/health_check.sh` or
`bash /path/to/BlockGuardian/scripts/health_check.sh`.

## Setup

Make the scripts executable once after cloning (git preserves this afterwards):

```bash
chmod +x scripts/*.sh
```

### `setup_blockguardian_env.sh`

Installs system dependencies (Python 3, pip, venv, Node.js if missing) and sets up
every component: creates the backend's virtual environment and installs
`requirements.txt`, and runs `npm install` for the blockchain, web-frontend, and
mobile-frontend projects.

```bash
./scripts/setup_blockguardian_env.sh
```

Uses `sudo` for system package installs only when not already running as root and
`sudo` is actually available (so it also works unmodified inside root-only containers).

## Running the app

### `run_blockguardian.sh`

Starts the backend, blockchain node, and web frontend together, and keeps running in
the foreground until you press Ctrl+C, at which point it stops all three cleanly.

```bash
./scripts/run_blockguardian.sh
```

- Backend: http://localhost:5000
- Web frontend: http://localhost:3000
- Blockchain node (JSON-RPC): http://localhost:8545

## Build & clean

### `build_all.sh`

Builds every component (backend dependency install, Hardhat contract compilation,
`next build` for web-frontend, and an Expo web export for mobile-frontend), streaming
each component's build output directly to the console.

```bash
./scripts/build_all.sh
```

### `clean_all.sh`

Removes build artifacts, caches, and dependency directories (`node_modules`, `venv`,
`.next`, Hardhat's `cache`/`artifacts`, `__pycache__`, etc.) for every component.

```bash
./scripts/clean_all.sh
```

## Quality checks

### `lint-all.sh`

Runs formatters and linters across every component: Black/isort/flake8/pylint for
Python, Prettier/ESLint for JavaScript/TypeScript, Prettier/solhint for Solidity,
yamllint (or a basic Python-based fallback) for YAML, and `terraform fmt`/`validate`
for infrastructure code. Also normalizes trailing whitespace and end-of-file newlines
across the whole repo.

```bash
./scripts/lint-all.sh
```

Python lint tools install into a dedicated virtual environment at `.lint-venv/`
(created automatically) rather than the system Python, so this works cleanly on
modern Debian/Ubuntu systems without needing `--break-system-packages`.

### `run_unified_tests.sh`

Runs each component's test suite (pytest for the backend, Hardhat tests for the
blockchain, Jest for both frontends) and writes a consolidated pass/fail report.

```bash
./scripts/run_unified_tests.sh
```

Results are saved in `test-results/` (per-component logs plus `test_summary_*.md`).

## Operations

### `health_check.sh`

Checks whether each component's expected port is up and responding correctly
(backend `/health` endpoint, blockchain JSON-RPC, web frontend HTTP 200), plus
database, Redis, Docker containers, and disk space. Writes a Markdown summary table.

```bash
./scripts/health_check.sh
```

Results are saved in `health-checks/`. Exits non-zero if any service is unhealthy.

### `log_aggregator.sh`

Collects each component's `*.log` files, Docker container logs (if any), and basic
system logs into one aggregated file, then reports counts of errors/warnings/
exceptions/failures found across them.

```bash
./scripts/log_aggregator.sh
```

Results are saved in `logs/aggregated/`.

### `deploy_automation.sh`

Runs tests, builds, and (simulated) deploys for one or all components against a
target environment.

```bash
./scripts/deploy_automation.sh --environment <development|staging|production> [options]
```

Options:

- `-e, --environment` _(required)_ — `development`, `staging`, or `production`
- `-c, --component` — `all` (default), `backend`, `web-frontend`, `mobile-frontend`, or `blockchain`
- `-s, --skip-tests` — skip the test step before building/deploying
- `-h, --help` — show usage

Results are saved in `deployment-logs/` (per-component logs plus
`deployment_summary_*.md`). The actual deploy step for each component is a logged
placeholder (e.g. where an `aws s3 sync` or `docker push` would go) rather than a
real push to infrastructure — wire in real deployment commands for your environment
before using this in production.

## Notes

- Every script uses `set -euo pipefail` and is written to run its full set of checks
  even when individual components fail, reporting a complete summary at the end
  rather than stopping partway through.
- Scripts that install or modify dependencies (`setup_blockguardian_env.sh`,
  `build_all.sh`, `lint-all.sh`) are safe to re-run; they skip work that's already done.

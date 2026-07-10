# BlockGuardian

![CI/CD Status](https://img.shields.io/github/actions/workflow/status/quantsingularity/BlockGuardian/cicd.yml?branch=main&label=CI/CD&logo=github)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Portfolio and Asset Management Platform

BlockGuardian is a full-stack financial platform for managing investment portfolios: tracking assets, recording buy and sell transactions, and reporting performance, allocation, and risk. The backend is a Flask REST API with JWT authentication, encryption, rate limiting, and audit logging built in. It ships with a Next.js web dashboard and a React Native mobile app.

<div align="center">
  <img src="docs/images/BlockGuardian_dashboard.bmp" alt="BlockGuardian Dashboard" width="80%">
</div>

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation and Setup](#installation-and-setup)
- [Key Scripts](#key-scripts)
- [Infrastructure](#infrastructure)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

BlockGuardian's core functionality is a portfolio and asset management API plus its web and mobile clients. A user registers, authenticates with JWT (with optional MFA), and manages one or more portfolios containing stocks, bonds, cryptocurrency, ETFs, mutual funds, commodities, forex, derivatives, real estate, and other alternative assets. Each portfolio tracks holdings and a transaction ledger, and exposes computed performance, allocation, and risk views.

| Supported Asset Types | Supported Transaction Types |
| --------------------- | --------------------------- |
| Stock                 | Buy                         |
| Bond                  | Sell                        |
| Cryptocurrency        | Deposit                     |
| ETF                   | Withdrawal                  |
| Mutual Fund           | Dividend                    |
| Commodity             | Interest                    |
| Forex                 | Fee                         |
| Derivative            | Transfer In / Out           |
| Real Estate           | Split                       |
| Alternative           | Merger                      |

The codebase also includes a schema for tracking AI and ML model metadata (fraud detection flags, risk assessments, market predictions, anomaly detection, and training jobs), and separate modules for compliance reporting and metrics monitoring.

## Project Structure

```
BlockGuardian/
├── code/
│   ├── backend/            # Flask REST API
│   └── blockchain/         # Hardhat/Truffle project with Solidity contracts
├── docs/                   # Project documentation
├── infrastructure/         # Docker, Kubernetes, Terraform, Ansible, disaster recovery
├── mobile-frontend/        # React Native (Expo) application
├── web-frontend/           # Next.js web dashboard
├── scripts/                # Setup, build, lint, and deployment scripts
├── .github/workflows/      # CI pipeline (cicd.yml)
├── LICENSE
└── README.md
```

## Key Features

### Authentication and Identity

Implemented in `code/backend/src/routes/auth.py`.

| Endpoint                  | Method | Description                                         |
| ------------------------- | ------ | --------------------------------------------------- |
| /api/auth/register        | POST   | Register a new user                                 |
| /api/auth/login           | POST   | Log in and receive JWT access and refresh tokens    |
| /api/auth/logout          | POST   | Log out and invalidate the session                  |
| /api/auth/refresh         | POST   | Refresh an access token                             |
| /api/auth/setup-mfa       | POST   | Begin multi-factor authentication setup             |
| /api/auth/enable-mfa      | POST   | Enable multi-factor authentication                  |
| /api/auth/disable-mfa     | POST   | Disable multi-factor authentication                 |
| /api/auth/change-password | POST   | Change password with existing-password verification |
| /api/auth/profile         | GET    | Retrieve the user profile                           |
| /api/auth/profile         | PUT    | Update the user profile                             |
| /api/auth/verify-token    | POST   | Verify a JWT token                                  |

### Portfolio and Transaction Management

Implemented in `code/backend/src/routes/portfolio.py`.

| Endpoint                            | Method | Description                  |
| ----------------------------------- | ------ | ---------------------------- |
| /api/portfolios/                    | GET    | List portfolios              |
| /api/portfolios/                    | POST   | Create a portfolio           |
| /api/portfolios/\<id\>              | GET    | Retrieve a portfolio         |
| /api/portfolios/\<id\>              | PUT    | Update a portfolio           |
| /api/portfolios/\<id\>              | DELETE | Delete a portfolio           |
| /api/portfolios/\<id\>/holdings     | GET    | List holdings in a portfolio |
| /api/portfolios/\<id\>/transactions | GET    | List transactions            |
| /api/portfolios/\<id\>/transactions | POST   | Record a transaction         |
| /api/portfolios/\<id\>/buy          | POST   | Buy an asset                 |
| /api/portfolios/\<id\>/sell         | POST   | Sell an asset                |
| /api/portfolios/\<id\>/performance  | GET    | View performance metrics     |
| /api/portfolios/\<id\>/allocation   | GET    | View asset allocation        |
| /api/portfolios/\<id\>/risk         | GET    | View risk level              |
| /api/portfolios/assets              | GET    | List available assets        |
| /api/portfolios/assets/search       | GET    | Search assets                |

### Security Infrastructure

Implemented in `code/backend/src/security/`.

| Module         | File             | Responsibility                                 |
| -------------- | ---------------- | ---------------------------------------------- |
| Authentication | auth.py          | JWT based auth with role and permission checks |
| Encryption     | encryption.py    | Field level encryption helpers                 |
| Rate Limiting  | rate_limiting.py | Configurable rate limiting by scope            |
| Audit Logging  | audit.py         | Structured logging of security relevant events |
| Validation     | validation.py    | Centralized input validation                   |

### AI and ML Data Model

Implemented in `code/backend/src/models/ai_models.py`. This module defines the data model only. Model training and inference are not part of this repository, so populating these tables with live predictions requires connecting an external model or building one against this schema.

| Table            | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| AIModel          | Registers AI models, status, and deployment lifecycle |
| ModelPrediction  | Stores individual model predictions and feedback      |
| FraudDetection   | Records flagged transactions and actions taken        |
| RiskAssessment   | Stores computed risk assessments and expiry           |
| MarketPrediction | Stores market forecasts and accuracy tracking         |
| AnomalyDetection | Stores detected anomalies, alerts, and resolution     |
| ModelTrainingJob | Tracks training job lifecycle and metrics             |

### Compliance and Monitoring

Implemented in `code/backend/src/compliance/` and `code/backend/src/monitoring/`. Both modules have dedicated test files. Neither is currently registered as a Flask blueprint in `main.py`, so wiring them into `register_blueprints()` is the remaining step to expose them through the API.

| Module               | File          | Status                                     |
| -------------------- | ------------- | ------------------------------------------ |
| Compliance records   | compliance.py | Implemented, not registered as a blueprint |
| Compliance reporting | reporting.py  | Implemented, not registered as a blueprint |
| Metrics collection   | metrics.py    | Implemented, not registered as a blueprint |

### Blockchain Module

A Hardhat and Truffle project in `code/blockchain/` defines the following Solidity contracts. They are not currently called from the Flask backend.

| Contract             | Purpose                        |
| -------------------- | ------------------------------ |
| PortfolioManager.sol | Portfolio management logic     |
| TradingPlatform.sol  | Trading logic                  |
| TokenizedAsset.sol   | Tokenized asset representation |
| DeFiIntegration.sol  | DeFi protocol integration      |
| TestToken.sol        | Test token for development     |

### Web and Mobile Clients

| Screen                         | Web               | Mobile            |
| ------------------------------ | ----------------- | ----------------- |
| Login                          | Yes               | Yes               |
| Dashboard                      | Yes               | Yes               |
| Portfolio                      | Yes               | Yes               |
| AI Recommendations             | Yes               | Yes               |
| Market Analysis                | Yes               | Yes               |
| Admin                          | Yes               | Yes               |
| Blockchain Explorer            | Yes (sample data) | Yes (sample data) |
| Security Check                 | No                | Yes               |
| About, Contact, Terms, Privacy | Yes               | No                |

The blockchain explorer view in both clients currently renders sample data (transaction counts, volumes, and a list of contract addresses) rather than querying a live source.

## Architecture

```
BlockGuardian/
├── Backend (Flask, single service)
│   ├── Auth blueprint       /api/auth/*
│   ├── Portfolio blueprint  /api/portfolios/*
│   ├── Health and info      /health, /api/info
│   └── Not yet registered:  user, compliance, monitoring routes
├── Frontend Applications
│   ├── Web Dashboard (Next.js)
│   └── Mobile App (React Native / Expo)
├── Data Layer
│   ├── PostgreSQL (primary datastore)
│   └── Redis (caching, rate limiting)
└── Infrastructure
    ├── Docker Compose (local and production)
    ├── Kubernetes manifests
    ├── Terraform modules
    └── Ansible playbooks
```

## Technology Stack

### Backend

| Aspect         | Technology                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Language       | Python 3.11                                                                                                               |
| Framework      | Flask                                                                                                                     |
| Extensions     | Flask-CORS, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-Limiter, Flask-Caching, Flask-SocketIO, Flask-Migrate, Flask-Mail |
| Database       | PostgreSQL (via SQLAlchemy), Redis                                                                                        |
| Error Tracking | Sentry (Flask integration)                                                                                                |

### Web Frontend

| Aspect             | Technology         |
| ------------------ | ------------------ |
| Framework          | Next.js with React |
| Data Visualization | Recharts           |
| Testing            | Jest, Playwright   |

### Mobile Frontend

| Aspect    | Technology                  |
| --------- | --------------------------- |
| Framework | React Native (Expo, SDK 52) |
| Testing   | Jest                        |

### Blockchain

| Aspect   | Technology       |
| -------- | ---------------- |
| Tooling  | Hardhat, Truffle |
| Language | Solidity         |

### Infrastructure

| Aspect                 | Technology             |
| ---------------------- | ---------------------- |
| Containerization       | Docker, Docker Compose |
| Orchestration          | Kubernetes             |
| Infrastructure as Code | Terraform, Ansible     |
| CI/CD                  | GitHub Actions         |

## Installation and Setup

### Prerequisites

| Requirement               | Version       |
| ------------------------- | ------------- |
| Docker and Docker Compose | Latest stable |
| Node.js                   | 18 or later   |
| Python                    | 3.11          |

### Setup Using the Environment Script

```bash
git clone https://github.com/quantsingularity/BlockGuardian.git
cd BlockGuardian

# Sets up backend, blockchain, web, and mobile dependencies
./scripts/setup_blockguardian_env.sh

# Starts the application
./scripts/run_blockguardian.sh
```

### Manual Setup by Component

Backend (`code/backend/`):

```bash
cd code/backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # edit as needed
python -m flask --app src.main run --debug
```

Web Frontend (`web-frontend/`):

```bash
cd web-frontend
npm install
npm run dev                   # http://localhost:3000
```

Mobile Frontend (`mobile-frontend/`):

```bash
cd mobile-frontend
npm install
npm start
```

### Running Backend Services with Docker Compose

The backend, PostgreSQL, and Redis are defined in `code/docker-compose.yml`:

```bash
cd code
docker-compose up --build
```

The web and mobile frontends are not part of this compose file and are run separately as shown above.

## Key Scripts

| Script                             | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| scripts/setup_blockguardian_env.sh | Sets up dependencies for backend, blockchain, web, and mobile |
| scripts/run_blockguardian.sh       | Starts the application components                             |
| scripts/build_all.sh               | Builds all components                                         |
| scripts/clean_all.sh               | Removes build artifacts and dependencies                      |
| scripts/lint-all.sh                | Runs linting across all components                            |
| scripts/health_check.sh            | Checks service health                                         |
| scripts/log_aggregator.sh          | Aggregates logs from running services                         |
| scripts/run_unified_tests.sh       | Runs the full test suite across components                    |
| scripts/deploy_automation.sh       | Deployment automation                                         |

## Infrastructure

| Directory                               | Contents                                |
| --------------------------------------- | --------------------------------------- |
| infrastructure/docker/                  | Additional Docker configuration         |
| infrastructure/kubernetes/base/         | Base Kubernetes manifests               |
| infrastructure/kubernetes/environments/ | Per environment overlays                |
| infrastructure/terraform/modules/       | Terraform modules                       |
| infrastructure/terraform/environments/  | Per environment Terraform configuration |
| infrastructure/terraform/scripts/       | Terraform helper scripts                |
| infrastructure/ansible/inventory/       | Ansible inventory                       |
| infrastructure/ansible/playbooks/       | Ansible playbooks                       |
| infrastructure/ansible/roles/           | Ansible roles                           |
| infrastructure/disaster-recovery/       | Disaster recovery configuration         |

## Testing

Backend tests live in `code/backend/tests/`. `test_compliance.py` and `test_security.py` exercise the compliance and security modules directly; they confirm the module logic works, independent of whether those routes are registered in the running API.

| Test File          | Lines |
| ------------------ | ----- |
| test_auth.py       | 560   |
| test_compliance.py | 767   |
| test_portfolio.py  | 592   |
| test_security.py   | 685   |

| Client | Test Type               | Location                       |
| ------ | ----------------------- | ------------------------------ |
| Web    | Unit (Jest)             | web-frontend/**tests**/        |
| Web    | End to end (Playwright) | web-frontend/e2e/basic.spec.js |
| Mobile | Unit (Jest)             | mobile-frontend/**tests**/     |

To run tests:

```bash
# Backend
cd code/backend
pytest

# Web frontend
cd web-frontend
npm test

# Mobile frontend
cd mobile-frontend
npm test
```

Run `pytest --cov` in `code/backend` for a current coverage percentage.

## CI/CD Pipeline

`.github/workflows/cicd.yml` defines three jobs, triggered on push and pull request to `main` and `develop`, and on manual dispatch.

| Job            | What it does                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| code_quality   | Runs autoflake and black --check on Python code, then a global prettier --check (with the Solidity plugin) across JS, TS, JSON, HTML, CSS, Markdown, Solidity, and YAML files |
| backend_tests  | Runs the backend pytest suite and uploads a coverage report artifact                                                                                                          |
| frontend_build | Builds the web frontend and uploads the build artifact                                                                                                                        |

## Documentation

| Document                | Path                    | Description                                     |
| ----------------------- | ----------------------- | ----------------------------------------------- |
| README                  | README.md               | This file                                       |
| API Reference           | docs/API.md             | API endpoint documentation                      |
| CLI Reference           | docs/CLI.md             | Command line usage                              |
| Installation Guide      | docs/INSTALLATION.md    | Environment setup                               |
| User Guide              | docs/USAGE.md           | End user workflows                              |
| Contributing Guidelines | docs/CONTRIBUTING.md    | Contribution process and standards              |
| Architecture Overview   | docs/ARCHITECTURE.md    | System architecture and design                  |
| Configuration Guide     | docs/CONFIGURATION.md   | Configuration options and environment variables |
| Feature Matrix          | docs/FEATURE_MATRIX.md  | Feature coverage                                |
| Troubleshooting         | docs/TROUBLESHOOTING.md | Common issues and fixes                         |

## Contributing

| No. | Action                                                           |
| --- | ---------------------------------------------------------------- |
| 1   | Fork the repository                                              |
| 2   | Create a feature branch (`git checkout -b feature/your-feature`) |
| 3   | Commit your changes (`git commit -m "Add your feature"`)         |
| 4   | Push to the branch (`git push origin feature/your-feature`)      |
| 5   | Open a pull request                                              |

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

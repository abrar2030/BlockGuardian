# Local dev/CI image for the BlockGuardian smart contracts.
#
# This is NOT a production deployment image - contracts are deployed to real
# networks (e.g. Sepolia, mainnet) via `npx hardhat run scripts/deploy.js
# --network <name>` from a developer machine or CI job, not from a running
# container. This image exists purely to run a local Hardhat dev chain (and
# deploy against it) inside docker-compose, so the rest of the stack has
# something real to talk to without anyone installing Node/Hardhat locally.
FROM node:20-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Compile once at build time so `hardhat node` and `hardhat run` don't pay
# the compilation cost on every container start.
RUN npx hardhat compile

EXPOSE 8545

# Default: run a long-running local dev chain, reachable from other
# docker-compose services at http://hardhat-node:8545. The blockchain-deploy
# service overrides this command to deploy against it instead.
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]

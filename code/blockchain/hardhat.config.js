require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ quiet: true });

const { PRIVATE_KEY, INFURA_API_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY } =
  process.env;

const sepoliaUrl =
  SEPOLIA_RPC_URL ||
  (INFURA_API_KEY ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}` : "");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // TokenizedAsset.getAssetDetails() returns 13 values, which triggers a
      // "stack too deep" error under the legacy codegen pipeline. viaIR uses
      // a different (slower to compile, functionally identical) codegen path
      // that doesn't hit this stack limit.
      viaIR: true,
    },
  },

  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },

  networks: {
    hardhat: {},
    // Used by the docker-compose `blockchain-deploy` one-shot service to
    // deploy against the long-running `hardhat-node` service on the same
    // compose network. Deliberately has no configured `accounts`: like
    // Hardhat's own built-in `localhost` network, it relies on the remote
    // node signing for its own well-known local dev accounts, so no
    // private key needs to be baked in for local/docker use.
    docker: {
      url: process.env.BLOCKCHAIN_RPC_URL || "http://hardhat-node:8545",
    },
    // Only configured when the relevant env vars are present so that
    // `hardhat compile`/`hardhat test` work out of the box with no .env file.
    ...(sepoliaUrl && PRIVATE_KEY
      ? {
          sepolia: {
            url: sepoliaUrl,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
};

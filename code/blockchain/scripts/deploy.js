// Deployment + smoke-test script for the BlockGuardian contracts.
//
// Run against the local Hardhat network (no .env needed):
//   npx hardhat run scripts/deploy.js
//
// Run against the docker-compose `hardhat-node` service (used by the
// `blockchain-deploy` service in code/docker-compose.yml):
//   npx hardhat run scripts/deploy.js --network docker
//
// Run against Sepolia testnet (requires PRIVATE_KEY + INFURA_API_KEY or
// SEPOLIA_RPC_URL in a .env file - see .env.example):
//   npx hardhat run scripts/deploy.js --network sepolia
//
// NOTE: Ethereum's Goerli testnet was deprecated and is no longer usable;
// this script (and hardhat.config.js) target Sepolia instead.
//
// In addition to deploying, this script exports each contract's address and
// ABI to <DEPLOYMENTS_DIR>/<network>/<ContractName>.json, plus a combined
// deployment.json summary in the same folder. Other services (e.g. the
// Flask backend's BlockchainService) read these files to know where the
// contracts live and how to call them, without needing Hardhat installed.
const { ethers, network, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Defaults to code/blockchain/deployments when run locally. In
// docker-compose, DEPLOYMENTS_DIR is set to a shared volume mount so other
// services (the backend) can read the same files.
const DEPLOYMENTS_DIR =
  process.env.DEPLOYMENTS_DIR || path.join(__dirname, "..", "deployments");

async function exportDeployment(name, contract) {
  const address = await contract.getAddress();
  const artifact = await artifacts.readArtifact(name);

  const networkDir = path.join(DEPLOYMENTS_DIR, network.name);
  fs.mkdirSync(networkDir, { recursive: true });

  fs.writeFileSync(
    path.join(networkDir, `${name}.json`),
    JSON.stringify({ address, abi: artifact.abi }, null, 2),
  );

  return address;
}

async function main() {
  const [deployerSigner] = await ethers.getSigners();
  const deployer = deployerSigner.address;

  console.log(`Network: ${network.name}`);
  console.log("Deploying contracts with the account:", deployer);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer)).toString(),
  );

  // Deploy TestToken
  console.log("\nDeploying TestToken...");
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy();
  await testToken.waitForDeployment();
  console.log("TestToken deployed to:", await testToken.getAddress());

  // Deploy TokenizedAsset
  console.log("\nDeploying TokenizedAsset...");
  const TokenizedAsset = await ethers.getContractFactory("TokenizedAsset");
  const tokenizedAsset = await TokenizedAsset.deploy(
    "BlockGuardian Apple Stock Token",
    "qAAPL",
    "AAPL",
    "Apple Inc.",
    "stock",
    1000000,
    17500, // $175.00
    "Tokenized representation of Apple Inc. stock",
    "BlockGuardian Capital",
    deployer, // fee collector
  );
  await tokenizedAsset.waitForDeployment();
  console.log("TokenizedAsset deployed to:", await tokenizedAsset.getAddress());

  // Deploy PortfolioManager
  console.log("\nDeploying PortfolioManager...");
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = await PortfolioManager.deploy();
  await portfolioManager.waitForDeployment();
  console.log(
    "PortfolioManager deployed to:",
    await portfolioManager.getAddress(),
  );

  // Deploy TradingPlatform
  console.log("\nDeploying TradingPlatform...");
  const TradingPlatform = await ethers.getContractFactory("TradingPlatform");
  const tradingPlatform = await TradingPlatform.deploy(
    25, // 0.25% trading fee
    deployer, // fee collector
  );
  await tradingPlatform.waitForDeployment();
  console.log(
    "TradingPlatform deployed to:",
    await tradingPlatform.getAddress(),
  );

  // Deploy DeFiIntegration
  console.log("\nDeploying DeFiIntegration...");
  const DeFiIntegration = await ethers.getContractFactory("DeFiIntegration");
  const defiIntegration = await DeFiIntegration.deploy(
    20, // 0.20% platform fee
    deployer, // fee collector
  );
  await defiIntegration.waitForDeployment();
  console.log(
    "DeFiIntegration deployed to:",
    await defiIntegration.getAddress(),
  );

  // --- Smoke-test interactions with the deployed contracts ---
  // Besides validating the deployment, this seeds the local chain with a
  // little real state (a portfolio, a whitelisted token, a strategy) so an
  // "explorer" view reading these contracts has something non-zero to show
  // immediately, rather than an all-empty freshly-deployed state.
  console.log("\nTesting contract interactions...");

  console.log("\nTesting TokenizedAsset...");
  console.log("Setting trading enabled...");
  await (await tokenizedAsset.setTradingEnabled(true)).wait();
  console.log("Updating asset value...");
  await (await tokenizedAsset.updateAssetValue(18000)).wait(); // $180.00
  console.log("Updating performance...");
  await (await tokenizedAsset.updatePerformance(250)).wait(); // 2.5% YTD return

  console.log("\nTesting PortfolioManager...");
  console.log("Creating portfolio...");
  const createPortfolioTx = await portfolioManager.createPortfolio(
    "Growth Portfolio",
    "High-growth technology stocks",
  );
  const createPortfolioReceipt = await createPortfolioTx.wait();
  // ethers v6: parse the raw logs against the contract's ABI to find the event.
  const portfolioCreatedEvent = createPortfolioReceipt.logs
    .map((log) => {
      try {
        return portfolioManager.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "PortfolioCreated");
  const portfolioId = portfolioCreatedEvent.args.portfolioId;
  console.log(`Portfolio created with ID: ${portfolioId}`);

  console.log("Adding asset to portfolio...");
  await (
    await portfolioManager.addAsset(
      portfolioId,
      await tokenizedAsset.getAddress(),
      "qAAPL",
      5000, // 50% allocation
    )
  ).wait();

  console.log("\nTesting TradingPlatform...");
  console.log("Whitelisting token...");
  await (
    await tradingPlatform.whitelistToken(await tokenizedAsset.getAddress())
  ).wait();
  console.log("Enabling trading...");
  await (await tradingPlatform.setTradingEnabled(true)).wait();

  console.log("\nTesting DeFiIntegration...");
  console.log("Creating investment strategy...");
  await (
    await defiIntegration.createStrategy(
      "Staking Strategy",
      "Earn yield by staking tokens",
      deployer, // mock protocol address
      "BlockGuardian Staking",
      await testToken.getAddress(),
      "QNT",
      500, // 5% APY
      2, // risk level 2 (low-moderate)
      2592000, // 30-day lock period
      ethers.parseUnits("100", 18), // 100 tokens minimum
      0, // no maximum
    )
  ).wait();
  console.log("Enabling investments...");
  await (await defiIntegration.setInvestmentsEnabled(true)).wait();

  console.log("\nAll contracts deployed and tested successfully!");

  // --- Export addresses + ABIs for other services (e.g. the backend) ---
  console.log(`\nExporting deployment artifacts to ${DEPLOYMENTS_DIR}...`);
  const addresses = {
    testToken: await exportDeployment("TestToken", testToken),
    tokenizedAsset: await exportDeployment("TokenizedAsset", tokenizedAsset),
    portfolioManager: await exportDeployment(
      "PortfolioManager",
      portfolioManager,
    ),
    tradingPlatform: await exportDeployment("TradingPlatform", tradingPlatform),
    defiIntegration: await exportDeployment("DeFiIntegration", defiIntegration),
  };

  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    ...addresses,
    deployer,
    timestamp: new Date().toISOString(),
  };

  const networkDir = path.join(DEPLOYMENTS_DIR, network.name);
  fs.mkdirSync(networkDir, { recursive: true });
  const summaryFile = path.join(networkDir, "deployment.json");
  fs.writeFileSync(summaryFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment summary saved to ${summaryFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

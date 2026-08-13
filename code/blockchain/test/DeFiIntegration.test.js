const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_DAY = 24 * 60 * 60;

describe("DeFiIntegration", function () {
  let defi, token, owner, feeCollector, alice;
  let strategyId;

  beforeEach(async function () {
    [owner, feeCollector, alice] = await ethers.getSigners();

    const DeFiIntegration = await ethers.getContractFactory("DeFiIntegration");
    defi = await DeFiIntegration.deploy(20, feeCollector.address); // 0.20%
    await defi.waitForDeployment();

    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy();
    await token.waitForDeployment();

    await token.transfer(alice.address, ethers.parseUnits("10000", 18));
    await token
      .connect(alice)
      .approve(await defi.getAddress(), ethers.parseUnits("10000", 18));

    const tx = await defi.createStrategy(
      "Staking Strategy",
      "Earn yield by staking tokens",
      owner.address, // mock protocol address
      "BlockGuardian Staking",
      await token.getAddress(),
      "QNT",
      500, // 5% APY
      2, // risk level
      30 * ONE_DAY, // lock period
      ethers.parseUnits("100", 18), // min investment
      0, // no max
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return defi.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "StrategyCreated");
    strategyId = event.args.strategyId;

    await defi.setInvestmentsEnabled(true);
  });

  describe("strategy management", function () {
    it("rejects an invalid risk level", async function () {
      await expect(
        defi.createStrategy(
          "Bad",
          "desc",
          owner.address,
          "Proto",
          await token.getAddress(),
          "QNT",
          100,
          6, // invalid: must be 1-5
          0,
          0,
          0,
        ),
      ).to.be.revertedWith("Invalid risk level (1-5)");
    });

    it("only the owner can create strategies", async function () {
      await expect(
        defi
          .connect(alice)
          .createStrategy(
            "Bad",
            "desc",
            owner.address,
            "Proto",
            await token.getAddress(),
            "QNT",
            100,
            1,
            0,
            0,
            0,
          ),
      ).to.be.revertedWithCustomError(defi, "OwnableUnauthorizedAccount");
    });

    it("deactivates a strategy", async function () {
      await expect(defi.deactivateStrategy(strategyId))
        .to.emit(defi, "StrategyDeactivated")
        .withArgs(strategyId);

      const strategy = await defi.strategies(strategyId);
      expect(strategy.isActive).to.equal(false);
    });
  });

  describe("aggregate counters", function () {
    it("totalStrategies and totalInvestments reflect activity", async function () {
      expect(await defi.totalStrategies()).to.equal(1); // created in beforeEach
      expect(await defi.totalInvestments()).to.equal(0);

      await defi
        .connect(alice)
        .createInvestment(strategyId, ethers.parseUnits("1000", 18));
      expect(await defi.totalInvestments()).to.equal(1);
    });
  });

  describe("investments", function () {
    it("rejects investments below the strategy minimum", async function () {
      await expect(
        defi
          .connect(alice)
          .createInvestment(strategyId, ethers.parseUnits("10", 18)),
      ).to.be.revertedWith("Amount below minimum investment");
    });

    it("creates an investment, deducting the platform fee", async function () {
      const amount = ethers.parseUnits("1000", 18);
      const expectedFee = (amount * 20n) / 10000n;
      const expectedNet = amount - expectedFee;

      await expect(defi.connect(alice).createInvestment(strategyId, amount))
        .to.emit(defi, "InvestmentCreated")
        .withArgs(1, alice.address, strategyId, expectedNet);

      expect(await token.balanceOf(feeCollector.address)).to.equal(expectedFee);
      expect(await token.balanceOf(await defi.getAddress())).to.equal(
        expectedNet,
      );

      const [investmentId] = await defi.getUserInvestments(alice.address);
      const investment = await defi.investments(investmentId);
      expect(investment.amount).to.equal(expectedNet);
      expect(investment.initialValue).to.equal(expectedNet);
    });

    it("rejects investing while investments are disabled", async function () {
      await defi.setInvestmentsEnabled(false);
      await expect(
        defi
          .connect(alice)
          .createInvestment(strategyId, ethers.parseUnits("1000", 18)),
      ).to.be.revertedWith("Investments not enabled by platform");
    });
  });

  describe("yield and closing", function () {
    let investmentId, netAmount;

    beforeEach(async function () {
      const amount = ethers.parseUnits("1000", 18);
      const fee = (amount * 20n) / 10000n;
      netAmount = amount - fee;

      await defi.connect(alice).createInvestment(strategyId, amount);
      [investmentId] = await defi.getUserInvestments(alice.address);

      // Fund the contract so it can actually pay out value increases -
      // updateInvestmentValue only updates bookkeeping; real token movement
      // still requires the contract to hold enough balance.
      await token.transfer(
        await defi.getAddress(),
        ethers.parseUnits("500", 18),
      );
    });

    it("rejects claiming yield when there is no profit yet", async function () {
      await expect(
        defi.connect(alice).claimYield(investmentId),
      ).to.be.revertedWith("No yield available to claim");
    });

    it("lets the investor claim yield once currentValue increases", async function () {
      const grownValue = netAmount + ethers.parseUnits("50", 18);
      await defi.updateInvestmentValue(investmentId, grownValue);

      const before = await token.balanceOf(alice.address);
      await expect(defi.connect(alice).claimYield(investmentId)).to.emit(
        defi,
        "YieldClaimed",
      );
      const after = await token.balanceOf(alice.address);

      expect(after - before).to.equal(ethers.parseUnits("50", 18));
    });

    it("blocks closing before the lock period elapses", async function () {
      await expect(
        defi.connect(alice).closeInvestment(investmentId),
      ).to.be.revertedWith("Investment is still locked");
    });

    it("allows closing after the lock period and returns currentValue", async function () {
      await time.increase(30 * ONE_DAY + 1);

      const before = await token.balanceOf(alice.address);
      await expect(defi.connect(alice).closeInvestment(investmentId)).to.emit(
        defi,
        "InvestmentClosed",
      );
      const after = await token.balanceOf(alice.address);

      expect(after - before).to.equal(netAmount);

      const investment = await defi.investments(investmentId);
      expect(investment.isActive).to.equal(false);
    });

    it("only the investor can close their investment", async function () {
      await time.increase(30 * ONE_DAY + 1);
      await expect(defi.closeInvestment(investmentId)).to.be.revertedWith(
        "Not the investor",
      );
    });
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradingPlatform", function () {
  let platform, token, owner, feeCollector, alice, bob;

  beforeEach(async function () {
    [owner, feeCollector, alice, bob] = await ethers.getSigners();

    const TradingPlatform = await ethers.getContractFactory("TradingPlatform");
    platform = await TradingPlatform.deploy(25, feeCollector.address);
    await platform.waitForDeployment();

    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy();
    await token.waitForDeployment();

    // Fund alice (seller) with tokens and approve the platform to move them.
    await token.transfer(alice.address, ethers.parseUnits("1000", 18));
    await token
      .connect(alice)
      .approve(await platform.getAddress(), ethers.parseUnits("1000", 18));

    await platform.whitelistToken(await token.getAddress());
    await platform.setTradingEnabled(true);
  });

  describe("deployment", function () {
    it("rejects a fee above 1%", async function () {
      const TradingPlatform =
        await ethers.getContractFactory("TradingPlatform");
      await expect(
        TradingPlatform.deploy(101, feeCollector.address),
      ).to.be.revertedWith("Fee too high (Max 1%)");
    });

    it("rejects a zero fee collector", async function () {
      const TradingPlatform =
        await ethers.getContractFactory("TradingPlatform");
      await expect(
        TradingPlatform.deploy(25, ethers.ZeroAddress),
      ).to.be.revertedWith("Invalid fee collector");
    });
  });

  describe("order creation", function () {
    it("rejects orders for non-whitelisted tokens", async function () {
      const TestToken = await ethers.getContractFactory("TestToken");
      const other = await TestToken.deploy();
      await other.waitForDeployment();

      await expect(
        platform
          .connect(alice)
          .createOrder(await other.getAddress(), 10, 100, false),
      ).to.be.revertedWith("Token not whitelisted");
    });

    it("rejects sell orders without sufficient allowance", async function () {
      await token.connect(bob).approve(await platform.getAddress(), 0);
      await expect(
        platform
          .connect(bob)
          .createOrder(await token.getAddress(), 10, 100, false),
      ).to.be.revertedWith("Insufficient token allowance for sell order");
    });

    it("creates a standalone sell order that stays open with no match", async function () {
      await expect(
        platform
          .connect(alice)
          .createOrder(
            await token.getAddress(),
            ethers.parseUnits("10", 18),
            100,
            false,
          ),
      ).to.emit(platform, "OrderCreated");

      const [orderId] = await platform.getUserSellOrders(alice.address);
      const order = await platform.orders(orderId);
      expect(order.isActive).to.equal(true);
      expect(order.amount).to.equal(ethers.parseUnits("10", 18));
    });
  });

  describe("matching", function () {
    it("matches a buy order against an existing sell order and executes a trade", async function () {
      const amount = ethers.parseUnits("10", 18);

      // Alice lists a sell order at price 100.
      await platform
        .connect(alice)
        .createOrder(await token.getAddress(), amount, 100, false);

      // Bob's buy order at price >= 100 should match immediately.
      await expect(
        platform
          .connect(bob)
          .createOrder(await token.getAddress(), amount, 100, true),
      ).to.emit(platform, "TradeExecuted");

      // Asset token moved from seller to buyer.
      expect(await token.balanceOf(bob.address)).to.equal(amount);

      const [tradeId] = await platform.getUserTrades(bob.address);
      const trade = await platform.trades(tradeId);
      expect(trade.buyer).to.equal(bob.address);
      expect(trade.seller).to.equal(alice.address);
      expect(trade.amount).to.equal(amount);
    });

    it("partially fills the larger order and leaves a remainder open", async function () {
      const sellAmount = ethers.parseUnits("10", 18);
      const buyAmount = ethers.parseUnits("4", 18);

      await platform
        .connect(alice)
        .createOrder(await token.getAddress(), sellAmount, 100, false);
      await platform
        .connect(bob)
        .createOrder(await token.getAddress(), buyAmount, 100, true);

      const [sellOrderId] = await platform.getUserSellOrders(alice.address);
      const sellOrder = await platform.orders(sellOrderId);

      expect(sellOrder.isActive).to.equal(true);
      expect(sellOrder.amount).to.equal(sellAmount - buyAmount);
    });

    it("does not match orders for different tokens", async function () {
      const TestToken = await ethers.getContractFactory("TestToken");
      const otherToken = await TestToken.deploy();
      await otherToken.waitForDeployment();
      await platform.whitelistToken(await otherToken.getAddress());
      await otherToken.transfer(alice.address, ethers.parseUnits("10", 18));
      await otherToken
        .connect(alice)
        .approve(await platform.getAddress(), ethers.parseUnits("10", 18));

      await platform
        .connect(alice)
        .createOrder(
          await otherToken.getAddress(),
          ethers.parseUnits("10", 18),
          100,
          false,
        );

      await platform
        .connect(bob)
        .createOrder(
          await token.getAddress(),
          ethers.parseUnits("10", 18),
          100,
          true,
        );

      const [buyOrderId] = await platform.getUserBuyOrders(bob.address);
      const buyOrder = await platform.orders(buyOrderId);
      expect(buyOrder.isActive).to.equal(true); // unmatched, still open
    });
  });

  describe("order cancellation", function () {
    it("lets the maker cancel their own open order", async function () {
      await platform
        .connect(alice)
        .createOrder(
          await token.getAddress(),
          ethers.parseUnits("10", 18),
          100,
          false,
        );
      const [orderId] = await platform.getUserSellOrders(alice.address);

      await expect(platform.connect(alice).cancelOrder(orderId))
        .to.emit(platform, "OrderCancelled")
        .withArgs(orderId);

      expect((await platform.orders(orderId)).isActive).to.equal(false);
    });

    it("rejects cancellation by a non-maker", async function () {
      await platform
        .connect(alice)
        .createOrder(
          await token.getAddress(),
          ethers.parseUnits("10", 18),
          100,
          false,
        );
      const [orderId] = await platform.getUserSellOrders(alice.address);

      await expect(
        platform.connect(bob).cancelOrder(orderId),
      ).to.be.revertedWith("Not order maker");
    });
  });

  describe("aggregate counters", function () {
    it("totalOrders and totalTrades reflect activity", async function () {
      expect(await platform.totalOrders()).to.equal(0);
      expect(await platform.totalTrades()).to.equal(0);

      const amount = ethers.parseUnits("10", 18);
      await platform
        .connect(alice)
        .createOrder(await token.getAddress(), amount, 100, false);
      expect(await platform.totalOrders()).to.equal(1);

      await platform
        .connect(bob)
        .createOrder(await token.getAddress(), amount, 100, true);
      expect(await platform.totalOrders()).to.equal(2);
      expect(await platform.totalTrades()).to.equal(1);
    });
  });

  describe("admin controls", function () {
    it("restricts whitelisting to the owner", async function () {
      await expect(
        platform.connect(alice).whitelistToken(await token.getAddress()),
      ).to.be.revertedWithCustomError(platform, "OwnableUnauthorizedAccount");
    });

    it("restricts setTradingFee to the owner and enforces the cap", async function () {
      await expect(
        platform.connect(alice).setTradingFee(50),
      ).to.be.revertedWithCustomError(platform, "OwnableUnauthorizedAccount");
      await expect(platform.setTradingFee(101)).to.be.revertedWith(
        "Fee too high (Max 1%)",
      );
    });
  });
});

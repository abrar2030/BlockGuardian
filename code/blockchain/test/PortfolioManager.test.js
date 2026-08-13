const { expect } = require("chai");
const { ethers } = require("hardhat");

async function createPortfolio(manager, name = "Growth", desc = "desc") {
  const tx = await manager.createPortfolio(name, desc);
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((log) => {
      try {
        return manager.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "PortfolioCreated");
  return event.args.portfolioId;
}

describe("PortfolioManager", function () {
  let manager, admin, alice, bob, carol;
  let tokenA;

  beforeEach(async function () {
    [admin, alice, bob, carol] = await ethers.getSigners();

    const PortfolioManager =
      await ethers.getContractFactory("PortfolioManager");
    manager = await PortfolioManager.deploy();
    await manager.waitForDeployment();

    const TestToken = await ethers.getContractFactory("TestToken");
    tokenA = await TestToken.deploy();
    await tokenA.waitForDeployment();
  });

  it("lets any user create a portfolio they own", async function () {
    const portfolioId = await createPortfolio(manager.connect(alice));
    const portfolio = await manager.portfolios(portfolioId);
    expect(portfolio.owner).to.equal(alice.address);
    expect(portfolio.isActive).to.equal(true);
  });

  it("totalPortfolios reflects how many portfolios have been created", async function () {
    expect(await manager.totalPortfolios()).to.equal(0);
    await createPortfolio(manager.connect(alice));
    await createPortfolio(manager.connect(bob));
    expect(await manager.totalPortfolios()).to.equal(2);
  });

  describe("access control regression: portfolio owner, not contract admin", function () {
    // These are regression tests for a bug where addManager / removeManager /
    // deactivatePortfolio / reactivatePortfolio were gated with `onlyOwner`
    // (the contract's single Ownable admin) in addition to a portfolio-owner
    // check, which made them uncallable by ordinary users who own portfolios.
    let portfolioId;

    beforeEach(async function () {
      portfolioId = await createPortfolio(manager.connect(alice));
    });

    it("lets the portfolio owner (not the contract admin) add a manager", async function () {
      expect(admin.address).to.not.equal(alice.address);

      await expect(manager.connect(alice).addManager(portfolioId, bob.address))
        .to.emit(manager, "ManagerAdded")
        .withArgs(portfolioId, bob.address);

      expect(
        await manager.isPortfolioManager(portfolioId, bob.address),
      ).to.equal(true);
    });

    it("rejects addManager from someone who is neither the contract admin nor the portfolio owner", async function () {
      await expect(
        manager.connect(carol).addManager(portfolioId, bob.address),
      ).to.be.revertedWith("Not portfolio owner");
    });

    it("lets the portfolio owner remove a manager", async function () {
      await manager.connect(alice).addManager(portfolioId, bob.address);
      await expect(
        manager.connect(alice).removeManager(portfolioId, bob.address),
      )
        .to.emit(manager, "ManagerRemoved")
        .withArgs(portfolioId, bob.address);

      expect(
        await manager.isPortfolioManager(portfolioId, bob.address),
      ).to.equal(false);
    });

    it("lets the portfolio owner deactivate and reactivate their own portfolio", async function () {
      await manager.connect(alice).deactivatePortfolio(portfolioId);
      expect((await manager.portfolios(portfolioId)).isActive).to.equal(false);

      await manager.connect(alice).reactivatePortfolio(portfolioId);
      expect((await manager.portfolios(portfolioId)).isActive).to.equal(true);
    });

    it("the contract admin cannot deactivate a portfolio they don't own", async function () {
      await expect(manager.deactivatePortfolio(portfolioId)).to.be.revertedWith(
        "Not portfolio owner",
      );
    });
  });

  describe("assets and allocation", function () {
    let portfolioId;

    beforeEach(async function () {
      portfolioId = await createPortfolio(manager.connect(alice));
    });

    it("adds an asset with a target allocation", async function () {
      await expect(
        manager
          .connect(alice)
          .addAsset(portfolioId, await tokenA.getAddress(), "QNT", 5000),
      )
        .to.emit(manager, "AssetAdded")
        .withArgs(portfolioId, await tokenA.getAddress(), "QNT", 5000);

      const assets = await manager.getPortfolioAssets(portfolioId);
      expect(assets).to.deep.equal([await tokenA.getAddress()]);
    });

    it("rejects a manager assignment path: authorized managers can add assets", async function () {
      await manager.connect(alice).addManager(portfolioId, bob.address);
      await expect(
        manager
          .connect(bob)
          .addAsset(portfolioId, await tokenA.getAddress(), "QNT", 3000),
      ).to.not.be.reverted;
    });

    it("rejects an unauthorized user adding an asset", async function () {
      await expect(
        manager
          .connect(bob)
          .addAsset(portfolioId, await tokenA.getAddress(), "QNT", 3000),
      ).to.be.revertedWith("Not authorized");
    });

    it("rejects total target allocation above 100%", async function () {
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenB = await TestToken.deploy();
      await tokenB.waitForDeployment();

      await manager
        .connect(alice)
        .addAsset(portfolioId, await tokenA.getAddress(), "A", 6000);

      await expect(
        manager
          .connect(alice)
          .addAsset(portfolioId, await tokenB.getAddress(), "B", 5000),
      ).to.be.revertedWith("Total target allocation exceeds 100%");
    });

    it("lets the contract admin (trusted keeper) update current allocation", async function () {
      await manager
        .connect(alice)
        .addAsset(portfolioId, await tokenA.getAddress(), "A", 5000);

      await expect(
        manager.updateCurrentAllocation(
          portfolioId,
          [await tokenA.getAddress()],
          [4800],
        ),
      ).to.not.be.reverted;
    });

    it("rejects a non-admin trying to update current allocation", async function () {
      await manager
        .connect(alice)
        .addAsset(portfolioId, await tokenA.getAddress(), "A", 5000);

      await expect(
        manager
          .connect(alice)
          .updateCurrentAllocation(
            portfolioId,
            [await tokenA.getAddress()],
            [4800],
          ),
      ).to.be.revertedWithCustomError(manager, "OwnableUnauthorizedAccount");
    });
  });

  describe("transactions", function () {
    it("records a manual transaction and paginates history", async function () {
      const portfolioId = await createPortfolio(manager.connect(alice));

      await manager
        .connect(alice)
        .recordTransaction(
          portfolioId,
          await tokenA.getAddress(),
          "QNT",
          100,
          1000,
          true,
          "manual",
        );

      expect(await manager.getPortfolioTransactionCount(portfolioId)).to.equal(
        1,
      );

      const txs = await manager.getPortfolioTransactions(portfolioId, 0, 10);
      expect(txs.length).to.equal(1);
      expect(txs[0].symbol).to.equal("QNT");
    });
  });
});

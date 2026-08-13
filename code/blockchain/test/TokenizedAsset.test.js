const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("TokenizedAsset", function () {
  let asset, owner, feeCollector, alice, bob;
  const INITIAL_SUPPLY = 1_000_000n;

  beforeEach(async function () {
    [owner, feeCollector, alice, bob] = await ethers.getSigners();
    const TokenizedAsset = await ethers.getContractFactory("TokenizedAsset");
    asset = await TokenizedAsset.deploy(
      "BlockGuardian Apple Stock Token",
      "qAAPL",
      "AAPL",
      "Apple Inc.",
      "stock",
      INITIAL_SUPPLY,
      17500, // $175.00
      "Tokenized representation of Apple Inc. stock",
      "BlockGuardian Capital",
      feeCollector.address,
    );
    await asset.waitForDeployment();
  });

  describe("deployment", function () {
    it("mints the initial supply to the deployer regardless of tradingEnabled", async function () {
      // Regression test: OZ v5's ERC20._update hook must bypass the
      // trading-enabled check for mints, otherwise the constructor mint
      // itself would revert since tradingEnabled defaults to false.
      const expectedSupply = INITIAL_SUPPLY * 10n ** 18n;
      expect(await asset.totalSupply()).to.equal(expectedSupply);
      expect(await asset.balanceOf(owner.address)).to.equal(expectedSupply);
    });

    it("sets asset metadata and defaults", async function () {
      expect(await asset.assetSymbol()).to.equal("AAPL");
      expect(await asset.assetValue()).to.equal(17500);
      expect(await asset.tradingEnabled()).to.equal(false);
      expect(await asset.tradingFee()).to.equal(25);
      expect(await asset.feeCollector()).to.equal(feeCollector.address);
    });

    it("rejects a zero fee collector", async function () {
      const TokenizedAsset = await ethers.getContractFactory("TokenizedAsset");
      await expect(
        TokenizedAsset.deploy(
          "N",
          "S",
          "AAPL",
          "Apple Inc.",
          "stock",
          1,
          1,
          "d",
          "i",
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith("Invalid fee collector");
    });
  });

  describe("trading gate", function () {
    it("blocks ordinary transfers while trading is disabled", async function () {
      await asset.transfer(alice.address, ethers.parseUnits("100", 18));
      await expect(
        asset.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18)),
      ).to.be.revertedWith("Trading is currently disabled for this asset");
    });

    it("still allows the owner to move tokens while trading is disabled", async function () {
      await expect(asset.transfer(alice.address, ethers.parseUnits("50", 18)))
        .to.not.be.reverted;
    });

    it("allows transfers once trading is enabled, applying the fee", async function () {
      await asset.setTradingEnabled(true);
      await asset.transfer(alice.address, ethers.parseUnits("1000", 18));

      const sendAmount = ethers.parseUnits("100", 18);
      const expectedFee = (sendAmount * 25n) / 10000n;
      const expectedNet = sendAmount - expectedFee;

      await asset.connect(alice).transfer(bob.address, sendAmount);

      expect(await asset.balanceOf(bob.address)).to.equal(expectedNet);
      expect(await asset.balanceOf(feeCollector.address)).to.equal(expectedFee);
    });

    it("only the owner can toggle trading", async function () {
      await expect(
        asset.connect(alice).setTradingEnabled(true),
      ).to.be.revertedWithCustomError(asset, "OwnableUnauthorizedAccount");
    });
  });

  describe("owner administration", function () {
    it("updates asset value and emits AssetRevalued", async function () {
      await expect(asset.updateAssetValue(18000))
        .to.emit(asset, "AssetRevalued")
        .withArgs(17500, 18000, anyValue);
      expect(await asset.assetValue()).to.equal(18000);
    });

    it("rejects a zero asset value", async function () {
      await expect(asset.updateAssetValue(0)).to.be.revertedWith(
        "Asset value must be positive",
      );
    });

    it("caps the trading fee at 500 basis points", async function () {
      await expect(asset.setTradingFee(501)).to.be.revertedWith(
        "Fee too high (Max 5%)",
      );
      await expect(asset.setTradingFee(500)).to.not.be.reverted;
    });

    it("allows the owner to mint and any holder to burn", async function () {
      await asset.mint(alice.address, ethers.parseUnits("10", 18));
      expect(await asset.balanceOf(alice.address)).to.equal(
        ethers.parseUnits("10", 18),
      );

      await asset.connect(alice).burn(ethers.parseUnits("4", 18));
      expect(await asset.balanceOf(alice.address)).to.equal(
        ethers.parseUnits("6", 18),
      );
    });
  });
});

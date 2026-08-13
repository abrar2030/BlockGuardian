const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TestToken", function () {
  let testToken, owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy();
    await testToken.waitForDeployment();
  });

  it("sets name, symbol and mints the initial supply to the deployer", async function () {
    expect(await testToken.name()).to.equal("BlockGuardian Test Token");
    expect(await testToken.symbol()).to.equal("QNT");

    const expectedSupply = ethers.parseUnits("1000000", 18);
    expect(await testToken.totalSupply()).to.equal(expectedSupply);
    expect(await testToken.balanceOf(owner.address)).to.equal(expectedSupply);
  });

  it("sets the deployer as owner", async function () {
    expect(await testToken.owner()).to.equal(owner.address);
  });

  it("allows the owner to mint new tokens", async function () {
    const amount = ethers.parseUnits("500", 18);
    await expect(testToken.mint(alice.address, amount))
      .to.emit(testToken, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, amount);

    expect(await testToken.balanceOf(alice.address)).to.equal(amount);
  });

  it("reverts when a non-owner tries to mint", async function () {
    const amount = ethers.parseUnits("1", 18);
    await expect(
      testToken.connect(alice).mint(alice.address, amount),
    ).to.be.revertedWithCustomError(testToken, "OwnableUnauthorizedAccount");
  });

  it("allows any holder to burn their own tokens", async function () {
    const amount = ethers.parseUnits("100", 18);
    await testToken.transfer(bob.address, amount);

    await expect(testToken.connect(bob).burn(amount))
      .to.emit(testToken, "Transfer")
      .withArgs(bob.address, ethers.ZeroAddress, amount);

    expect(await testToken.balanceOf(bob.address)).to.equal(0);
  });

  it("reverts burn when balance is insufficient", async function () {
    const amount = ethers.parseUnits("1", 18);
    await expect(testToken.connect(bob).burn(amount)).to.be.reverted;
  });
});

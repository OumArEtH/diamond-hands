const { expect } = require("chai")
const { ethers } = require("hardhat")

const toWei = (ether) => ethers.utils.parseEther(ether)
const fromWei = (number) => ethers.utils.formatEther(number)

const ONE_ETH = "1.0"
const TWO_ETH = "2.0"
const TWO_YEARS = 63073000
const EVM_DEPOSIT_ERROR = "You can only deposit non-zero amounts"
const EVM_WITHDRAWAL_ERROR_EARLY = "Not allowed yet! You need diamond hands my friend"
const EVM_WITHDRAWAL_ERROR_NO_FUNDS = "You never deposited funds here!"

describe("Deposit", () => {
  let diamondHands
  let deployer

  beforeEach(async () => {
    const [signer] = await ethers.getSigners()
    deployer = signer

    const DiamondHands = await ethers.getContractFactory("DiamondHands")
    diamondHands = await DiamondHands.deploy()
    await diamondHands.deployed()
  })

  it("User should be able to successfully deposit ETH", async () => {
    await diamondHands.depositEth({value: toWei(ONE_ETH)})

    let balance = await diamondHands.balances(deployer.address)
    expect(fromWei(balance.toString())).to.equal(ONE_ETH)

    let timeLock = await diamondHands.timeLock(deployer.address)
    let diamondHandsExpiry = new Date(timeLock.toNumber() * 1000).toLocaleDateString()
    let dateInTwoYears = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toLocaleDateString()
    expect(diamondHandsExpiry).to.equal(dateInTwoYears)

    //deposit again
    await diamondHands.depositEth({value: toWei(ONE_ETH)})
    balance = await diamondHands.balances(deployer.address)
    expect(fromWei(balance.toString())).to.equal(TWO_ETH)

    timeLock = await diamondHands.timeLock(deployer.address)
    diamondHandsExpiry = new Date(timeLock.toNumber() * 1000).toLocaleDateString()
    dateInTwoYears = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toLocaleDateString()
    expect(diamondHandsExpiry).to.equal(dateInTwoYears)
  })

  it("User should only be allowed to deposit amounts greater than zero", async () => {
    await expect(diamondHands.depositEth()).to.be.revertedWith(EVM_DEPOSIT_ERROR)
  })

  it("Successful deposit should emit Deposit event", async () => {
    const deposit = await diamondHands.depositEth({value: toWei(ONE_ETH)})
    const timeLock = await diamondHands.timeLock(deployer.address)

    await expect(deposit)
    .to.emit(diamondHands, 'Deposit')
    .withArgs(deployer.address, toWei(ONE_ETH), timeLock)
  })
})

describe("Withdrawal", () => {
  let diamondHands
  let deployer
  let user

  beforeEach(async () => {
    const [signer, _user] = await ethers.getSigners()
    deployer = signer
    user = _user

    const DiamondHands = await ethers.getContractFactory("DiamondHands")
    diamondHands = await DiamondHands.deploy()
    await diamondHands.deployed()
    await diamondHands.connect(deployer).depositEth({value: toWei(ONE_ETH)})
  })

  it("User should be able to successfully withdraw his ETH after 2 years", async () => {
    // check successful deposit
    let timeLock = await diamondHands.timeLock(deployer.address)
    const diamondHandsExpiry = new Date(timeLock.toNumber() * 1000).toLocaleDateString()
    const dateInTwoYears = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toLocaleDateString()
    expect(diamondHandsExpiry).to.equal(dateInTwoYears)

    let balance = await diamondHands.balances(deployer.address)
    expect(fromWei(balance.toString())).to.equal(ONE_ETH)

    // move to the future
    await ethers.provider.send('evm_increaseTime', [TWO_YEARS]);
    await ethers.provider.send('evm_mine');

    // withdraw funds
    await diamondHands.connect(deployer).withdraw()

    timeLock = await diamondHands.timeLock(deployer.address)
    balance = await diamondHands.balances(deployer.address)
    expect(timeLock).to.equal(0)
    expect(balance).to.equal(0)
  })

  it("User cannot withdraw ETH earlier than 2 years", async () => {
    await expect(diamondHands.withdraw()).to.be.revertedWith(EVM_WITHDRAWAL_ERROR_EARLY)
  })

  it("User without deposit can't withdraw any funds", async () => {
    await expect(diamondHands.connect(user).withdraw()).to.be.revertedWith(EVM_WITHDRAWAL_ERROR_NO_FUNDS)
  })

  it("Successful withdrawal should emit Withdraw event", async () => {
    // move to the future
    await ethers.provider.send('evm_increaseTime', [TWO_YEARS]);
    await ethers.provider.send('evm_mine');
    
    await expect(diamondHands.withdraw())
    .to.emit(diamondHands, 'Withdraw')
    .withArgs(deployer.address, toWei(ONE_ETH))
  })
})

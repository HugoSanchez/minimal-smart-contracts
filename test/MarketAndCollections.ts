import { expect } from "chai";
// @ts-ignore
import { ethers, upgrades } from "hardhat";

describe("MinimalMarket and MinimalCollection", function () {
	let MinimalMarket, MinimalCollection, URIEncoding;
	let market: any, collection: any, uriEncoding: any;
	let owner: any, user1: any, user2: any, feeDestination: any, referer: any;
	let provider: any;

	const MODERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MODERATOR_ROLE"));

	beforeEach(async function () {
		[owner, user1, user2, feeDestination, referer] = await ethers.getSigners();
		provider = ethers.provider;

		// Deploy URIEncoding library
		URIEncoding = await ethers.getContractFactory("URIEncoding");
		uriEncoding = await URIEncoding.deploy();
		await uriEncoding.deployed();

		// Deploy MinimalMarket
		MinimalMarket = await ethers.getContractFactory("MinimalMarket");
		market = await MinimalMarket.deploy();
		await market.deployed();
		await market.initialize(owner.address, feeDestination.address);

    	// Deploy MinimalCollection implementation with library linking
		MinimalCollection = await ethers.getContractFactory("MinimalCollection", {
			libraries: {
				URIEncoding: uriEncoding.address,
			},
		});
		collection = await MinimalCollection.deploy();
		await collection.deployed();
		await collection.initialize('test', 'test.url', owner.address);
  	});

	describe("Deployment", function () {
		it("Should set the right owner for MinimalMarket", async function () {
		expect(await market.owner()).to.equal(owner.address);
		});

		it("Should set the right owner for MinimalCollection", async function () {
		expect(await collection.hasRole(MODERATOR_ROLE, owner.address)).to.be.true;
		});

		it("Should set the correct fee destination for MinimalMarket", async function () {
		// Assuming there's a getter for fee destination
		expect(await market.protocolFeeDestination()).to.equal(feeDestination.address);
		});
	});

	describe("MinimalCollection - Create", function () {
		it("Should allow moderator to create a post", async function () {
			await expect(collection.create("Test Post", "Content", user1.address, false))
				.to.emit(collection, "NewVersoCreated")

			await collection.create("Test Post 2", "Content", user1.address, false);
			await expect(await collection.titles(1)).to.equal("Test Post");
			await expect(await collection.titles(2)).to.equal("Test Post 2");
		});

		it("Should not allow non-moderators to create a post", async function () {
			await expect(collection.connect(user1).create("Test Post", "Content", user1.address, false))
				.to.be.revertedWith("Only moderators allowed");
		});
	});

	describe("MinimalCollection - Collect", function () {
		beforeEach(async function () {
			await collection.create("Test Post", "Content", owner.address, false);
		});

		it("Should allow anyone to collect a post", async function () {
			// Parse token price
			const tokenPrice = ethers.utils.parseEther("0.00043");
			// Estimate gas cost
			const estimatedGas = await collection.estimateGas.collect(1, 1, user1.address, referer.address, market.address, { value: tokenPrice });
			// Add some buffer to the estimated gas (e.g., 20% more)
			const gasLimit = estimatedGas.mul(120).div(100);
			// Get current gas price
			const gasPrice = await ethers.provider.getGasPrice();
			// Calculate total transaction cost (token price + gas cost)
			const totalCost = tokenPrice.add(gasLimit.mul(gasPrice));
			// Execute the collect transaction
			const collectTx = await collection.connect(user1).collect(1, 1, user1.address, referer.address, market.address, {
				value: totalCost,
				gasLimit: gasLimit
			  });
			// Check if the transaction was successful
			await expect(collectTx).to.emit(collection, "NewVersoCollected").withArgs(user1.address, 1, 1);
		});

		it("Should execute distribute funds properly when collecting", async function () {
			// Balances
			const initialCreatorBalance = await owner.getBalance();
			const initialFeeDestinationBalance = await feeDestination.getBalance();
			const initialRefererBalance = await referer.getBalance();

			// Parse token price
			const tokenPrice = ethers.utils.parseEther("0.00043");
			// Estimate gas cost
			const estimatedGas = await collection.estimateGas.collect(1, 1, user1.address, referer.address, market.address, { value: tokenPrice });
			// Add some buffer to the estimated gas (e.g., 20% more)
			const gasLimit = estimatedGas.mul(120).div(100);
			// Get current gas price
			const gasPrice = await ethers.provider.getGasPrice();
			// Calculate total transaction cost (token price + gas cost)
			const totalCost = tokenPrice.add(gasLimit.mul(gasPrice));
			// Execute the collect transaction
			await collection.connect(user1).collect(1, 1, user1.address, referer.address, market.address, {
				value: totalCost,
				gasLimit: gasLimit
			});

			const protocolFee = parseInt(ethers.utils.parseEther("0.00042").toString()) / 10;
			const refererFee = parseInt(ethers.utils.parseEther("0.00042").toString()) / 10;
			const creatorFee = parseInt(ethers.utils.parseEther("0.00042").toString()) - protocolFee - refererFee;

			expect(await owner.getBalance()).to.be.closeTo(initialCreatorBalance.add(creatorFee), ethers.utils.parseEther("0.0001"));
			expect(await feeDestination.getBalance()).to.equal(initialFeeDestinationBalance.add(protocolFee));
			expect(await referer.getBalance()).to.equal(initialRefererBalance.add(refererFee));
		});
	});

	describe("MinimalCollection - Burn", function () {

		beforeEach(async function () {
			await collection.create("Test Post", "Content", owner.address, false);
			await collection.connect(user1).collect(1, 1, user1.address, referer.address, market.address, { value: ethers.utils.parseEther("0.00043") });
		});

		it("Should allow users to burn their own tokens", async function () {
			await expect(collection.connect(user1).burn(1, 1))
				.to.emit(collection, "TransferSingle")
				.withArgs(user1.address, user1.address, ethers.constants.AddressZero, 1, 1);
		});

		it("Should not allow users to burn others' tokens", async function () {
		await expect(collection.connect(user2).burn(1, 1))
			.to.be.reverted;
		});
	});

	describe("MinimalCollection - Content Update", function () {
		beforeEach(async function () {
			await collection.create("Test Post", "Initial Content", owner.address, false);
		});

		it("Should allow creator to update content within 48 hours", async function () {
			await collection.create("Test Post", "Initial Content", owner.address, false);
			await collection.updateContent(1, "Updated Content");
			expect(await collection.content(1)).to.equal("Updated Content");
		});

		it("Should not allow non-creators to update content", async function () {
			await collection.create("Test Post", "Initial Content", owner.address, false);
			await expect(collection.connect(user1).updateContent(1, "Unauthorized Update"))
				.to.be.revertedWith("Only the creator can update the content");
		});


		it("Should not allow updates after 48 hours", async function () {
			await collection.create("Test Post", "Initial Content", owner.address, false);
			await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
			await ethers.provider.send("evm_mine", []);

			await expect(collection.updateContent(1, "Late Update"))
				.to.be.revertedWith("Update window has expired");
		});

	});

	describe("MinimalMarket - Admin Functions", function () {
		it("Should allow owner to pause and unpause", async function () {
			await market.pause();
			await expect(market.executeBuy(1, referer.address, owner.address, { value: ethers.utils.parseEther("0.0042") }))
				.to.be.reverted;

			await market.unpause();
			await expect(market.executeBuy(1, referer.address, owner.address, { value: ethers.utils.parseEther("0.0042") }))
				.to.not.be.reverted;
		});

		it("Should allow owner to change fee destination", async function () {
		await market.setFeeDestination(user2.address);
		expect(await market.protocolFeeDestination()).to.equal(user2.address);
		});

		it("Should allow owner to change protocol fee percent", async function () {
		await market.setProtocolFeePercent(20);
		// You might need to add a getter function to check this
		// expect(await market.protocolFeeDivider()).to.equal(20);
		});
	});
});

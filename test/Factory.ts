const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CollectionFactory", function () {
	let CollectionFactory;
	let ProfileRegistry;
	let MinimalCollection;
	let URIEncoding;
	let factory: any;
	let profileRegistry: any;
	let minimalCollection: any;
	let uriEncoding: any;
	let owner: any;
	let addr1: any;
	let addr2: any;

	beforeEach(async function () {
		[owner, addr1, addr2] = await ethers.getSigners();

		// Deploy URIEncoding library
		URIEncoding = await ethers.getContractFactory("URIEncoding");
		uriEncoding = await URIEncoding.deploy();
		await uriEncoding.deployed();

		// Deploy mock ProfileRegistry
		ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
		profileRegistry = await upgrades.deployProxy(ProfileRegistry, [owner.address], { initializer: 'initialize' });
		await profileRegistry.deployed();

		// Deploy MinimalCollection implementation with library linking
		MinimalCollection = await ethers.getContractFactory("MinimalCollection", {
		libraries: {
			URIEncoding: uriEncoding.address,
		},
		});
		minimalCollection = await MinimalCollection.deploy();
		await minimalCollection.deployed();

		// Deploy CollectionFactory
		CollectionFactory = await ethers.getContractFactory("CollectionFactory");
		factory = await CollectionFactory.deploy(minimalCollection.address, profileRegistry.address);
		await factory.deployed();
	});

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
		expect(await factory.owner()).to.equal(owner.address);
		});

		it("Should set the correct collection implementation address", async function () {
		expect(await factory.collectionImplementation()).to.equal(minimalCollection.address);
		});

		it("Should set the correct profile registry address", async function () {
		expect(await factory.profileRegistry()).to.equal(profileRegistry.address);
		});
	});

	describe("createCollection", function () {
		it("Should create a new collection", async function () {
		const tx = await factory.createCollection("TestCollection", "http://test-uri.com");
		const receipt = await tx.wait();
		const event = receipt.events.find((e: any) => e.event === 'CollectionCreated');
		expect(event).to.not.be.undefined;
		expect(event.args.owner).to.equal(owner.address);

		const collectionAddress = event.args.collection;
		const collection = await ethers.getContractAt("MinimalCollection", collectionAddress);
		expect(await collection.name()).to.equal("TestCollection");
		});
	});

	describe("createCollectionAndPost", function () {
		it("Should create a new collection and mint the first post", async function () {
			const tx = await factory.createCollectionAndPost(
				"TestCollection",
				"http://test-uri.com",
				"First Post",
				"This is the content of the first post",
				false
			);
			const receipt = await tx.wait();
			const event = receipt.events.find((e: any) => e.event === 'CollectionCreatedWithPost');

			expect(event).to.not.be.undefined;
			expect(event.args.owner).to.equal(owner.address);
			expect(event.args.postId).to.equal(1);

			const collectionAddress = event.args.collection;
			const collection = await ethers.getContractAt("MinimalCollection", collectionAddress);
			await collection.connect(owner).create("Test", "Content", owner.address, false);

			expect(await collection.name()).to.equal("TestCollection");
			expect(await collection.titles(1)).to.equal("First Post");
		});
	});

	describe("createProfileCollectionAndPost", function () {
		it("Should register a new profile", async function () {
			await profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1");

			const profile = await profileRegistry.getProfileByID(1);
			expect(profile.handle).to.equal("handle1");
			expect(profile.description).to.equal("description1");
			expect(profile.metadata).to.equal("metadata1");
		});

		it("Should register a profile, create a collection, and mint the first post", async function () {
		const tx = await factory.createProfileCollectionAndPost(
			"testhandle",
			"Test Description",
			"http://profile-metadata.com",
			"TestCollection",
			"http://test-uri.com",
			"First Post",
			"This is the content of the first post",
			false
		);
		const receipt = await tx.wait();
		const event = receipt.events.find((e: any) => e.event === 'ProfileAndCollectionCreated');
		expect(event).to.not.be.undefined;
		expect(event.args.owner).to.equal(owner.address);
		expect(event.args.postId).to.equal(1);

		const collectionAddress = event.args.collection;
		const collection = await ethers.getContractAt("MinimalCollection", collectionAddress);
		expect(await collection.name()).to.equal("TestCollection");
		expect(await collection.titles(1)).to.equal("First Post");
		let profileId = await profileRegistry.getIdFromHandle('testhandle');
		console.log("profileId", profileId.toString());
		expect(profileId).to.equal(1);
		});
	});
});

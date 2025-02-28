const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CollectionFactory", function () {
	let CollectionFactory;
	let MinimalCollection;
	let URIEncoding;
	let factory: any;
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
		factory = await CollectionFactory.deploy(minimalCollection.address);
		await factory.deployed();
	});

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
		expect(await factory.owner()).to.equal(owner.address);
		});

		it("Should set the correct collection implementation address", async function () {
		expect(await factory.collectionImplementation()).to.equal(minimalCollection.address);
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
			expect(await collection.name()).to.equal("TestCollection");
			expect(await collection.content(1)).to.equal("This is the content of the first post");
		});
	});
});

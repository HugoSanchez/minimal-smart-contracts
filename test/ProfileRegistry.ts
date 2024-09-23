import { expect } from "chai";
// @ts-ignore
import { ethers, upgrades } from "hardhat";

describe("ProfileRegistry", function () {
	let ProfileRegistry: any;
	let profileRegistry: any;
	let owner: any;
	let addr1: any;
	let addr2: any;
	let addrs: any;

	beforeEach(async function () {
		// Get the ContractFactory and Signers here.
		ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
		[owner, addr1, addr2, ...addrs] = await ethers.getSigners();

		// Deploy a new ProfileRegistry contract before each test
		profileRegistry = await upgrades.deployProxy(ProfileRegistry, [owner.address], { initializer: 'initialize' });
		await profileRegistry.deployed();
	});

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
		expect(await profileRegistry.owner()).to.equal(owner.address);
		});

		it("Should initialize with token ID 1", async function () {
		expect(await profileRegistry.getTokenId()).to.equal(1);
		});
	});

	describe("Profile Registration", function () {
		it("Should register a new profile", async function () {
		await profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1");

		const profile = await profileRegistry.getProfileByID(1);
		expect(profile.handle).to.equal("handle1");
		expect(profile.description).to.equal("description1");
		expect(profile.metadata).to.equal("metadata1");
		});

		it("Should not allow registering the same handle twice", async function () {
		await profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1");
		await expect(
			profileRegistry.registerProfile(addr2.address, "handle1", "description2", "metadata2")
		).to.be.revertedWith("Handle already taken");
		});

		it("Should not allow registering more than one profile per address", async function () {
		await profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1");
		await expect(
			profileRegistry.registerProfile(addr1.address, "handle2", "description2", "metadata2")
		).to.be.revertedWith("Already has profile");
		});

		it("Should not allow registering with an empty handle", async function () {
		await expect(
			profileRegistry.registerProfile(addr1.address, "", "description1", "metadata1")
		).to.be.revertedWith("Handle cannot be empty");
		});

		it("Should not allow registering with a handle longer than 20 characters", async function () {
		await expect(
			profileRegistry.registerProfile(addr1.address, "thisisaverylonghandlethatexceeds20chars", "description1", "metadata1")
		).to.be.revertedWith("Handle too long");
		});
	});

	describe("Profile Updates", function () {
		beforeEach(async function () {
		await profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1");
		});

		it("Should update profile metadata", async function () {
		await profileRegistry.connect(addr1).updateProfileMetadata(1, "newmetadata");
		const profile = await profileRegistry.getProfileByID(1);
		expect(profile.metadata).to.equal("newmetadata");
		});

		it("Should update profile description", async function () {
		await profileRegistry.connect(addr1).updateProfileDescription(1, "newdescription");
		const profile = await profileRegistry.getProfileByID(1);
		expect(profile.description).to.equal("newdescription");
		});

		it("Should not allow updating someone else's profile", async function () {
		await expect(
			profileRegistry.connect(addr2).updateProfileMetadata(1, "newmetadata")
		).to.be.revertedWith("Can't change someone else's metadata");

		await expect(
			profileRegistry.connect(addr2).updateProfileDescription(1, "newdescription")
		).to.be.revertedWith("Can't change someone else's metadata");
		});
	});

	describe("Profile Retrieval", function () {
		beforeEach(async function () {
		await profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1");
		});

		it("Should retrieve profile by ID", async function () {
		const profile = await profileRegistry.getProfileByID(1);
		expect(profile.handle).to.equal("handle1");
		expect(profile.description).to.equal("description1");
		expect(profile.metadata).to.equal("metadata1");
		});

		it("Should retrieve profile ID by handle", async function () {
		const profileId = await profileRegistry.getIdFromHandle("handle1");
		expect(profileId).to.equal(1);
		});

		it("Should handle case-insensitive handle lookup", async function () {
		const profileId = await profileRegistry.getIdFromHandle("HANDLE1");
		expect(profileId).to.equal(1);
		});
	});

	describe("Pausing", function () {
		it("Should pause and unpause the contract", async function () {
		await profileRegistry.pause();
		await expect(
			profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1")
		).to.be.reverted;

		await profileRegistry.unpause();
		await expect(
			profileRegistry.registerProfile(addr1.address, "handle1", "description1", "metadata1")
		).to.not.be.reverted;
		});

		it("Should only allow owner to pause and unpause", async function () {
		await expect(profileRegistry.connect(addr1).pause()).to.be.reverted;
		await expect(profileRegistry.connect(addr1).unpause()).to.be.reverted;
		});
	});
});

import { ethers } from "hardhat";

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deploying contracts with the account:", deployer.address);

	// Deploy URIEncoding library
	const URIEncoding = await ethers.getContractFactory("URIEncoding");
	const uriEncoding = await URIEncoding.deploy();
	await uriEncoding.deployed();
	console.log("URIEncoding deployed to:", uriEncoding.address);

	// Deploy MinimalCollection with URIEncoding library
	const MinimalCollection = await ethers.getContractFactory("MinimalCollection", {
		libraries: {
		URIEncoding: uriEncoding.address,
		},
	});
	const minimalCollection = await MinimalCollection.deploy();
	await minimalCollection.deployed();
	console.log("MinimalCollection deployed to:", minimalCollection.address);

	// Deploy MinimalMarket
	const MinimalMarket = await ethers.getContractFactory("MinimalMarket");
	const market = await MinimalMarket.deploy();
	await market.deployed();
	await market.initialize(deployer.address, deployer.address); // Replace second parameter with your fee destination address
	console.log("MinimalMarket deployed to:", market.address);

	// Deploy CollectionFactory
	const CollectionFactory = await ethers.getContractFactory("CollectionFactory");
	const factory = await CollectionFactory.deploy(minimalCollection.address);
	await factory.deployed();
	console.log("CollectionFactory deployed to:", factory.address);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
});

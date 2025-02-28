import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');

dotenv.config();

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.20",
		settings: {
		  optimizer: {
			enabled: true,
			runs: 200
		  }
		}
	},
	networks: {
		optimismSepolia: {
			url: `https://opt-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
			accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
		},
	},
	etherscan: {
		apiKey: {
			"optimism-sepolia": process.env.OPTIMISM_ETHERSCAN_API_KEY || "",
		},
	},
}

export default config;

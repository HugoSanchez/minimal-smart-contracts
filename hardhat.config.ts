import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');


const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.20",
		settings: {
		  optimizer: {
			enabled: true,
			runs: 200
		  }
		}
	  }
}

export default config;

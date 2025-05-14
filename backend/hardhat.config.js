require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    baseSepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};

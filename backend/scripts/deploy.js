const hre = require("hardhat");

async function main() {
  const AlphaLens = await hre.ethers.getContractFactory("AlphaLens");
  const alphaLens = await AlphaLens.deploy();

  await alphaLens.waitForDeployment();

  console.log("AlphaLens deployed to:", alphaLens.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
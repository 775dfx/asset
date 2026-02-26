import hre from "hardhat";

async function main() {
  const vault = await hre.ethers.deployContract("GameAssetVault");
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  console.log("GameAssetVault deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

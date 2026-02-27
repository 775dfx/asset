import hre from "hardhat";

async function main() {
  const vault = await hre.ethers.deployContract("GameAssetVault");
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  console.log("\n================ GameAssetVault deployed ================");
  console.log("Contract address:", address);
  console.log("Set this in your frontend .env as:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
  console.log("========================================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

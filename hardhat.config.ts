import { config as loadEnv } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

loadEnv({ override: true });

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL ?? "";
const rawDeployerKey = (process.env.DEPLOYER_PRIVATE_KEY ?? "").trim();
const deployerKey =
  rawDeployerKey && rawDeployerKey.startsWith("0x")
    ? rawDeployerKey
    : rawDeployerKey
      ? `0x${rawDeployerKey}`
      : "";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
};

export default config;

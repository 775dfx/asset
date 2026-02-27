import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
} from "viem";
import type { Address } from "viem";
import { assetVaultAbi } from "../contracts/assetVaultAbi";

// Network and contract configuration
const rpcUrl = import.meta.env.VITE_RPC_URL;
const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? 11155111);
const contractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || undefined) as
  | Address
  | undefined;

// Custom chain for viem
const chain = defineChain({
  id: chainId,
  name: "Custom",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: rpcUrl ? [rpcUrl] : [] },
  },
});

export const ensureContractChain = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available");
  }
  const currentChainIdHex = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string;
  const targetChainIdHex = `0x${chainId.toString(16)}`;
  if (currentChainIdHex === targetChainIdHex) {
    return;
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainIdHex }],
    });
  } catch (error) {
    const err = error as { code?: number };
    if (err.code !== 4902) {
      throw error;
    }
    if (!rpcUrl) {
      throw new Error(
        "Contract network is not added in MetaMask and VITE_RPC_URL is not configured."
      );
    }
    const rpcUrlForMetaMask = rpcUrl.startsWith("/")
      ? `${window.location.origin}${rpcUrl}`
      : rpcUrl;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: targetChainIdHex,
          chainName:
            chainId === 11155111
              ? "Sepolia"
              : chainId === 31337
                ? "Localhost 8545"
                : "Contract Network",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [rpcUrlForMetaMask],
        },
      ],
    });
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainIdHex }],
    });
  }
};

export const isContractConfigured = () => Boolean(contractAddress);

// Public client for read operations
export const getPublicClient = () => {
  if (!rpcUrl) {
    throw new Error("VITE_RPC_URL is not configured");
  }
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
};

// Wallet client for transactions
export const getWalletClient = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available");
  }
  return createWalletClient({
    chain,
    transport: custom(window.ethereum),
  });
};

// Write CID to the contract
export const saveAssetOnChain = async (
  cid: string,
  account: Address
): Promise<`0x${string}`> => {
  if (!contractAddress) {
    throw new Error("VITE_CONTRACT_ADDRESS is not configured");
  }
  const walletClient = getWalletClient();
  return walletClient.writeContract({
    address: contractAddress,
    abi: assetVaultAbi,
    functionName: "saveAsset",
    args: [cid],
    account,
  });
};

export const deleteAssetOnChain = async (
  cid: string,
  account: Address
): Promise<`0x${string}`> => {
  if (!contractAddress) {
    throw new Error("VITE_CONTRACT_ADDRESS is not configured");
  }
  const walletClient = getWalletClient();
  return walletClient.writeContract({
    address: contractAddress,
    abi: assetVaultAbi,
    functionName: "deleteAsset",
    args: [cid],
    account,
  });
};

// Read user CIDs from the contract
export const getAssetsFromChain = async (
  account: Address
): Promise<string[]> => {
  if (!contractAddress) {
    throw new Error("VITE_CONTRACT_ADDRESS is not configured");
  }
  const publicClient = getPublicClient();
  const assets = await publicClient.readContract({
    address: contractAddress,
    abi: assetVaultAbi,
    functionName: "getAssets",
    args: [account],
  });
  return [...assets];
};

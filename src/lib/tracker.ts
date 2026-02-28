import { BrowserProvider, Contract, type Eip1193Provider } from "ethers";

type TrackUploadResult = {
  success: boolean;
  txHash?: string;
  error?: string;
};

const trackerAbi = [
  "event Uploaded(address indexed user, string cid, uint256 timestamp)",
  "function track(string cid) external",
];

const trackerAddress = import.meta.env.VITE_TRACKER_ADDRESS as
  | `0x${string}`
  | undefined;

const trackerChainId = Number(
  import.meta.env.VITE_TRACKER_CHAIN_ID ??
    import.meta.env.VITE_CHAIN_ID ??
    11155111
);

const getProvider = () => {
  const ethereum = window.ethereum as Eip1193Provider | undefined;
  if (!ethereum) {
    throw new Error("WALLET_NOT_FOUND");
  }
  return new BrowserProvider(ethereum);
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "UNKNOWN_ERROR";
};

const isUserRejected = (error: unknown) => {
  const err = error as {
    code?: number | string;
    error?: { code?: number | string };
    info?: { error?: { code?: number | string } };
    message?: string;
    shortMessage?: string;
  };
  const code = err.code ?? err.error?.code ?? err.info?.error?.code;
  if (code === 4001 || code === "ACTION_REJECTED") {
    return true;
  }
  const message = `${err.message ?? ""} ${err.shortMessage ?? ""}`.toLowerCase();
  return (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected")
  );
};

export const getExplorerUrl = (txHash: string) =>
  `https://sepolia.etherscan.io/tx/${txHash}`;

export const trackUpload = async (cid: string): Promise<TrackUploadResult> => {
  if (!trackerAddress) {
    return { success: false, error: "TRACKER_NOT_CONFIGURED" };
  }
  if (!cid || !cid.trim()) {
    return { success: false, error: "INVALID_CID" };
  }
  let provider: BrowserProvider;
  try {
    provider = getProvider();
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
  try {
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);
    if (currentChainId !== trackerChainId) {
      return {
        success: false,
        error: `NETWORK_MISMATCH: expected ${trackerChainId}, got ${currentChainId}`,
      };
    }
    const signer = await provider.getSigner();
    const contract = new Contract(trackerAddress, trackerAbi, signer);
    const tx = await contract.track(cid);
    const receipt = await tx.wait();
    if (!receipt) {
      return { success: false, error: "TX_NOT_CONFIRMED" };
    }
    return { success: true, txHash: tx.hash as string };
  } catch (error) {
    if (isUserRejected(error)) {
      return { success: false, error: "USER_REJECTED" };
    }
    return { success: false, error: getErrorMessage(error) };
  }
};

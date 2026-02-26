import "@storagehub/api-augment";
import { ApiPromise, HttpProvider, WsProvider } from "@polkadot/api";
import { TypeRegistry } from "@polkadot/types";
import type { AccountId20, H256 } from "@polkadot/types/interfaces";
import { types } from "@storagehub/types-bundle";
import {
  FileManager,
  ReplicationLevel,
  StorageHubClient,
  initWasm,
} from "@storagehub-sdk/core";
import {
  MspClient,
  type DownloadResult,
  type ValueProp,
} from "@storagehub-sdk/msp-client";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  type Address,
} from "viem";

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  providers?: InjectedProvider[];
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
};

type UploadFileInput = {
  bucketId: string;
  file: File;
  ownerAddress?: string;
  prepared?: PreparedUpload;
  onStatus?: (message: string) => void;
};

type CreateBucketInput = {
  name: string;
  ownerAddress?: string;
  onStatus?: (message: string) => void;
};

type CreateBucketResponse = {
  bucketId: string;
};

type UploadFileResponse = {
  cid: string;
  mimeType?: string;
  fileName?: string;
};

export type PreparedUpload = {
  bucketId: string;
  ownerAddress: string;
  fileName: string;
  fingerprint: `0x${string}`;
  fileSize: bigint;
  fileKey: `0x${string}`;
  fileBlob: Blob;
};

type StorageHubClients = {
  storageHubClient: StorageHubClient;
  publicClient: ReturnType<typeof createPublicClient>;
  mspClient: MspClient;
  walletClient: ReturnType<typeof createWalletClient>;
  getPolkadotApi: () => Promise<ApiPromise>;
};

type MspInfo = Awaited<ReturnType<MspClient["info"]["getInfo"]>>;

const dataHavenChainId = Number(import.meta.env.VITE_DATAHAVEN_CHAIN_ID ?? 55931);
const dataHavenRpcUrl =
  import.meta.env.VITE_DATAHAVEN_RPC_URL ||
  "https://services.datahaven-testnet.network/testnet";
const dataHavenWsUrl =
  import.meta.env.VITE_DATAHAVEN_WSS_URL ||
  "wss://services.datahaven-testnet.network/testnet";
const dataHavenMspUrl =
  import.meta.env.VITE_DATAHAVEN_MSP_URL ||
  "https://deo-dh-backend.testnet.datahaven-infra.network/";
const dataHavenMspTimeoutMs = Number(
  import.meta.env.VITE_DATAHAVEN_MSP_TIMEOUT_MS ?? 300000
);
const dataHavenFilesystemAddress = import.meta.env
  .VITE_DATAHAVEN_FILESYSTEM_ADDRESS as `0x${string}` | undefined;

let storageHubPromise: Promise<StorageHubClients> | null = null;
let polkadotApiPromise: Promise<ApiPromise> | null = null;
let sessionToken: string | undefined;
let sessionAddress: Address | undefined;
let activeAddress: Address | undefined;
let mspInfoPromise: Promise<MspInfo> | null = null;
let valuePropPromise: Promise<`0x${string}`> | null = null;

const dataHavenChain = defineChain({
  id: dataHavenChainId,
  name: "DataHaven Testnet",
  nativeCurrency: { name: "MOCK", symbol: "MOCK", decimals: 18 },
  rpcUrls: {
    default: { http: dataHavenRpcUrl ? [dataHavenRpcUrl] : [] },
  },
});

const normalizeHttpUrl = (url: string) =>
  url.startsWith("/") ? `${window.location.origin}${url}` : url;

const normalizeWsUrl = (url: string) => {
  if (url.startsWith("ws://") || url.startsWith("wss://")) {
    return url;
  }
  if (url.startsWith("/")) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${url}`;
  }
  return url;
};

const getInjectedProvider = (): InjectedProvider | undefined => {
  const ethereum = window.ethereum as InjectedProvider | undefined;
  const providers = ethereum?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    return (
      providers.find((provider) => provider.isMetaMask) ??
      providers.find((provider) => provider.isOkxWallet) ??
      providers[0]
    );
  }
  return (window as { okxwallet?: InjectedProvider }).okxwallet ?? ethereum;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
};

const assertConfig = () => {
  if (!dataHavenRpcUrl) {
    throw new Error("VITE_DATAHAVEN_RPC_URL is not configured");
  }
  if (!dataHavenWsUrl) {
    throw new Error("VITE_DATAHAVEN_WSS_URL is not configured");
  }
  if (!dataHavenMspUrl) {
    throw new Error("VITE_DATAHAVEN_MSP_URL is not configured");
  }
  if (!dataHavenFilesystemAddress) {
    throw new Error("VITE_DATAHAVEN_FILESYSTEM_ADDRESS is not configured");
  }
};

const createPolkadotApi = async () => {
  let wsError: Error | undefined;
  if (dataHavenWsUrl) {
    try {
      return await withTimeout(
        ApiPromise.create({
          provider: new WsProvider(normalizeWsUrl(dataHavenWsUrl)),
          typesBundle: types,
          noInitWarn: true,
        }),
        20000,
        "Timed out connecting to DataHaven WS endpoint"
      );
    } catch (error) {
      wsError = error as Error;
    }
  }
  if (dataHavenRpcUrl) {
    return await withTimeout(
      ApiPromise.create({
        provider: new HttpProvider(normalizeHttpUrl(dataHavenRpcUrl)),
        typesBundle: types,
        noInitWarn: true,
      }),
      20000,
      "Timed out connecting to DataHaven HTTP endpoint"
    );
  }
  throw wsError ?? new Error("DataHaven RPC endpoint is not configured");
};

const getPolkadotApi = () => {
  if (!polkadotApiPromise) {
    polkadotApiPromise = createPolkadotApi();
  }
  return polkadotApiPromise;
};

const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number,
  delayMs: number
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Retry failed");
};

const ensureWalletProvider = () => {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("EVM wallet provider is not available");
  }
  return provider;
};

const ensureChain = async () => {
  const provider = ensureWalletProvider();
  const chainIdHex = (await provider.request({
    method: "eth_chainId",
  })) as string;
  const currentChainId = Number.parseInt(chainIdHex, 16);
  if (currentChainId !== dataHavenChainId) {
    throw new Error(
      `Switch your wallet to DataHaven Testnet (chainId ${dataHavenChainId}).`
    );
  }
};

const getStorageHubClients = async (
  address: Address
): Promise<StorageHubClients> => {
  assertConfig();
  const provider = ensureWalletProvider();
  if (!storageHubPromise || activeAddress !== address) {
    activeAddress = address;
    storageHubPromise = (async () => {
      await initWasm();
      const filesystemContractAddress = dataHavenFilesystemAddress;
      if (!filesystemContractAddress) {
        throw new Error("VITE_DATAHAVEN_FILESYSTEM_ADDRESS is not configured");
      }
      const walletClient = createWalletClient({
        chain: dataHavenChain,
        transport: custom(provider),
        account: address,
      });
      const publicClient = createPublicClient({
        chain: dataHavenChain,
        transport: http(dataHavenRpcUrl),
      });
      const storageHubClient = new StorageHubClient({
        rpcUrl: dataHavenRpcUrl,
        chain: dataHavenChain,
        walletClient,
        filesystemContractAddress,
      });
      const sessionProvider = async () =>
        sessionToken && sessionAddress
          ? ({ token: sessionToken, user: { address: sessionAddress } } as const)
          : undefined;
      const mspClient = await withTimeout(
        MspClient.connect(
          {
            baseUrl: normalizeHttpUrl(dataHavenMspUrl),
            timeoutMs: dataHavenMspTimeoutMs,
          },
          sessionProvider
        ),
        20000,
        "Timed out connecting to DataHaven MSP backend"
      );
      return {
        storageHubClient,
        publicClient,
        mspClient,
        walletClient,
        getPolkadotApi,
      };
    })();
  }
  return storageHubPromise;
};

const authenticate = async (
  mspClient: MspClient,
  walletClient: ReturnType<typeof createWalletClient>,
  address: Address
) => {
  if (sessionToken && sessionAddress === address) {
    return;
  }
  const domain = window.location.hostname || "localhost";
  const uri = window.location.origin || "http://localhost";
  const session = await mspClient.auth.SIWE(walletClient, domain, uri);
  sessionToken = (session as { token: string }).token;
  sessionAddress = address;
};

const getMspInfo = async (mspClient: MspClient) => {
  if (!mspInfoPromise) {
    mspInfoPromise = mspClient.info.getInfo();
  }
  return mspInfoPromise;
};

const getValuePropId = async (mspClient: MspClient) => {
  if (!valuePropPromise) {
    valuePropPromise = mspClient.info
      .getValuePropositions()
      .then((valueProps: ValueProp[]) => {
        if (!Array.isArray(valueProps) || valueProps.length === 0) {
          throw new Error("No value propositions available from MSP");
        }
        return valueProps[0].id as `0x${string}`;
      });
  }
  return valuePropPromise;
};

const waitForBackendBucketReady = async (
  mspClient: MspClient,
  bucketId: string
) => {
  const maxAttempts = 10;
  const delayMs = 2000;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const bucket = await mspClient.buckets.getBucket(bucketId);
      if (bucket) {
        return;
      }
    } catch (error) {
      const err = error as { status?: number; body?: { error?: string } };
      if (err.status !== 404 && err.body?.error !== "Not found: Record") {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Bucket ${bucketId} not found in MSP backend after waiting`);
};

const waitForMSPConfirmOnChain = async (
  polkadotApi: ApiPromise,
  fileKey: string
) => {
  const maxAttempts = 20;
  const delayMs = 2000;
  for (let i = 0; i < maxAttempts; i += 1) {
    const req = await polkadotApi.query.fileSystem.storageRequests(fileKey);
    if (req.isNone) {
      throw new Error(`StorageRequest for ${fileKey} no longer exists on-chain.`);
    }
    const data = req.unwrap() as unknown as {
      mspStatus: { isAcceptedNewFile: boolean; isAcceptedExistingFile: boolean };
    };
    if (data.mspStatus.isAcceptedNewFile || data.mspStatus.isAcceptedExistingFile) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Timed out waiting for MSP confirmation on-chain");
};

const waitForBackendFileReady = async (
  mspClient: MspClient,
  bucketId: string,
  fileKey: string
) => {
  const maxAttempts = 40;
  const delayMs = 5000;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const fileInfo = await mspClient.files.getFileInfo(bucketId, fileKey);
      if (fileInfo.status === "ready") {
        return;
      }
      if (fileInfo.status === "revoked") {
        throw new Error("File upload was cancelled by user");
      }
      if (fileInfo.status === "rejected") {
        throw new Error("File upload was rejected by MSP");
      }
      if (fileInfo.status === "expired") {
        throw new Error("Storage request expired");
      }
    } catch (error) {
      const err = error as { status?: number; body?: { error?: string } };
      if (err.status !== 404 && err.body?.error !== "Not found: Record") {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Timed out waiting for MSP backend to mark file as ready");
};

const extractPeerIds = (multiaddresses: string[]) =>
  (multiaddresses ?? [])
    .map((addr) => addr.split("/p2p/").pop())
    .filter((id): id is string => !!id);

export const prefetchDataHaven = async (ownerAddress: string) => {
  const address = ownerAddress as Address;
  const { mspClient } = await getStorageHubClients(address);
  await Promise.all([getMspInfo(mspClient), getValuePropId(mspClient)]);
};

export const prepareUpload = async (
  input: UploadFileInput
): Promise<PreparedUpload> => {
  if (!input.ownerAddress) {
    throw new Error("Connect your wallet to upload files.");
  }
  await initWasm();
  const address = input.ownerAddress as Address;
  const fileManager = new FileManager({
    size: input.file.size,
    stream: () => input.file.stream() as ReadableStream<Uint8Array>,
  });
  const fingerprint = (await fileManager.getFingerprint()).toHex() as `0x${string}`;
  const fileSize = BigInt(fileManager.getFileSize());
  const registry = new TypeRegistry();
  const owner = registry.createType("AccountId20", address) as AccountId20;
  const bucketIdH256 = registry.createType("H256", input.bucketId) as H256;
  const fileKey = (await fileManager.computeFileKey(
    owner,
    bucketIdH256,
    input.file.name
  )).toHex() as `0x${string}`;
  const fileBlob = await fileManager.getFileBlob();
  return {
    bucketId: input.bucketId,
    ownerAddress: address,
    fileName: input.file.name,
    fingerprint,
    fileSize,
    fileKey,
    fileBlob,
  };
};

export const createBucket = async (
  input: CreateBucketInput
): Promise<CreateBucketResponse> => {
  if (!input.ownerAddress) {
    throw new Error("Connect your wallet to create a bucket.");
  }
  input.onStatus?.("Switching to DataHaven network...");
  await ensureChain();
  const address = input.ownerAddress as Address;
  input.onStatus?.("Initializing DataHaven clients...");
  const { storageHubClient, publicClient, mspClient } =
    await getStorageHubClients(address);
  input.onStatus?.("Fetching MSP information...");
  const [{ mspId }, valuePropId] = await Promise.all([
    getMspInfo(mspClient),
    getValuePropId(mspClient),
  ]);
  const bucketId = (await storageHubClient.deriveBucketId(
    address,
    input.name
  )) as string;
  try {
    input.onStatus?.("Checking if bucket already exists...");
    const bucket = await mspClient.buckets.getBucket(bucketId);
    if (bucket) {
      return { bucketId };
    }
  } catch (error) {
    const err = error as { status?: number; body?: { error?: string } };
    if (err.status !== 404 && err.body?.error !== "Not found: Record") {
      throw error;
    }
  }
  input.onStatus?.("Creating bucket in DataHaven. Confirm the transaction in your wallet...");
  const txHash: `0x${string}` | undefined = await withTimeout(
    storageHubClient.createBucket(
      mspId as `0x${string}`,
      input.name,
      false,
      valuePropId
    ),
    120000,
    "Timed out waiting for wallet confirmation"
  );
  if (!txHash) {
    throw new Error("createBucket() did not return a transaction hash");
  }
  input.onStatus?.("Waiting for bucket transaction to be mined...");
  const receipt = await withTimeout(
    publicClient.waitForTransactionReceipt({
      hash: txHash,
    }),
    120000,
    "Timed out waiting for bucket transaction to be mined"
  );
  if (receipt.status !== "success") {
    throw new Error(`Bucket creation failed: ${txHash}`);
  }
  input.onStatus?.("Waiting for MSP backend to sync bucket...");
  await waitForBackendBucketReady(mspClient, bucketId);
  return { bucketId };
};

export const uploadFile = async (
  input: UploadFileInput
): Promise<UploadFileResponse> => {
  if (!input.ownerAddress) {
    throw new Error("Connect your wallet to upload files.");
  }
  input.onStatus?.("Switching to DataHaven network...");
  await ensureChain();
  const address = input.ownerAddress as Address;
  input.onStatus?.("Initializing DataHaven clients...");
  const { storageHubClient, publicClient, mspClient, walletClient, getPolkadotApi } =
    await getStorageHubClients(address);
  input.onStatus?.("Preparing file for upload...");
  const prepared =
    input.prepared &&
    input.prepared.bucketId === input.bucketId &&
    input.prepared.ownerAddress.toLowerCase() === address.toLowerCase() &&
    input.prepared.fileName === input.file.name
      ? input.prepared
      : await prepareUpload({
          bucketId: input.bucketId,
          file: input.file,
          ownerAddress: address,
        });
  const fingerprint = prepared.fingerprint;
  const fileSizeBigInt = prepared.fileSize;
  input.onStatus?.("Fetching MSP information...");
  const { mspId, multiaddresses } = await getMspInfo(mspClient);
  if (!multiaddresses?.length) {
    throw new Error("MSP multiaddresses are missing");
  }
  const peerIds = extractPeerIds(multiaddresses);
  if (peerIds.length === 0) {
    throw new Error("MSP multiaddresses had no /p2p/<peerId> segment");
  }
  input.onStatus?.("Issuing storage request. Confirm the transaction in your wallet...");
  const txHash: `0x${string}` | undefined =
    await storageHubClient.issueStorageRequest(
      prepared.bucketId as `0x${string}`,
      prepared.fileName,
      fingerprint as `0x${string}`,
      fileSizeBigInt,
      mspId as `0x${string}`,
      peerIds,
      ReplicationLevel.Custom,
      1
    );
  if (!txHash) {
    throw new Error("issueStorageRequest() did not return a transaction hash");
  }
  input.onStatus?.("Waiting for storage request transaction to be mined...");
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  if (receipt.status !== "success") {
    throw new Error(`Storage request failed: ${txHash}`);
  }
  input.onStatus?.("Connecting to DataHaven indexer...");
  let polkadotApi: ApiPromise | undefined;
  try {
    polkadotApi = await getPolkadotApi();
  } catch {
    polkadotApi = undefined;
  }
  const fileKey = prepared.fileKey;
  if (polkadotApi) {
    const storageRequest = await polkadotApi.query.fileSystem.storageRequests(
      fileKey
    );
    if (!storageRequest.isSome) {
      throw new Error("Storage request not found on chain");
    }
  }
  input.onStatus?.("Authenticating with MSP. Confirm signature in your wallet...");
  await authenticate(mspClient, walletClient, address);
  const fileBlob = prepared.fileBlob;
  input.onStatus?.("Uploading file to MSP backend...");
  const uploadReceipt = await withRetry(
    () =>
      mspClient.files.uploadFile(
        prepared.bucketId,
        fileKey,
        fileBlob,
        address,
        prepared.fileName
      ),
    2,
    2000
  );
  if (uploadReceipt.status !== "upload_successful") {
    throw new Error("File upload to MSP failed");
  }
  if (polkadotApi) {
    input.onStatus?.("Waiting for MSP confirmation on-chain...");
    await waitForMSPConfirmOnChain(polkadotApi, fileKey);
  }
  input.onStatus?.("Waiting for MSP backend to mark file as ready...");
  await waitForBackendFileReady(mspClient, prepared.bucketId, fileKey);
  return {
    cid: fileKey,
    mimeType: input.file.type,
    fileName: prepared.fileName,
  };
};

export const getFile = async (cid: string): Promise<Blob> => {
  if (!activeAddress) {
    throw new Error("Connect your wallet to fetch files.");
  }
  const { mspClient } = await getStorageHubClients(activeAddress);
  const download: DownloadResult = await mspClient.files.downloadFile(cid);
  if (download.status !== 200) {
    throw new Error(`Download failed with status: ${download.status}`);
  }
  const stream = download.stream as ReadableStream<Uint8Array>;
  return new Response(stream).blob();
};

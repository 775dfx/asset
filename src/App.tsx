import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { Header } from "./components/Header";
import { SectionCard } from "./components/SectionCard";
import { UploadPanel } from "./components/UploadPanel";
import { AssetsPanel } from "./components/AssetsPanel";
import { Footer } from "./components/Footer";
import { Button } from "./components/Button";
import { useWallet } from "./hooks/useWallet";
import {
  createBucket,
  getFile,
  prefetchDataHaven,
  prepareUpload,
  uploadFile,
  type PreparedUpload,
} from "./utils/dataHaven";
import {
  ensureContractChain,
  getAssetsFromChain,
  isContractConfigured,
  saveAssetOnChain,
  deleteAssetOnChain,
} from "./utils/web3";
import type { AssetMeta, StatusMessage } from "./types";

// Default UI status
const defaultStatus: StatusMessage = {
  state: "idle",
  message: "Ready to work with DataHaven and the blockchain.",
};

// SVG preview for JSON assets
const jsonPreviewSvg = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="100%" stop-color="#312E81"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" fill="#E5E7EB" font-size="28" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">
        ${label}
      </text>
    </svg>`
  )}`;

export default function App() {
  // Wallet state
  const { wallet, connect, disconnect, switchToDataHaven, dataHavenChainId } = useWallet();
  // DataHaven state
  const [bucketName, setBucketName] = useState("game-asset-vault");
  const [bucketId, setBucketId] = useState<string | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const [preparedUpload, setPreparedUpload] = useState<PreparedUpload | undefined>();
  // UI state
  const [status, setStatus] = useState<StatusMessage>(defaultStatus);
  const [assets, setAssets] = useState<AssetMeta[]>([]);
  const [previewAsset, setPreviewAsset] = useState<AssetMeta | null>(null);

  // Short address for the header
  const addressShort = useMemo(() => {
    if (!wallet.address) return undefined;
    return `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  }, [wallet.address]);

  useEffect(() => {
    if (!wallet.address) return;
    prefetchDataHaven(wallet.address).catch(() => undefined);
  }, [wallet.address]);

  useEffect(() => {
    let active = true;
    setPreparedUpload(undefined);
    if (!file || !bucketId || !wallet.address) {
      return () => {
        active = false;
      };
    }
    prepareUpload({
      bucketId,
      file,
      ownerAddress: wallet.address,
    })
      .then((prepared) => {
        if (active) {
          setPreparedUpload(prepared);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bucketId, file, wallet.address]);

  const ensureWalletAddress = async () => {
    if (wallet.address) {
      return wallet.address;
    }
    setStatus({ state: "loading", message: "Connecting wallet..." });
    const address = await connect();
    if (!address) {
      throw new Error("Wallet connection was cancelled.");
    }
    return address;
  };

  // Connect wallet
  const handleConnect = async () => {
    try {
      const address = await ensureWalletAddress();
      setStatus({
        state: "success",
        message: `Wallet connected: ${address}`,
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: (error as Error).message,
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setBucketId(undefined);
    setFile(undefined);
    setPreparedUpload(undefined);
    setAssets([]);
    setStatus(defaultStatus);
  };

  const handleSwitchNetwork = async () => {
    try {
      setStatus({ state: "loading", message: "Switching network..." });
      await switchToDataHaven();
      setStatus({
        state: "success",
        message: "Switched to DataHaven Testnet.",
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: (error as Error).message,
      });
    }
  };

  // Create a bucket in DataHaven
  const handleCreateBucket = async () => {
    try {
      const address = await ensureWalletAddress();
      const response = await createBucket({
        name: bucketName,
        ownerAddress: address,
        onStatus: (message) => setStatus({ state: "loading", message }),
      });
      setBucketId(response.bucketId);
      setStatus({
        state: "success",
        message: `Bucket created: ${response.bucketId}`,
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: (error as Error).message,
      });
    }
  };

  // Upload asset to DataHaven and store CID on-chain
  const handleUpload = async () => {
    if (!bucketId) {
      setStatus({
        state: "error",
        message: "Create a bucket first.",
      });
      return;
    }
    if (!file) {
      setStatus({
        state: "error",
        message: "Select a file to upload.",
      });
      return;
    }
    try {
      const address = await ensureWalletAddress();
      const storageKey = `datahaven-assets:${address}`;
      const uploadResult = await uploadFile({
        bucketId,
        file,
        ownerAddress: address,
        prepared: preparedUpload,
        onStatus: (message) => setStatus({ state: "loading", message }),
      });
      if (isContractConfigured()) {
        setStatus({
          state: "loading",
          message: "Switching to the contract network...",
        });
        await ensureContractChain();
        setStatus({
          state: "loading",
          message: "Saving CID to the smart contract...",
        });
        const txHash = await saveAssetOnChain(uploadResult.cid, address);
        setStatus({
          state: "success",
          message: `CID saved: ${uploadResult.cid} · Tx: ${txHash}`,
        });
      } else {
        const stored = localStorage.getItem(storageKey);
        const nextList = stored ? (JSON.parse(stored) as string[]) : [];
        nextList.unshift(uploadResult.cid);
        localStorage.setItem(storageKey, JSON.stringify(nextList));
        setStatus({
          state: "success",
          message: `CID saved locally: ${uploadResult.cid}`,
        });
      }
      const nextAsset: AssetMeta = await buildAssetMetaFromFile(uploadResult.cid, file, uploadResult.mimeType);
      setAssets((prev) => [nextAsset, ...prev]);
    } catch (error) {
      setStatus({
        state: "error",
        message: (error as Error).message,
      });
    }
  };

  const loadAssetsForAddress = useCallback(
    async (address: Address, options?: { silent?: boolean }) => {
      const storageKey = `datahaven-assets:${address}`;
      let cids: string[] = [];
      if (isContractConfigured()) {
        if (!options?.silent) {
          setStatus({
            state: "loading",
            message: "Switching to the contract network...",
          });
        }
        await ensureContractChain();
        if (!options?.silent) {
          setStatus({
            state: "loading",
            message: "Reading CIDs from the smart contract...",
          });
        }
        cids = await getAssetsFromChain(address);
      } else {
        const stored = localStorage.getItem(storageKey);
        cids = stored ? (JSON.parse(stored) as string[]) : [];
      }
      if (!options?.silent) {
        setStatus({
          state: "loading",
          message: "Loading assets from DataHaven...",
        });
      }
      const loadedAssets = await Promise.all(
        cids.map(async (cid, index) => {
          const blob = await getFile(cid);
          return buildAssetMetaFromBlob(cid, blob, index);
        })
      );
      setAssets(loadedAssets);
      if (!options?.silent) {
        setStatus({
          state: "success",
          message: `Assets loaded: ${loadedAssets.length}`,
        });
      }
    },
    []
  );

  useEffect(() => {
    if (!wallet.address) {
      return;
    }
    loadAssetsForAddress(wallet.address, { silent: true }).catch(() => undefined);
  }, [wallet.address, loadAssetsForAddress]);

  // Asset preview
  const handlePreview = (asset: AssetMeta) => {
    if (!asset.previewUrl) {
      setStatus({
        state: "error",
        message: "Preview is unavailable for this asset.",
      });
      return;
    }
    setPreviewAsset(asset);
  };

  // Asset download
  const handleDownload = async (asset: AssetMeta) => {
    try {
      setStatus({
        state: "loading",
        message: "Downloading asset from DataHaven...",
      });
      const blob = await getFile(asset.cid);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const mime = asset.mimeType ?? "";
      let extension = "bin";
      if (mime === "image/png") extension = "png";
      else if (mime === "image/jpeg") extension = "jpg";
      else if (mime === "application/json" || mime === "text/json") extension = "json";
      else if (mime === "audio/mpeg") extension = "mp3";
      else if (mime === "audio/wav") extension = "wav";
      else if (mime === "audio/ogg") extension = "ogg";
      const hasExtension = asset.name.includes(".");
      link.download = hasExtension ? asset.name : `${asset.name}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({
        state: "success",
        message: "Download completed.",
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: (error as Error).message,
      });
    }
  };

  const handleDelete = async (asset: AssetMeta) => {
    try {
      const address = await ensureWalletAddress();
      const storageKey = `datahaven-assets:${address}`;
      if (isContractConfigured()) {
        setStatus({
          state: "loading",
          message: "Switching to the contract network...",
        });
        await ensureContractChain();
        setStatus({
          state: "loading",
          message: "Removing asset from the smart contract...",
        });
        await deleteAssetOnChain(asset.cid, address);
      } else {
        const stored = localStorage.getItem(storageKey);
        const cids = stored ? (JSON.parse(stored) as string[]) : [];
        const nextCids = cids.filter((cid) => cid !== asset.cid);
        localStorage.setItem(storageKey, JSON.stringify(nextCids));
      }
      setAssets((prev) => prev.filter((item) => item.cid !== asset.cid));
      if (previewAsset && previewAsset.cid === asset.cid) {
        setPreviewAsset(null);
      }
      setStatus({
        state: "success",
        message: "Asset removed.",
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: (error as Error).message,
      });
    }
  };

  // Build asset metadata from a local file
  const buildAssetMetaFromFile = async (
    cid: string,
    inputFile: File,
    mimeType?: string
  ): Promise<AssetMeta> => {
    const effectiveMime = mimeType ?? inputFile.type;
    const lowerName = inputFile.name.toLowerCase();
    if (
      effectiveMime === "application/json" ||
      effectiveMime === "text/json" ||
      lowerName.endsWith(".json")
    ) {
      const text = await inputFile.text();
      const parsed = JSON.parse(text) as Partial<AssetMeta>;
      return {
        cid,
        name: parsed.name ?? inputFile.name,
        type: parsed.type ?? "JSON Asset",
        rarity: (parsed.rarity as AssetMeta["rarity"]) ?? "Common",
        levelRequired: parsed.levelRequired,
        damage: parsed.damage,
        durability: parsed.durability,
        mimeType: effectiveMime,
        previewUrl: jsonPreviewSvg(parsed.name ?? "JSON Asset"),
      };
    }
    if (effectiveMime.startsWith("image/")) {
      return {
        cid,
        name: inputFile.name,
        type: "Image Asset",
        rarity: "Common",
        mimeType: effectiveMime,
        previewUrl: URL.createObjectURL(inputFile),
      };
    }
    return {
      cid,
      name: inputFile.name,
      type: "File Asset",
      rarity: "Common",
      mimeType: effectiveMime,
      previewUrl: jsonPreviewSvg(inputFile.name),
    };
  };

  // Build asset metadata from DataHaven
  const buildAssetMetaFromBlob = async (
    cid: string,
    blob: Blob,
    index: number
  ): Promise<AssetMeta> => {
    let inferredMime = blob.type;
    if (!inferredMime || inferredMime === "application/octet-stream") {
      const headerBytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
      const isPng =
        headerBytes[0] === 0x89 &&
        headerBytes[1] === 0x50 &&
        headerBytes[2] === 0x4e &&
        headerBytes[3] === 0x47;
      const isJpeg =
        headerBytes[0] === 0xff &&
        headerBytes[1] === 0xd8 &&
        headerBytes[2] === 0xff;
      if (isPng) {
        inferredMime = "image/png";
      } else if (isJpeg) {
        inferredMime = "image/jpeg";
      } else {
        const textSnippet = new TextDecoder()
          .decode(headerBytes)
          .trimStart();
        if (textSnippet.startsWith("{") || textSnippet.startsWith("[")) {
          inferredMime = "application/json";
        }
      }
    }
    if (inferredMime === "application/json" || inferredMime === "text/json") {
      const text = await blob.text();
      const parsed = JSON.parse(text) as Partial<AssetMeta>;
      return {
        cid,
        name: parsed.name ?? `JSON Asset ${index + 1}`,
        type: parsed.type ?? "JSON Asset",
        rarity: (parsed.rarity as AssetMeta["rarity"]) ?? "Common",
        levelRequired: parsed.levelRequired,
        damage: parsed.damage,
        durability: parsed.durability,
        mimeType: inferredMime,
        previewUrl: jsonPreviewSvg(parsed.name ?? "JSON Asset"),
      };
    }
    if (inferredMime.startsWith("image/")) {
      const imageMime = inferredMime;
      const previewBlob =
        blob.type === imageMime || !blob.type
          ? blob
          : new Blob([blob], { type: imageMime });
      return {
        cid,
        name: `Image Asset ${index + 1}`,
        type: "Image Asset",
        rarity: "Common",
        mimeType: imageMime,
        previewUrl: URL.createObjectURL(previewBlob),
      };
    }
    return {
      cid,
      name: `File Asset ${index + 1}`,
      type: "File Asset",
      rarity: "Common",
      mimeType: inferredMime || blob.type,
      previewUrl: jsonPreviewSvg("File Asset"),
    };
  };

  return (
    <div className="min-h-screen bg-vault-900 text-white px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <Header
          address={addressShort}
          chainId={wallet.chainId}
          isConnected={wallet.isConnected}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          expectedChainId={dataHavenChainId}
          onSwitchNetwork={handleSwitchNetwork}
        />

        <SectionCard
          title="DataHaven Upload"
          subtitle="Upload and anchor files to the network."
        >
          <UploadPanel
            bucketName={bucketName}
            bucketId={bucketId}
            file={file}
            status={status}
            onBucketNameChange={setBucketName}
            onFileChange={setFile}
            onCreateBucket={handleCreateBucket}
            onUpload={handleUpload}
          />
        </SectionCard>

        <SectionCard
          title="Assets"
          subtitle="Assets are loaded by CID from DataHaven, while the list comes from the smart contract."
        >
          <AssetsPanel
            assets={assets}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        </SectionCard>
      </div>
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setPreviewAsset(null)}
          />
          <div className="relative z-10 mx-4 w-full max-w-3xl rounded-2xl border border-white/10 bg-vault-900/95 shadow-2xl p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {previewAsset.name || "Asset preview"}
                </h3>
                <p className="mt-1 text-xs text-slate-400 break-all">
                  CID: {previewAsset.cid}
                </p>
              </div>
              <Button
                variant="ghost"
                className="px-3 py-1.5 text-sm"
                onClick={() => setPreviewAsset(null)}
              >
                Close
              </Button>
            </div>
            <div className="mt-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden aspect-video">
              {previewAsset.previewUrl ? (
                <img
                  src={previewAsset.previewUrl}
                  alt={previewAsset.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-sm text-slate-400">Preview unavailable</span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <div>
                Type: {previewAsset.type} ·{" "}
                {previewAsset.mimeType ?? "unknown format"}
              </div>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-sm"
                onClick={() => handleDownload(previewAsset)}
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

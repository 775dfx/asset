import { Button } from "./Button";
import type { AssetMeta } from "../types";
import { rarityGlow, rarityStyles } from "../utils/rarity";

type AssetCardProps = {
  asset: AssetMeta;
  onPreview: (asset: AssetMeta) => void;
  onDownload: (asset: AssetMeta) => void;
};

const getFileTypeBadge = (asset: AssetMeta): string => {
  const mime = asset.mimeType ?? "";
  const type = asset.type.toLowerCase();
  if (type.includes("json") || mime === "application/json" || mime === "text/json") {
    return "JSON";
  }
  if (type.includes("image") || mime.startsWith("image/")) {
    return "Image";
  }
  if (type.includes("audio") || mime.startsWith("audio/")) {
    return "Audio";
  }
  return "Other";
};

export const AssetCard = ({ asset, onPreview, onDownload }: AssetCardProps) => {
  const fileTypeBadge = getFileTypeBadge(asset);
  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-300 ${
        rarityStyles[asset.rarity]
      } ${rarityGlow[asset.rarity]}`}
    >
      <div className="aspect-video rounded-xl bg-black/30 flex items-center justify-center overflow-hidden">
        {asset.previewUrl ? (
          <img
            src={asset.previewUrl}
            alt={asset.name}
            className="h-full w-full object-cover cursor-zoom-in transition-transform duration-200 hover:scale-[1.03]"
            onClick={() => onPreview(asset)}
          />
        ) : (
          <span className="text-sm text-slate-400">Preview unavailable</span>
        )}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{asset.name}</h3>
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-200">
            {fileTypeBadge}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-300">{asset.type}</p>
        <div className="mt-3 text-xs text-slate-400 break-all">
          CID: {asset.cid}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={() => onPreview(asset)}>
            Preview
          </Button>
          <Button variant="secondary" onClick={() => onDownload(asset)}>
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};

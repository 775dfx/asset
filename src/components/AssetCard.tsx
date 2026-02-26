import { Button } from "./Button";
import type { AssetMeta } from "../types";
import { rarityGlow, rarityStyles } from "../utils/rarity";

type AssetCardProps = {
  asset: AssetMeta;
  onPreview: (asset: AssetMeta) => void;
  onDownload: (asset: AssetMeta) => void;
};

export const AssetCard = ({ asset, onPreview, onDownload }: AssetCardProps) => (
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
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm text-slate-400">Preview unavailable</span>
      )}
    </div>
    <div className="mt-4">
      <h3 className="text-lg font-semibold">{asset.name}</h3>
      <p className="text-sm text-slate-300">{asset.type}</p>
      <div className="mt-2 text-xs uppercase tracking-[0.2em]">
        {asset.rarity}
      </div>
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

import { AssetGrid } from "./AssetGrid";
import type { AssetMeta } from "../types";

type AssetsPanelProps = {
  assets: AssetMeta[];
  onPreview: (asset: AssetMeta) => void;
  onDownload: (asset: AssetMeta) => void;
  onDelete: (asset: AssetMeta) => void;
};

export const AssetsPanel = ({
  assets,
  onPreview,
  onDownload,
  onDelete,
}: AssetsPanelProps) => (
  <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-lg font-semibold">My Assets</h3>
        <p className="text-sm text-slate-300">
          Assets are fetched by CID from DataHaven and the blockchain.
        </p>
      </div>
    </div>
    {assets.length > 0 ? (
      <AssetGrid
        assets={assets}
        onPreview={onPreview}
        onDownload={onDownload}
        onDelete={onDelete}
      />
    ) : (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-slate-400">
        No assets uploaded yet.
      </div>
    )}
  </div>
);

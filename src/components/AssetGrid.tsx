import type { AssetMeta } from "../types";
import { AssetCard } from "./AssetCard";

type AssetGridProps = {
  assets: AssetMeta[];
  onPreview: (asset: AssetMeta) => void;
  onDownload: (asset: AssetMeta) => void;
  onDelete: (asset: AssetMeta) => void;
};

export const AssetGrid = ({ assets, onPreview, onDownload, onDelete }: AssetGridProps) => (
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {assets.map((asset) => (
      <AssetCard
        key={asset.cid}
        asset={asset}
        onPreview={onPreview}
        onDownload={onDownload}
        onDelete={onDelete}
      />
    ))}
  </div>
);

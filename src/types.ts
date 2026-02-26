export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

export type AssetMeta = {
  cid: string;
  name: string;
  type: string;
  rarity: Rarity;
  levelRequired?: number;
  damage?: number;
  durability?: number;
  mimeType?: string;
  previewUrl?: string;
};

export type StatusState = "idle" | "loading" | "success" | "error";

export type StatusMessage = {
  state: StatusState;
  message: string;
};

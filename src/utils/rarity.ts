import type { Rarity } from "../types";

export const rarityStyles: Record<Rarity, string> = {
  Common: "border-slate-500/50 text-slate-200",
  Rare: "border-blue-500/60 text-blue-200",
  Epic: "border-purple-500/60 text-purple-200",
  Legendary: "border-amber-400/70 text-amber-200",
};

export const rarityGlow: Record<Rarity, string> = {
  Common: "hover:shadow-[0_0_24px_rgba(148,163,184,0.25)]",
  Rare: "hover:shadow-[0_0_24px_rgba(59,130,246,0.35)]",
  Epic: "hover:shadow-[0_0_24px_rgba(168,85,247,0.35)]",
  Legendary: "hover:shadow-[0_0_28px_rgba(251,191,36,0.45)]",
};

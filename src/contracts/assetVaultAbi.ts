export const assetVaultAbi = [
  {
    type: "function",
    name: "saveAsset",
    stateMutability: "nonpayable",
    inputs: [{ name: "cid", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getAssets",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "string[]" }],
  },
  {
    type: "function",
    name: "userAssets",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

# AssetLayer – DataHaven-Powered Web3 Asset Vault

AssetLayer is a demo dApp that shows how to combine **decentralized storage on DataHaven** with an **EVM smart contract registry** on Sepolia.

- Files are stored in the DataHaven testnet via StorageHub / MSP.
- Content identifiers (CIDs) are optionally written to the `GameAssetVault` contract on Sepolia.
- The UI is built with React, Vite and TypeScript.

This repository is intended as a reference integration for teams building storage-heavy Web3 applications and for the broader DataHaven / Ethereum ecosystem.

---

## Features

- Upload any file (images, JSON, audio, arbitrary binaries) to DataHaven.
- Create and manage DataHaven buckets from the browser.
- Derive a stable file key (`cid`) on-chain via StorageHub.
- Store and remove CIDs from an EVM smart contract (`GameAssetVault`) on Sepolia.
- Preview assets (image / JSON preview) and download them back from DataHaven.
- Fallback local storage mode when no contract address is configured.

---

## Architecture Overview

- **Frontend**
  - React 19 + Vite + TypeScript.
  - TailwindCSS for styling.
  - Custom hooks for wallet connection and network switching.

- **Storage Layer – DataHaven**
  - [`src/utils/dataHaven.ts`](src/utils/dataHaven.ts) uses:
    - `@storagehub-sdk/core` and `@storagehub-sdk/msp-client` for file management.
    - `@polkadot/api` for querying the StorageHub / DataHaven indexer.
  - Upload flow:
    1. Derive bucket ID and file key.
    2. Issue a storage request on the DataHaven EVM chain.
    3. Authenticate with MSP (SIWE).
    4. Upload the file to MSP backend.
    5. Wait for on-chain and backend confirmation.

- **On‑chain Registry – Sepolia**
  - Contract: [`contracts/GameAssetVault.sol`](contracts/GameAssetVault.sol).
    - `saveAsset(string cid)` – append CID to `userAssets[msg.sender]`.
    - `getAssets(address user)` – read all CIDs for a user.
    - `deleteAsset(string cid)` – remove first matching CID from the array.
  - Frontend access via [`src/utils/web3.ts`](src/utils/web3.ts) using **viem**.

---

## Ecosystem Contribution

This project demonstrates a complete, real-world integration between:

- **DataHaven testnet** as a scalable storage layer.
- **EVM (Sepolia)** as a public registry of CIDs.
- **Modern frontend tooling** (React/Vite/TypeScript) for end-user interaction.

It can be used as:

- A reference implementation for dApps that need verifiable off-chain storage.
- An example of how to orchestrate complex, multi-step storage flows in the browser.
- A starting point for experiments with asset marketplaces, game inventories, or NFT‑like metadata stored in DataHaven rather than IPFS/S3.

By building on top of this repo you contribute:

- More usage and feedback for the DataHaven testnet and StorageHub SDK.
- A template for other ecosystem projects to reuse and extend.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 5, TailwindCSS.
- **Wallet & RPC:** viem.
- **Storage:** DataHaven (StorageHub, MSP client, Polkadot API).
- **Smart Contracts:** Solidity 0.8.20, Hardhat, ethers.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)
- EVM wallet (MetaMask / OKX / etc.)

### 1. Install dependencies

```bash
git clone https://github.com/775dfx/asset.git
cd asset
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (use `.example.env` as a reference). At minimum:

```env
VITE_APP_VERSION=1.0.0

# Sepolia RPC for contract registry
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0x8771D750FfeCD4F6AF05730Ba1d5e2194698262C

# DataHaven endpoints (testnet defaults are provided)
VITE_DATAHAVEN_CHAIN_ID=55931
VITE_DATAHAVEN_RPC_URL=/dh-rpc
VITE_DATAHAVEN_WSS_URL=/dh-ws
VITE_DATAHAVEN_MSP_URL=/dh-msp
VITE_DATAHAVEN_MSP_TIMEOUT_MS=300000
VITE_DATAHAVEN_FILESYSTEM_ADDRESS=0x0000000000000000000000000000000000000404
```

For contract deployment via Hardhat (optional):

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
DEPLOYER_PRIVATE_KEY=0xyourPrivateKey   # use a throwaway dev wallet
```

### 3. Run the dApp locally

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Working With the Smart Contract

The `GameAssetVault` contract is deployed to Sepolia and configured via `VITE_CONTRACT_ADDRESS`.

### Compile

```bash
npm run contracts:compile
```

### Deploy to Sepolia

```bash
npm run contracts:deploy:sepolia
```

The deployment script [`scripts/deploy.ts`](scripts/deploy.ts) logs the new address in a clear format:

```text
================ GameAssetVault deployed ================
Contract address: 0x...
Set this in your frontend .env as:
VITE_CONTRACT_ADDRESS=0x...
========================================================
```

Update your `.env` accordingly and restart `npm run dev`.

---

## Usage Flow

1. **Connect wallet** – connect an EVM wallet in the header.
2. **Switch network** – switch to DataHaven Testnet when prompted.
3. **Create bucket** – pick a bucket name and create it on DataHaven.
4. **Upload file** – select any file and click **Upload**:
   - File is prepared and fingerprinted.
   - Storage request is issued on DataHaven.
   - File is uploaded to the MSP backend.
   - Once ready, you receive a `cid`.
5. **Registry write (optional)** – if `VITE_CONTRACT_ADDRESS` is set:
   - The dApp switches to Sepolia.
   - Calls `saveAsset(cid)` on `GameAssetVault`.
6. **View / delete assets** – assets are loaded by CID from DataHaven; Delete triggers `deleteAsset(cid)` when the contract is configured.

---

## Development Notes

- Storage logic: [`src/utils/dataHaven.ts`](src/utils/dataHaven.ts)
- Wallet & network handling: [`src/hooks/useWallet.ts`](src/hooks/useWallet.ts)
- Main app flow: [`src/App.tsx`](src/App.tsx)

These files are good entry points if you want to understand or extend the integration.

---

## Disclaimer

This repository is a **demo** intended for educational and integration purposes only:

- No token, coin or investment product is associated with this codebase.
- Use test accounts and networks; never deploy with production/private keys you cannot rotate.
- Endpoints and contract addresses may change as the DataHaven testnet and ecosystem evolve.

Use at your own risk. Contributions and feedback are welcome.

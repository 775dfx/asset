/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_DATAHAVEN_CHAIN_ID: string;
  readonly VITE_DATAHAVEN_RPC_URL: string;
  readonly VITE_DATAHAVEN_WSS_URL: string;
  readonly VITE_DATAHAVEN_MSP_URL: string;
  readonly VITE_DATAHAVEN_FILESYSTEM_ADDRESS: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}

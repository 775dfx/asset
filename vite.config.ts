import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/rpc": {
        target: "https://rpc.sepolia.org",
        changeOrigin: true,
      },
      "/dh-rpc": {
        target: "https://services.datahaven-testnet.network",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dh-rpc/, "/testnet"),
      },
      "/dh-ws": {
        target: "wss://services.datahaven-testnet.network",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/dh-ws/, "/testnet"),
      },
      "/dh-msp": {
        target: "https://deo-dh-backend.testnet.datahaven-infra.network",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dh-msp/, ""),
      },
    },
  },
});

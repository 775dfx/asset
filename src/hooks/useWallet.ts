import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

type WalletState = {
  address?: Address;
  chainId?: number;
  isConnected: boolean;
};

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  providers?: InjectedProvider[];
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
};

const getInjectedProvider = (): InjectedProvider | undefined => {
  const ethereum = window.ethereum as InjectedProvider | undefined;
  const providers = ethereum?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    return (
      providers.find((provider) => provider.isMetaMask) ??
      providers.find((provider) => provider.isOkxWallet) ??
      providers[0]
    );
  }
  return (window as { okxwallet?: InjectedProvider }).okxwallet ?? ethereum;
};

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
  });

  const dataHavenChainId = Number(import.meta.env.VITE_DATAHAVEN_CHAIN_ID ?? 55931);
  const dataHavenRpcUrl = import.meta.env.VITE_DATAHAVEN_RPC_URL;
  const provider = useMemo(() => getInjectedProvider(), []);

  const refreshWallet = useCallback(async () => {
    if (!provider) {
      return;
    }
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];
    const chainIdHex = (await provider.request({
      method: "eth_chainId",
    })) as string;
    setWallet({
      address: accounts?.[0] as Address | undefined,
      chainId: chainIdHex ? Number.parseInt(chainIdHex, 16) : undefined,
      isConnected: accounts?.length > 0,
    });
  }, [provider]);

  const connect = useCallback(async (): Promise<Address | undefined> => {
    if (!provider) {
      throw new Error("EVM wallet not found. Install MetaMask, OKX, or another wallet.");
    }
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    const chainIdHex = (await provider.request({
      method: "eth_chainId",
    })) as string;
    const address = accounts?.[0] as Address | undefined;
    setWallet({
      address,
      chainId: chainIdHex ? Number.parseInt(chainIdHex, 16) : undefined,
      isConnected: accounts?.length > 0,
    });
    return address;
  }, [provider]);

  const switchToDataHaven = useCallback(async () => {
    if (!provider) {
      throw new Error("EVM wallet not found. Install MetaMask, OKX, or another wallet.");
    }
    if (!dataHavenRpcUrl) {
      throw new Error("VITE_DATAHAVEN_RPC_URL is not configured");
    }
    const chainIdHex = `0x${dataHavenChainId.toString(16)}`;
    const rpcUrlForWallet = dataHavenRpcUrl.startsWith("/")
      ? `${window.location.origin}${dataHavenRpcUrl}`
      : dataHavenRpcUrl;
    
    // Use the configured RPC URL, or fallback to the public one if it's a relative path/proxy
    const rpcUrlsForAdd = rpcUrlForWallet.startsWith("http") 
      ? [rpcUrlForWallet] 
      : ["https://services.datahaven-testnet.network/testnet"];

    const networkParams = {
      chainId: chainIdHex,
      chainName: "DataHaven Testnet",
      nativeCurrency: { name: "MOCK", symbol: "MOCK", decimals: 18 },
      rpcUrls: rpcUrlsForAdd,
      blockExplorerUrls: ["https://explorer.datahaven-testnet.network/"],
    };

    try {
      // Try switching first
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      await refreshWallet();
    } catch (error) {
      const err = error as { code?: number };
      // 4902 means the chain has not been added to MetaMask
      if (err.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [networkParams],
          });
          // After adding, we still need to switch (some wallets do it automatically, some don't)
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });
          await refreshWallet();
        } catch (addError) {
          throw new Error(`Failed to add DataHaven network: ${(addError as Error).message}`);
        }
      } else {
        throw error;
      }
    }
  }, [dataHavenChainId, dataHavenRpcUrl, provider, refreshWallet]);

  useEffect(() => {
    refreshWallet();
    const handleAccountsChanged = () => refreshWallet();
    const handleChainChanged = () => refreshWallet();
    provider?.on?.("accountsChanged", handleAccountsChanged);
    provider?.on?.("chainChanged", handleChainChanged);
    return () => {
      provider?.removeListener?.("accountsChanged", handleAccountsChanged);
      provider?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [provider, refreshWallet]);

  return { wallet, connect, switchToDataHaven, dataHavenChainId };
};

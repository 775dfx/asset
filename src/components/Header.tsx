import { Button } from "./Button";
type HeaderProps = {
  address?: string;
  chainId?: number;
  onConnect: () => void;
  onDisconnect?: () => void;
  isConnected?: boolean;
  expectedChainId?: number;
  onSwitchNetwork?: () => void;
};

export const Header = ({
  address,
  chainId,
  onConnect,
  onDisconnect,
  isConnected,
  expectedChainId,
  onSwitchNetwork,
}: HeaderProps) => (
  <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-vault-400">
        Web3 Storage
      </p>
      <h1 className="text-3xl md:text-4xl font-bold">Game Asset Vault</h1>
      <p className="text-slate-300 mt-2">
        Store game assets in DataHaven and pin CIDs on-chain.
      </p>
    </div>
    <div className="flex flex-col gap-2 items-start md:items-end">
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
        <div>Address: {address ?? "Not connected"}</div>
        <div>Chain: {chainId ?? "—"}</div>
      </div>
      {chainId &&
        expectedChainId &&
        chainId !== expectedChainId &&
        onSwitchNetwork && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
            <div>Wrong network. Switch to DataHaven Testnet.</div>
            <div className="mt-2">
              <Button variant="ghost" onClick={onSwitchNetwork}>
                Switch Network
              </Button>
            </div>
          </div>
        )}
      {isConnected ? (
        <Button variant="secondary" onClick={onDisconnect}>
          Disconnect Wallet
        </Button>
      ) : (
        <Button onClick={onConnect}>Connect Wallet</Button>
      )}
    </div>
  </header>
);

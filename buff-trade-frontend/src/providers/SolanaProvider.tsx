"use client";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletError } from "@solana/wallet-adapter-base";
import {
  LedgerWalletAdapter,
  SolflareWalletAdapter,
  MathWalletAdapter,
  CoinbaseWalletAdapter,
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";
import { ReactNode, useCallback, useMemo } from "react";
import { getNetworkConfig } from "@/shared/utils/networkConfig";

type Props = {
  children: ReactNode;
};

const SolanaProvider = ({ children }: Props) => {
  const { endpoint } = getNetworkConfig();

  const baseWallets = useMemo(() => {
    return [
      new PhantomWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolflareWalletAdapter(),
      new MathWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ];
  }, []);

  const wallets = useStandardWalletAdapters(baseWallets);

  const onError = useCallback((error: WalletError) => {
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true} onError={onError}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaProvider;

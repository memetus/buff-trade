import { OKXDexClient } from "@okx-dex/okx-dex-sdk";
import { BaseWallet } from "../types/etc/wallet";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

export const useOkxClient = () => {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signMessage, signTransaction } =
    useWallet();

  const wallet: BaseWallet = useMemo(() => {
    return {
      publicKey: publicKey!,
      connection: connection,
      signTransaction: signTransaction!,
      signAllTransactions: signAllTransactions!,
      signMessage: signMessage!,
      signAndSendTransaction: async (transaction, options) => {
        if (!publicKey || !signTransaction) {
          throw new Error("Wallet not connected");
        }
        const signedTransaction = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(
          signedTransaction.serialize(),
          options
        );
        return { signature };
      },
    };
  }, [
    publicKey,
    signAllTransactions,
    signMessage,
    signTransaction,
    connection,
  ]);

  const client: OKXDexClient = useMemo(() => {
    return new OKXDexClient({
      apiKey: process.env.OKX_API_KEY!,
      secretKey: process.env.OKX_SECRET_KEY!,
      apiPassphrase: process.env.OKX_API_PASSPHRASE!,
      projectId: process.env.OKX_PROJECT_ID!,
      solana: {
        wallet: {
          publicKey: wallet.publicKey!,
          connection: wallet.connection,
          signTransaction: wallet.signTransaction!,
          signAllTransactions: wallet.signAllTransactions!,
          signAndSendTransaction: wallet.signAndSendTransaction!,
          signMessage: wallet.signMessage!,
        },
      },
    });
  }, [wallet]);

  return { client };
};

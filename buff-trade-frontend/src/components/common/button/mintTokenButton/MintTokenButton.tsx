"use client";
import React, { useCallback } from "react";
import styles from "@/components/common/button/mintTokenButton/MintTokenButton.module.scss";
import classNames from "classnames/bind";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useWalletConnect } from "@/shared/hooks/useWalletConnect";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SendTransactionError, Transaction } from "@solana/web3.js";

const cx = classNames.bind(styles);

const MintTokenButton = () => {
  const { connection } = useConnection();
  const { publicKey, advancedConnect } = useWalletConnect();
  const { signTransaction } = useWallet();
  const apiHandler = useCallback(async () => {
    if (!publicKey) {
      console.info(
        "🔗 Wallet not connected, attempting to connect without signature..."
      );
      // Ensure wallet is connected without signature for token creation
      await advancedConnect(undefined, true); // Skip signature for token creation

      // Wait a bit more after connection to ensure wallet state is stable
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    // Add a small delay before token creation to ensure wallet is fully ready
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 에이전트 생성 조건 확인
    const { showAgentCreationAlert } = await import(
      "@/shared/utils/agentCreation"
    );
    if (!showAgentCreationAlert()) {
      return; // 조건을 만족하지 않으면 생성 중단
    }

    try {
      const res = await axios.post("/api/mint-with-bond", {
        name: "buff alpha",
        symbol: "alpha",
        // uri: "https://ipfs.io/ipfs/bafkreies45wghlmse7hvtln35y3aeezvpd6a5yi42ms5spvxekj4iesjji",
        uri: "https://ipfs.io/ipfs/bafkreibnhnekv72bec4wnz7shphp2rxy5v6cggy3fdlor2vllfcfi6w4bm",
        creator: publicKey.toBase58(),
        amount: 0,
      });

      return res.data;
    } catch (error) {}
  }, [publicKey, advancedConnect]);

  const mintMutation = useMutation({
    mutationKey: ["mintToken"],
    mutationFn: apiHandler,
    onSuccess: async (data) => {
      const buffer = Buffer.from(data, "base64");
      const tx = Transaction.from(buffer);

      // Update transaction with latest blockhash
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      if (publicKey) {
        tx.feePayer = publicKey;
      }

      const signedTx = await signTransaction!(tx);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: true, // Skip preflight to avoid simulation errors
          preflightCommitment: "confirmed",
          maxRetries: 3,
        }
      );

      return connection.confirmTransaction(signature, "confirmed");
    },
    onError: async (error) => {
      if (error instanceof SendTransactionError) {
        const logs = await error.getLogs(connection);
      } else {
      }
    },
  });

  const handleOnClick = useCallback(() => {
    mintMutation.mutate();
  }, [mintMutation]);

  return (
    <button
      className={cx("button")}
      aria-label="mint-token"
      onClick={handleOnClick}
    >
      <span className={cx("button-text")}>Mint Token</span>
    </button>
  );
};

export default MintTokenButton;

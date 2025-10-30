"use client";
import React, { useCallback } from "react";
import styles from "@/components/common/button/mintTokenWithBuyButton/MintTokenWithBuyButton.module.scss";
import classNames from "classnames/bind";
import axios from "axios";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletConnect } from "@/shared/hooks/useWalletConnect";
import { useMutation } from "@tanstack/react-query";
import { SendTransactionError, Transaction } from "@solana/web3.js";

const cx = classNames.bind(styles);

const MintTokenWithBuyButton = () => {
  const { connection } = useConnection();
  const { publicKey, advancedConnect } = useWalletConnect();
  const { signTransaction, signAllTransactions } = useWallet();
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
        amount: 0.01,
      });

      return res.data;
    } catch (error) {}
  }, [publicKey, advancedConnect]);

  const mintMutation = useMutation({
    mutationKey: ["mintToken"],
    mutationFn: apiHandler,
    onSuccess: async (data) => {
      const config = Transaction.from(Buffer.from(data.configTx, "base64"));
      const swap = Transaction.from(Buffer.from(data.swapTx, "base64"));

      // Update transactions with latest blockhash
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      config.recentBlockhash = blockhash;
      swap.recentBlockhash = blockhash;
      if (publicKey) {
        config.feePayer = publicKey;
        swap.feePayer = publicKey;
      }

      const signedTx = await signAllTransactions!([config, swap]);

      const signature = await connection.sendRawTransaction(
        signedTx[0].serialize(),
        {
          skipPreflight: false, // Enable preflight for mainnet safety
          preflightCommitment: "confirmed",
          maxRetries: 3,
        }
      );
      const res = await connection.confirmTransaction(signature, "confirmed");
      if (res.context.slot && res.value.err === null) {
        const swapSignature = await connection.sendRawTransaction(
          signedTx[1].serialize(),
          {
            skipPreflight: false, // Enable preflight for mainnet safety
            preflightCommitment: "confirmed",
            maxRetries: 3,
          }
        );
        const swapRes = await connection.confirmTransaction(
          swapSignature,
          "confirmed"
        );
        return swapRes;
      } else {
      }
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
      aria-label="mint-token-with-buy"
      onClick={handleOnClick}
    >
      <span className={cx("button-text")}>Mint Token With Buy</span>
    </button>
  );
};

export default MintTokenWithBuyButton;

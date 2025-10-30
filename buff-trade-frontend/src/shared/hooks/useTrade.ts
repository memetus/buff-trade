import { useCallback } from "react";
import {
  Keypair,
  VersionedTransaction,
  Connection,
  TransactionInstruction,
  PublicKey,
  AddressLookupTableAccount,
  TransactionMessage,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { useWalletConnect } from "./useWalletConnect";
import { useWallet } from "@solana/wallet-adapter-react";
import { getNetworkConfig } from "@/shared/utils/networkConfig";
import { useQueryClient } from "@tanstack/react-query";
import { queryKey } from "@/shared/constants/queryKey";

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}

interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  outAmount: string;
}

interface InstructionAccount {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

interface Instruction {
  programId: string;
  accounts: InstructionAccount[];
  data: string;
}

interface SwapInstructionsResponse {
  tokenLedgerInstruction?: Instruction;
  computeBudgetInstructions: Instruction[];
  setupInstructions: Instruction[];
  swapTransaction: string;
  cleanupInstruction?: Instruction;
  addressLookupTableAddresses: string[];
  error?: string;
}

export const useTrade = () => {
  const { publicKey, advancedConnect } = useWalletConnect();
  const { signTransaction } = useWallet();
  const baseUrl: string = "https://lite-api.jup.ag";
  const { isMainnet } = getNetworkConfig();
  const jupiterCluster = isMainnet ? undefined : "devnet";
  const queryClient = useQueryClient();

  const invalidateBalance = useCallback(() => {
    if (publicKey) {
      queryClient.invalidateQueries({
        queryKey: [queryKey.fetchBalance, publicKey.toBase58()],
      });
    }
  }, [publicKey, queryClient]);

  // Create network connection
  const createNetworkConnection = useCallback(() => {
    const { endpoint, network } = getNetworkConfig();

    return new Connection(endpoint, "confirmed");
  }, []);

  const getQuote = useCallback(
    async (params: QuoteParams): Promise<QuoteResponse> => {
      try {
        const url = new URL(`${baseUrl}/swap/v1/quote`);
        url.searchParams.append("inputMint", params.inputMint);
        url.searchParams.append("outputMint", params.outputMint);
        url.searchParams.append("amount", params.amount.toString());
        url.searchParams.append("slippageBps", params.slippageBps.toString());
        // You can add restrictIntermediateTokens for more stable routes
        url.searchParams.append("restrictIntermediateTokens", "true");

        if (jupiterCluster) {
          url.searchParams.append("cluster", jupiterCluster);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: QuoteResponse = await response.json();
        return data;
      } catch (error) {
        // ignore error
        throw error;
      }
    },
    [jupiterCluster]
  );

  const getSwapInstructions = useCallback(
    async (
      quoteResponse: QuoteResponse,
      userPublicKey: string,
      dynamicComputeUnitLimit: boolean,
      dynamicSlippage: boolean
    ): Promise<SwapInstructionsResponse> => {
      try {
        const swapUrl = new URL(`${baseUrl}/swap/v1/swap`);
        if (jupiterCluster) {
          swapUrl.searchParams.append("cluster", jupiterCluster);
        }

        const response = await fetch(swapUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey,
            payer: userPublicKey, // This is the wallet that will pay for the swap (required)
            dynamicComputeUnitLimit, // Estimate compute units dynamically
            dynamicSlippage, // Estimate slippage dynamically
            // Priority fee optimization
            prioritizationFeeLamports: {
              priorityLevelWithMaxLamports: {
                maxLamports: 1000000, // Cap fee at 0.001 SOL
                global: false, // Use local fee market for better estimation
                priorityLevel: "veryHigh", // veryHigh === 75th percentile for better landing
              },
            },
            ...(jupiterCluster ? { cluster: jupiterCluster } : {}),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: SwapInstructionsResponse = await response.json();

        if (data.error) {
          throw new Error("Failed to get swap instructions: " + data.error);
        }
        return data;
      } catch (error) {
        // ignore error
        throw error;
      }
    },
    [jupiterCluster]
  );

  const quoteAndBuildSwapInstructions = useCallback(
    async (isSell = false, customAmount?: string) => {
      // Ensure wallet is connected without signature for trading
      if (!publicKey) {
        await advancedConnect(undefined, true); // Skip signature for trading

        // Wait a bit more after connection to ensure wallet state is stable
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return;
      }

      // Add a small delay before trading to ensure wallet is fully ready
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Calculate amount based on input
      let calculatedAmount: number;

      if (customAmount && parseFloat(customAmount) > 0) {
        if (isSell) {
          // For sell: input is HOMO tokens (6 decimals)
          calculatedAmount = Math.floor(parseFloat(customAmount) * 1000000);
        } else {
          // For buy: input is SOL (9 decimals)
          calculatedAmount = Math.floor(parseFloat(customAmount) * 1000000000);
        }
      } else {
        // Default amounts
        calculatedAmount = 1000000;
      }

      const quoteParams: QuoteParams = {
        inputMint: isSell
          ? "7Uuzh9JwqF8z3u6MWpQuQJbpD1u46xPDY6PGjwfwTh4o" // HOMO token
          : "So11111111111111111111111111111111111111112", // SOL
        outputMint: isSell
          ? "So11111111111111111111111111111111111111112" // SOL
          : "7Uuzh9JwqF8z3u6MWpQuQJbpD1u46xPDY6PGjwfwTh4o", // HOMO token
        amount: calculatedAmount,
        slippageBps: 300, // 3%
      };

      try {
        const quote = await getQuote(quoteParams);

        if (!quote.outAmount) {
          throw new Error("No outAmount found in quote response");
        }

        //  1. Get swap instructions
        const swapInstructions = await getSwapInstructions(
          quote,
          publicKey!.toBase58(),
          true,
          true
        );

        const quoteConnection = createNetworkConnection();

        // Helper function to deserialize instructions
        const deserializeInstruction = (
          instruction: Instruction
        ): TransactionInstruction => {
          return new TransactionInstruction({
            programId: new PublicKey(instruction.programId),
            keys: instruction.accounts.map((key) => ({
              pubkey: new PublicKey(key.pubkey),
              isSigner: key.isSigner,
              isWritable: key.isWritable,
            })),
            data: Buffer.from(instruction.data, "base64"),
          });
        };

        // Helper function to get address lookup table accounts
        const getAddressLookupTableAccounts = async (
          keys: string[]
        ): Promise<AddressLookupTableAccount[]> => {
          const addressLookupTableAccountInfos =
            await quoteConnection.getMultipleAccountsInfo(
              keys.map((key) => new PublicKey(key))
            );

          return addressLookupTableAccountInfos.reduce(
            (
              acc: AddressLookupTableAccount[],
              accountInfo: any,
              index: number
            ) => {
              const addressLookupTableAddress = keys[index];
              if (accountInfo) {
                const addressLookupTableAccount = new AddressLookupTableAccount(
                  {
                    key: new PublicKey(addressLookupTableAddress),
                    state: AddressLookupTableAccount.deserialize(
                      accountInfo.data
                    ),
                  }
                );
                acc.push(addressLookupTableAccount);
              }

              return acc;
            },
            new Array<AddressLookupTableAccount>()
          );
        };

        // 2. Get address lookup table accounts
        const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
        // if (swapInstructions.addressLookupTableAddresses .length > 0) {
        //   addressLookupTableAccounts.push(
        //     ...(await getAddressLookupTableAccounts(
        //       swapInstructions.addressLookupTableAddresses
        //     ))
        //   );
        // }

        // 3. Build instructions array
        const instructions: TransactionInstruction[] = [];

        // 4. Add compute budget instructions if any
        // if (swapInstructions.computeBudgetInstructions.length > 0) {
        //   instructions.push(
        //     ...swapInstructions.computeBudgetInstructions.map(
        //       deserializeInstruction
        //     )
        //   );
        // }

        // 5. Add setup instructions
        // if (swapInstructions.setupInstructions.length > 0) {
        //   instructions.push(
        //     ...swapInstructions.setupInstructions.map(deserializeInstruction)
        //   );
        // }

        // 6. Add the swap instruction
        // instructions.push(
        //   deserializeInstruction(swapInstructions.swapInstruction)
        // );

        // // 7. Add cleanup instruction if available
        // if (swapInstructions.cleanupInstruction) {
        //   instructions.push(
        //     deserializeInstruction(swapInstructions.cleanupInstruction)
        //   );
        // }

        const tx = VersionedTransaction.deserialize(
          Buffer.from(swapInstructions.swapTransaction, "base64")
        );

        // Update transaction with latest blockhash
        const txConnection = createNetworkConnection();
        const { blockhash } = await txConnection.getLatestBlockhash(
          "confirmed"
        );

        if (tx.message && tx.message.recentBlockhash) {
          tx.message.recentBlockhash = blockhash;
        }

        // Sign the transaction
        const signedTx = await signTransaction!(tx);

        // 8. Send via API route to avoid CORS issues
        if (!signedTx) {
          throw new Error(
            "Failed to sign transaction after all retry attempts"
          );
        }

        const signedTransactionBase64 = Buffer.from(
          signedTx.serialize()
        ).toString("base64");

        const apiResponse = await fetch("/api/send-transaction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signedTransaction: signedTransactionBase64,
          }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          // ignore error

          // Check if it's a simulation error that we can ignore
          if (errorData.error && errorData.error.includes("시뮬레이션")) {
            // Don't throw error for simulation issues
            return;
          }

          throw new Error(
            errorData.error || `API error: ${apiResponse.status}`
          );
        }

        const result = await apiResponse.json();

        if (result.error) {
          // ignore error

          // Check if it's a simulation error that we can ignore
          if (result.error.includes("시뮬레이션")) {
            return;
          }

          throw new Error(result.error);
        }

        // Calculate trade amounts for display
        const inputAmount = isSell
          ? (quoteParams.amount / 1000000).toFixed(2) // HOMO tokens (6 decimals)
          : (quoteParams.amount / 1000000000).toFixed(2); // SOL (9 decimals)
        const outputAmount = isSell
          ? (parseInt(quote.outAmount) / 1000000000).toFixed(2) // SOL (9 decimals)
          : (parseInt(quote.outAmount) / 1000000).toFixed(2); // HOMO (6 decimals)

        const inputCurrency = isSell ? "HOMO" : "SOL";
        const outputCurrency = isSell ? "SOL" : "HOMO";

        const amountSol = isSell
          ? parseInt(quote.outAmount) / 1_000_000_000
          : quoteParams.amount / 1_000_000_000;
        const amountToken = isSell
          ? quoteParams.amount / 1_000_000
          : parseInt(quote.outAmount) / 1_000_000;
        const price = amountToken > 0 ? amountSol / amountToken : undefined;
        const timestamp = Date.now();

        window.dispatchEvent(
          new CustomEvent("mainnet-trade", {
            detail: {
              type: isSell ? "sell" : "buy",
              price,
              timestamp,
              amountSol,
              amountToken,
            },
          })
        );

        window.dispatchEvent(
          new CustomEvent("trade-success", {
            detail: {
              type: isSell ? "sell" : "buy",
              timestamp,
            },
          })
        );

        invalidateBalance();

        return;
      } catch (error) {
        // ignore error
      }
    },
    [
      getQuote,
      getSwapInstructions,
      publicKey,
      signTransaction,
      createNetworkConnection,
      invalidateBalance,
      advancedConnect,
    ]
  );

  // Simple balance check function using direct RPC connection
  const checkSufficientBalance = useCallback(async () => {
    if (!publicKey) return false;

    try {
      const balanceConnection = createNetworkConnection();
      const lamports = await balanceConnection.getBalance(publicKey);
      const balanceSol = lamports / LAMPORTS_PER_SOL;

      return balanceSol >= 0.01; // Require at least 0.01 SOL for mainnet
    } catch (error) {
      // ignore error
      return true; // Assume sufficient to avoid blocking UI
    }
  }, [publicKey, createNetworkConnection]);

  // Simple refresh balance function using direct RPC connection
  const refreshBalance = useCallback(async () => {
    if (!publicKey) return null;

    try {
      const refreshConnection = createNetworkConnection();
      const lamports = await refreshConnection.getBalance(publicKey);
      const balanceSol = lamports / LAMPORTS_PER_SOL;

      return {
        balance: balanceSol,
        sufficient: balanceSol >= 0.003,
        timestamp: Date.now(),
      };
    } catch (error) {
      // ignore error
      return null;
    }
  }, [publicKey, createNetworkConnection]);

  return {
    getQuote,
    getSwapInstructions,
    quoteAndBuildSwapInstructions,
    checkSufficientBalance,
    refreshBalance,
  };
};

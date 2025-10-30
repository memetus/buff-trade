import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ConfigParameters,
  DynamicBondingCurveClient,
  PoolService,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { useCallback, useMemo } from "react";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  Connection,
} from "@solana/web3.js";
import { SwapMode } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { BN } from "bn.js";
import { useWalletConnect } from "./useWalletConnect";
import { useSignMessage } from "./useSignMessage";
import { useQueryClient } from "@tanstack/react-query";
// import { queryKey } from "@/shared/constants/queryKey";

export const useBondingCurve = () => {
  const { publicKey, advancedConnect } = useWalletConnect();
  const { signMessage, message, verifySign } = useSignMessage();
  const { connection } = useConnection();
  const { signTransaction, signAllTransactions } = useWallet();
  const queryClient = useQueryClient();

  const invalidateBalance = useCallback(() => {
    if (publicKey) {
      queryClient.invalidateQueries({
        queryKey: ["fetchBalance", publicKey.toBase58()],
      });
    }
  }, [publicKey, queryClient]);

  // 메인넷 연결과 SDK 클라이언트를 useMemo로 최적화
  const { networkConnection, curveClient, poolService } = useMemo(() => {
    // 항상 메인넷 사용
    const endpoint = process.env.NEXT_PUBLIC_HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
      : "https://api.mainnet-beta.solana.com";

    const networkConnection = new Connection(endpoint, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 120000,
    });

    const curveClient: DynamicBondingCurveClient =
      DynamicBondingCurveClient.create(networkConnection);
    const poolService = new PoolService(networkConnection, "confirmed");

    return { networkConnection, curveClient, poolService };
  }, []); // 빈 의존성 배열로 한 번만 초기화

  // Note: requestTradeSignature removed - message signing is now handled during wallet connection

  const buyToken = useCallback(
    async (poolAddress: string, amount: number, tokenSymbol?: string) => {
      if (!publicKey) {
        // Ensure wallet is connected without signature for trading
        await advancedConnect(undefined, true); // Skip signature for trading

        // Wait a bit more after connection to ensure wallet state is stable
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return;
      }

      // Add a small delay before trading to ensure wallet is fully ready
      await new Promise((resolve) => setTimeout(resolve, 200));

      // handleTx 함수를 buyToken 내부로 이동
      const handleTx = async (
        signature: string,
        tokenSymbol: string,
        amount: number,
        isSell: boolean,
        poolAddress: string,
        estimatedOutUi?: number | null
      ) => {
        // 성공 메시지 생성
        const action = isSell ? "Sell" : "Buy";
        const fromToken = isSell ? tokenSymbol : "SOL";
        const toToken = isSell ? "SOL" : tokenSymbol;
        const estimatedOutput =
          typeof estimatedOutUi === "number" && Number.isFinite(estimatedOutUi)
            ? estimatedOutUi
            : isSell
            ? amount * 0.001
            : amount * 0.001;

        // 잔액 새로고침
        invalidateBalance();

        // 트랜잭션 정보를 서버에 저장
        try {
          // URL 파라미터나 localStorage에서 fundId 가져오기
          const urlParams = new URLSearchParams(window.location.search);
          const fundIdFromUrl = urlParams.get("fundId");
          const fundIdFromStorage = localStorage.getItem("fundId");
          const fundId = fundIdFromUrl || fundIdFromStorage;

          if (fundId) {
            const saveTransactionData = {
              fundId: fundId,
              tokenTicker: tokenSymbol,
              tokenAddress: poolAddress, // poolAddress를 tokenAddress로 사용
              type: isSell ? "sell" : "buy",
              solAmount: isSell ? estimatedOutput : amount,
              tokenAmount: isSell ? amount : estimatedOutput,
            };

            // 인증 토큰 가져오기
            const authToken = localStorage.getItem("accessToken");

            const response = await fetch("/api/token/save-token-transaction", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
              },
              body: JSON.stringify(saveTransactionData),
            });

            if (response.ok) {
              const result = await response.json();
            } else {
              const errorText = await response.text();
            }
          }
        } catch (error) {}
      };

      // Meteora SDK의 올바른 pool 객체 생성
      // getPool 메서드가 없으므로 PublicKey를 직접 사용
      const pool = new PublicKey(poolAddress);

      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      // 잔액 확인
      const balance = await networkConnection.getBalance(publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      if (balanceSOL < amount + 0.01) {
        const shortfall = amount + 0.01 - balanceSOL;
        throw new Error(
          `Insufficient SOL balance! You have ${balanceSOL.toFixed(
            2
          )} SOL, but need ${(amount + 0.01).toFixed(
            2
          )} SOL (including fees).\n` +
            `Shortfall: ${shortfall.toFixed(2)} SOL\n\n` +
            `To get mainnet SOL:\n` +
            `1. Purchase SOL from an exchange\n` +
            `2. Transfer to your wallet address: ${publicKey.toString()}\n` +
            `3. Ensure you have sufficient SOL for transactions\n` +
            `4. Try again after receiving SOL`
        );
      }

      try {
        // Note: Message signature should be done during wallet connection, not here
        // await requestTradeSignature();

        // Pool 존재 확인
        const accountInfo = await networkConnection.getAccountInfo(pool);
        if (!accountInfo) {
          console.error(`❌ Pool account not found on mainnet: ${poolAddress}`);
          throw new Error(
            `Pool account not found on mainnet: ${poolAddress}. This pool may not exist on the mainnet or may have been migrated.`
          );
        }

        // Account discriminator 확인 (첫 8바이트)
        const discriminator = accountInfo.data.slice(0, 8);

        // Meteora SDK가 기대하는 discriminator와 비교
        // Pool이 실제로 Meteora 프로그램에 속하는지 확인
        // Meteora SDK의 다른 방법들 시도

        // Pre-calc UI estimate from pool price for success toast (non-blocking)
        let estimatedOutUi: number | null = null;
        try {
          const resp = await fetch("/api/bonding-curve/pools-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addresses: [poolAddress] }),
          });
          if (resp.ok) {
            const data: any = await resp.json();
            const pool0 = data?.poolsInfo?.[0];
            let price = pool0?.tokenPrice ? parseFloat(pool0.tokenPrice) : NaN;
            if (!Number.isFinite(price) || price <= 0) {
              // derive price from reserves: quote/base * 10^(baseDec - quoteDec) = quote/base * 1e-3
              const parseMaybeHexToBigInt = (v: any): bigint => {
                try {
                  if (v === undefined || v === null) return BigInt(0);
                  const s = String(v).trim();
                  if (s.length === 0) return BigInt(0);
                  if (/^0x/i.test(s)) return BigInt(s);
                  if (/^[0-9]+$/.test(s)) return BigInt(s);
                  if (/^[0-9a-fA-F]+$/.test(s)) return BigInt("0x" + s);
                  return BigInt(0);
                } catch {
                  return BigInt(0);
                }
              };
              const baseReserve = parseMaybeHexToBigInt(
                pool0?.poolInfo?.baseReserve
              );
              const quoteReserve = parseMaybeHexToBigInt(
                pool0?.poolInfo?.quoteReserve
              );
              if (baseReserve > BigInt(0) && quoteReserve > BigInt(0)) {
                const ratio = Number(quoteReserve) / Number(baseReserve);
                const derived = ratio * 1e-3; // base 6d, quote 9d
                if (Number.isFinite(derived) && derived > 0) price = derived;
              }
            }
            if (Number.isFinite(price) && price > 0) {
              estimatedOutUi = amount / price; // buy: SOL → token
            }
          }
        } catch {}

        // 1) swap 시도
        try {
          const tx = await poolService.swap({
            pool,
            amountIn: new BN(lamports),
            minimumAmountOut: new BN(0),
            swapBaseForQuote: false,
            owner: publicKey,
            payer: publicKey,
            referralTokenAccount: null,
          });
          // Update transaction with latest blockhash
          const { blockhash } = await networkConnection.getLatestBlockhash(
            "confirmed"
          );
          tx.recentBlockhash = blockhash;
          tx.feePayer = publicKey;

          if (!signTransaction)
            throw new Error("No signTransaction function available");

          const signed = await signTransaction(tx);
          const sig = await networkConnection.sendRawTransaction(
            signed.serialize(),
            {
              skipPreflight: false, // Enable preflight for mainnet safety
              preflightCommitment: "confirmed",
              maxRetries: 5, // 재시도 횟수 증가
            }
          );
          try {
            await networkConnection.confirmTransaction(sig, "confirmed");
          } catch (confirmationError) {
            console.warn("⚠️ swap confirmation warning:", confirmationError);
            // Check if it's a simulation error that we can ignore
            if (
              confirmationError instanceof Error &&
              confirmationError.message.includes("시뮬레이션")
            ) {
            }
          }
          handleTx(
            sig,
            tokenSymbol || "TOKEN",
            amount,
            false,
            poolAddress,
            estimatedOutUi
          );
          return { value: { signature: sig } } as any;
        } catch (_swapError) {
          // 2) swap2 시도
          try {
            const tx2 = await poolService.swap2({
              pool,
              amountIn: new BN(lamports),
              minimumAmountOut: new BN(0),
              swapBaseForQuote: false,
              owner: publicKey,
              payer: publicKey,
              referralTokenAccount: null,
              swapMode: SwapMode.PartialFill,
            });
            // set fee payer + recent blockhash
            tx2.feePayer = publicKey;
            const { blockhash: blockhash2 } =
              await networkConnection.getLatestBlockhash("finalized");
            tx2.recentBlockhash = blockhash2;
            if (!signTransaction)
              throw new Error("No signTransaction function available");
            const signed2 = await signTransaction(tx2);
            const sig2 = await networkConnection.sendRawTransaction(
              signed2.serialize(),
              {
                skipPreflight: false, // Enable preflight for mainnet safety
                preflightCommitment: "confirmed",
                maxRetries: 5, // 재시도 횟수 증가
              }
            );
            try {
              await networkConnection.confirmTransaction(sig2, "confirmed");
            } catch (confirmationError) {
              console.warn("⚠️ swap2 confirmation warning:", confirmationError);
            }
            handleTx(
              sig2,
              tokenSymbol || "TOKEN",
              amount,
              false,
              poolAddress,
              estimatedOutUi
            );
            return { value: { signature: sig2 } } as any;
          } catch (swap2Error) {
            const lastMsg =
              swap2Error instanceof Error
                ? swap2Error.message
                : String(swap2Error);
            throw new Error(
              `All Meteora SDK methods failed. Last error: ${lastMsg}`
            );
          }
        }
      } catch (error) {
        console.error("❌ All trading methods failed:", error);
        throw error;
      }
    },
    [
      publicKey,
      networkConnection,
      poolService,
      signTransaction,
      invalidateBalance,
      advancedConnect,
    ]
  );

  const sellToken = useCallback(
    async (
      poolAddress: string,
      amount: number,
      decimals: number = 6,
      tokenSymbol?: string
    ) => {
      // handleTx 함수를 sellToken 내부로 이동
      const handleTx = async (
        signature: string,
        tokenSymbol: string,
        amount: number,
        isSell: boolean,
        poolAddress: string,
        estimatedOutUi?: number | null
      ) => {
        // 성공 메시지 생성
        const action = isSell ? "Sell" : "Buy";
        const fromToken = isSell ? tokenSymbol : "SOL";
        const toToken = isSell ? "SOL" : tokenSymbol;
        const estimatedOutput =
          typeof estimatedOutUi === "number" && Number.isFinite(estimatedOutUi)
            ? estimatedOutUi
            : isSell
            ? amount * 0.001
            : amount * 0.001;

        // 잔액 새로고침
        invalidateBalance();

        // 트랜잭션 정보를 서버에 저장
        try {
          // URL 파라미터나 localStorage에서 fundId 가져오기
          const urlParams = new URLSearchParams(window.location.search);
          const fundIdFromUrl = urlParams.get("fundId");
          const fundIdFromStorage = localStorage.getItem("fundId");
          const fundId = fundIdFromUrl || fundIdFromStorage;

          if (fundId) {
            const saveTransactionData = {
              fundId: fundId,
              tokenTicker: tokenSymbol,
              tokenAddress: poolAddress, // poolAddress를 tokenAddress로 사용
              type: isSell ? "sell" : "buy",
              solAmount: isSell ? estimatedOutput : amount,
              tokenAmount: isSell ? amount : estimatedOutput,
            };

            // 인증 토큰 가져오기
            const authToken = localStorage.getItem("accessToken");

            const response = await fetch("/api/token/save-token-transaction", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
              },
              body: JSON.stringify(saveTransactionData),
            });

            if (response.ok) {
              const result = await response.json();
            } else {
              const errorText = await response.text();
              console.error(
                "❌ [TRANSACTION-SAVE] Failed:",
                response.status,
                errorText
              );
            }
          } else {
            console.warn(
              "⚠️ [TRANSACTION-SAVE] No fundId found in localStorage"
            );
          }
        } catch (error) {
          console.error("❌ [TRANSACTION-SAVE] Error:", error);
          // 트랜잭션 저장 실패해도 메인 트랜잭션에는 영향 없음
          // 에러 로그만 출력하고 계속 진행
        }
      };
      if (!publicKey) {
        // Ensure wallet is connected without signature for trading
        await advancedConnect(undefined, true); // Skip signature for trading

        // Wait a bit more after connection to ensure wallet state is stable
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return;
      }

      // Add a small delay before trading to ensure wallet is fully ready
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Meteora SDK의 올바른 pool 객체 생성
      // getPool 메서드가 없으므로 PublicKey를 직접 사용
      const pool = new PublicKey(poolAddress);

      const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

      try {
        // Note: Message signature should be done during wallet connection, not here
        // await requestTradeSignature();

        // Meteora SDK의 다른 방법들 시도

        // 1. swap 메서드 시도
        try {
          const tx = await poolService.swap({
            pool,
            amountIn: new BN(tokenAmount),
            minimumAmountOut: new BN(0),
            swapBaseForQuote: true, // true for Token(base) -> SOL(quote)
            owner: publicKey,
            payer: publicKey,
            referralTokenAccount: null,
          });
          // set fee payer + recent blockhash
          tx.feePayer = publicKey;
          const { blockhash } = await networkConnection.getLatestBlockhash(
            "finalized"
          );
          tx.recentBlockhash = blockhash;
          if (!signTransaction)
            throw new Error("No signTransaction function available");
          const signed = await signTransaction(tx);
          const sig = await networkConnection.sendRawTransaction(
            signed.serialize(),
            {
              skipPreflight: false, // Enable preflight for mainnet safety
              preflightCommitment: "confirmed",
              maxRetries: 5, // 재시도 횟수 증가
            }
          );
          try {
            await networkConnection.confirmTransaction(sig, "confirmed");
          } catch (confirmationError) {
            console.warn(
              "⚠️ sell swap confirmation warning:",
              confirmationError
            );
          }
          handleTx(sig, tokenSymbol || "TOKEN", amount, true, poolAddress);
          return { value: { signature: sig } } as any;
        } catch (_swapError) {
          // 2. swap2 메서드 시도
          try {
            const tx2 = await poolService.swap2({
              pool,
              amountIn: new BN(tokenAmount),
              minimumAmountOut: new BN(0),
              swapBaseForQuote: true, // true for Token(base) -> SOL(quote)
              owner: publicKey,
              payer: publicKey,
              referralTokenAccount: null,
              swapMode: SwapMode.PartialFill,
            });
            // set fee payer + recent blockhash
            tx2.feePayer = publicKey;
            const { blockhash: blockhash2 } =
              await networkConnection.getLatestBlockhash("finalized");
            tx2.recentBlockhash = blockhash2;
            if (!signTransaction)
              throw new Error("No signTransaction function available");
            const signed2 = await signTransaction(tx2);
            const sig2 = await networkConnection.sendRawTransaction(
              signed2.serialize(),
              {
                skipPreflight: false, // Enable preflight for mainnet safety
                preflightCommitment: "confirmed",
                maxRetries: 5, // 재시도 횟수 증가
              }
            );
            try {
              await networkConnection.confirmTransaction(sig2, "confirmed");
            } catch (confirmationError) {
              console.warn(
                "⚠️ sell swap2 confirmation warning:",
                confirmationError
              );
            }
            handleTx(sig2, tokenSymbol || "TOKEN", amount, true, poolAddress);
            return { value: { signature: sig2 } } as any;
          } catch (swap2Error) {
            const lastMsg =
              swap2Error instanceof Error
                ? swap2Error.message
                : String(swap2Error);
            throw new Error(
              `All Meteora SDK methods failed. Last error: ${lastMsg}`
            );
          }
        }
      } catch (error) {
        console.error("❌ All trading methods failed:", error);
        throw error;
      }
    },
    [
      publicKey,
      networkConnection,
      poolService,
      signTransaction,
      invalidateBalance,
      advancedConnect,
    ]
  );

  // Resolve actual Meteora pool address helpers
  const getPoolAddressByBaseMint = useCallback(
    async (baseMint: string) => {
      try {
        // Some SDK builds expose state on the client; use 'any' to avoid type friction
        const state: any = (curveClient as unknown as any).state;
        if (!state) {
          console.warn("⚠️ Meteora client has no state accessor");
          return null;
        }
        const pool = await state.getPoolByBaseMint(new PublicKey(baseMint));
        const addr = pool?.publicKey?.toBase58?.() ?? null;
        return addr;
      } catch (e) {
        console.warn("⚠️ getPoolAddressByBaseMint failed:", e);
        return null;
      }
    },
    [curveClient]
  );

  const getPoolAddressesByConfig = useCallback(
    async (configAddress: string) => {
      try {
        const state: any = (curveClient as unknown as any).state;
        if (!state) {
          console.warn("⚠️ Meteora client has no state accessor");
          return [] as string[];
        }
        const pools = await state.getPoolsByConfig(
          new PublicKey(configAddress)
        );
        const list = (pools || [])
          .map((p: any) => p?.publicKey?.toBase58?.())
          .filter(Boolean);
        return list as string[];
      } catch (e) {
        console.warn("⚠️ getPoolAddressesByConfig failed:", e);
        return [] as string[];
      }
    },
    [curveClient]
  );

  // Bulk claim all trading fees function
  const claimAllTradingFees = useCallback(
    async (poolsFeesData: any[]) => {
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }

      if (!Array.isArray(poolsFeesData) || poolsFeesData.length === 0) {
        throw new Error("No pools fees data provided");
      }

      const claimablePools = poolsFeesData.filter((pool: any) => {
        const maxBaseAmount = pool.creatorBaseFee
          ? new BN(pool.creatorBaseFee, 16)
          : new BN(0);
        const maxQuoteAmount = pool.creatorQuoteFee
          ? new BN(pool.creatorQuoteFee, 16)
          : new BN(0);
        const partnerBaseAmount = pool.partnerBaseFee
          ? new BN(pool.partnerBaseFee, 16)
          : new BN(0);
        const partnerQuoteAmount = pool.partnerQuoteFee
          ? new BN(pool.partnerQuoteFee, 16)
          : new BN(0);

        return (
          !maxBaseAmount.isZero() ||
          !maxQuoteAmount.isZero() ||
          !partnerBaseAmount.isZero() ||
          !partnerQuoteAmount.isZero()
        );
      });

      if (claimablePools.length === 0) {
        return {
          success: false,
          message: "No claimable fees found in any pools.",
          claimedPools: [],
        };
      }

      const results = [];
      const transaction = new Transaction();
      const { blockhash } = await networkConnection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      for (const pool of claimablePools) {
        try {
          const poolAddress = pool.poolAddress || pool.pool || pool.address;
          if (!poolAddress) continue;

          const maxBaseAmount = pool.creatorBaseFee
            ? new BN(pool.creatorBaseFee, 16)
            : new BN(0);
          const maxQuoteAmount = pool.creatorQuoteFee
            ? new BN(pool.creatorQuoteFee, 16)
            : new BN(0);

          // Add claim instruction to the transaction
          const claimInstruction =
            await curveClient.creator.claimCreatorTradingFee({
              creator: publicKey,
              payer: publicKey,
              pool: new PublicKey(poolAddress),
              maxBaseAmount: maxBaseAmount,
              maxQuoteAmount: maxQuoteAmount,
            });

          // Add all instructions from the claim transaction
          claimInstruction.instructions.forEach((instruction) => {
            transaction.add(instruction);
          });

          results.push({
            poolAddress,
            success: true,
            baseFeesClaimed: maxBaseAmount.toString(),
            quoteFeesClaimed: maxQuoteAmount.toString(),
          });
        } catch (error) {
          console.error(`❌ Failed to add claim instruction for pool:`, error);
          results.push({
            poolAddress: pool.poolAddress || pool.pool || pool.address,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      if (transaction.instructions.length === 0) {
        return {
          success: false,
          message: "No valid claim instructions could be created.",
          claimedPools: results,
        };
      }

      try {
        // Sign and send the bulk transaction
        const signedTransaction = await signTransaction!(transaction);
        const signature = await networkConnection.sendRawTransaction(
          signedTransaction.serialize()
        );

        // Wait for confirmation
        await networkConnection.confirmTransaction(signature, "confirmed");

        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

        return {
          success: true,
          signature,
          claimedPools: results,
          message: `Successfully claimed fees from ${
            results.filter((r) => r.success).length
          } pools.`,
          explorerUrl,
        };
      } catch (error) {
        console.error("❌ Bulk claim transaction failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          message: "Bulk claim transaction failed.",
          claimedPools: results,
        };
      }
    },
    [publicKey, networkConnection, signTransaction, curveClient]
  );

  // Creator claim trading fee function (single pool)
  const claimCreatorTradingFee = useCallback(
    async (poolAddress: string, poolsFeesData: any[]) => {
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }

      const targetPoolAddress = poolAddress.trim();
      let normalizedPoolAddress = targetPoolAddress;

      if (!Array.isArray(poolsFeesData) || poolsFeesData.length === 0) {
        throw new Error("No pools fees data provided");
      }

      try {
        const normalizePoolAddress = (pool: any): string | null => {
          if (!pool) return null;
          const candidates = [
            pool.poolAddress,
            pool.pool,
            pool.address,
            pool.pool_address,
            pool.poolPublicKey,
            pool.publicKey,
          ];

          for (const value of candidates) {
            if (!value) continue;
            if (typeof value === "string") {
              const trimmed = value.trim();
              return trimmed.length ? trimmed : null;
            }
            if (typeof value === "object") {
              if (typeof value.toBase58 === "function") {
                const base58 = value.toBase58();
                if (base58 && base58 !== "[object Object]") {
                  return base58;
                }
              }
              if (typeof value.toString === "function") {
                const str = value.toString();
                if (str && str !== "[object Object]") {
                  return str;
                }
              }
              if (typeof value.base58 === "string") {
                return value.base58;
              }
              if (typeof value.address === "string") {
                return value.address;
              }
            }
          }

          return null;
        };

        // Validate pool address format
        try {
          new PublicKey(targetPoolAddress);
        } catch (error) {
          throw new Error(`Invalid pool address format: ${targetPoolAddress}`);
        }

        // Find matching pool fee info

        const poolFeeInfo = poolsFeesData.find((pool: any) => {
          const poolAddr = normalizePoolAddress(pool);
          return poolAddr === targetPoolAddress;
        });

        if (!poolFeeInfo) {
          const availablePools = poolsFeesData
            .map((pool: any) => normalizePoolAddress(pool))
            .filter((addr: string | null): addr is string => Boolean(addr));
          throw new Error(
            `No claimable fees found for pool: ${targetPoolAddress}. Available pools: ${availablePools.join(
              ", "
            )}`
          );
        }

        normalizedPoolAddress =
          normalizePoolAddress(poolFeeInfo) || targetPoolAddress;

        // Convert hex fee strings to BN objects
        const convertHexToBN = (hexValue: string): InstanceType<typeof BN> => {
          if (!hexValue || hexValue === "00") return new BN(0);
          return new BN(hexValue, 16);
        };

        const maxBaseAmount = convertHexToBN(poolFeeInfo.creatorBaseFee);
        const maxQuoteAmount = convertHexToBN(poolFeeInfo.creatorQuoteFee);
        const partnerBaseAmount = convertHexToBN(poolFeeInfo.partnerBaseFee);
        const partnerQuoteAmount = convertHexToBN(poolFeeInfo.partnerQuoteFee);

        // Use unclaimedRewardsLamport from API response if available
        const unclaimedRewardsLamport = poolFeeInfo.unclaimedRewardsLamport
          ? convertHexToBN(poolFeeInfo.unclaimedRewardsLamport)
          : maxBaseAmount.add(maxQuoteAmount);

        const hasCreatorFees =
          !maxBaseAmount.isZero() || !maxQuoteAmount.isZero();
        const hasPartnerFees =
          !partnerBaseAmount.isZero() || !partnerQuoteAmount.isZero();
        const hasUnclaimedRewards = !unclaimedRewardsLamport.isZero();

        if (!hasCreatorFees && !hasPartnerFees && !hasUnclaimedRewards) {
          return {
            success: false,
            message: "No fees available to claim for this pool.",
            pool: normalizedPoolAddress,
            creator: publicKey.toString(),
            debug: {
              hasCreatorFees,
              hasPartnerFees,
              hasUnclaimedRewards,
              maxBaseAmount: maxBaseAmount.toString(),
              maxQuoteAmount: maxQuoteAmount.toString(),
              partnerBaseAmount: partnerBaseAmount.toString(),
              partnerQuoteAmount: partnerQuoteAmount.toString(),
              unclaimedRewardsLamport: unclaimedRewardsLamport.toString(),
            },
          };
        }

        let transaction: Transaction;

        // Use Meteora SDK to create the claim transaction
        transaction = await curveClient.creator.claimCreatorTradingFee({
          creator: publicKey,
          payer: publicKey,
          pool: new PublicKey(normalizedPoolAddress),
          maxBaseAmount: maxBaseAmount,
          maxQuoteAmount: maxQuoteAmount,
        });

        // Set latest blockhash and fee payer (REQUIRED for transaction signing)
        const { blockhash } = await networkConnection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Sign and send transaction
        const signedTransaction = await signTransaction!(transaction);
        const signature = await networkConnection.sendRawTransaction(
          signedTransaction.serialize()
        );

        // Wait for confirmation
        await networkConnection.confirmTransaction(signature, "confirmed");

        // Log explorer URL for verification
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

        // Check account balance before and after (for verification)
        try {
          const balanceAfter = await networkConnection.getBalance(publicKey);
        } catch (error) {}

        return {
          success: true,
          signature,
          pool: normalizedPoolAddress,
          creator: publicKey.toString(),
          baseFeesClaimed: maxBaseAmount.toString(),
          quoteFeesClaimed: maxQuoteAmount.toString(),
          message: "Creator trading fee has been successfully claimed.",
        };
      } catch (error) {
        console.error("Error claiming creator trading fee:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: errorMessage,
          message: errorMessage,
          pool: normalizedPoolAddress,
        };
      }
    },
    [publicKey, networkConnection, signTransaction, curveClient]
  );

  // Note: handleTx function moved inside buyToken and sellToken functions

  return {
    buyToken,
    sellToken,
    claimCreatorTradingFee,
    getPoolAddressByBaseMint,
    getPoolAddressesByConfig,
    async mintTokenCreateBond(
      mint: Keypair,
      name: string,
      symbol: string,
      uri: string,
      creator: string,
      curve: Keypair,
      config: ConfigParameters,
      quoteMint: string,
      feeClaimerOrSystem: string
    ): Promise<{ signature: string }> {
      if (!publicKey || !signTransaction)
        throw new Error("Wallet not connected");

      // Note: Message signature should be done during wallet connection, not here
      // await requestTradeSignature();

      // Ensure sufficient SOL balance for rents + fees on mainnet
      const balanceLamports = await networkConnection.getBalance(publicKey);
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
      if (balanceSol < 0.05) {
        throw new Error(
          `Insufficient SOL on mainnet. Need at least 0.05 SOL to create. Current: ${balanceSol.toFixed(
            2
          )} SOL. Purchase SOL from an exchange to top up.`
        );
      }

      const payer = publicKey;
      const leftoverReceiver = feeClaimerOrSystem
        ? new PublicKey(feeClaimerOrSystem)
        : payer;

      const createTx = await poolService.createConfigAndPool({
        payer,
        config: curve.publicKey,
        feeClaimer: payer,
        leftoverReceiver,
        quoteMint: new PublicKey(quoteMint),
        ...config,
        preCreatePoolParam: {
          name,
          symbol,
          baseMint: mint.publicKey,
          uri,
          poolCreator: payer,
        },
      });

      // Sign & send
      const { blockhash } = await networkConnection.getLatestBlockhash();
      createTx.recentBlockhash = blockhash;
      createTx.feePayer = payer;
      createTx.partialSign(curve, mint);
      try {
        const signedTx = await signTransaction(createTx);
        const signature = await networkConnection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: false, // Enable preflight for mainnet safety
            preflightCommitment: "confirmed",
            maxRetries: 3,
          }
        );

        await networkConnection.confirmTransaction(signature, "confirmed");
        invalidateBalance();
        return { signature };
      } catch (e) {
        console.error("❌ [METEORA-CREATE] Full error details:", e);
        console.error(
          "❌ [METEORA-CREATE] Error message:",
          e instanceof Error ? e.message : String(e)
        );
        console.error(
          "❌ [METEORA-CREATE] Error stack:",
          e instanceof Error ? e.stack : "No stack"
        );

        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes("User rejected") ||
          msg.includes("WalletSignTransactionError")
        ) {
          throw new Error("WALLET_REJECTED");
        }
        throw e;
      }
    },
    // Restore legacy API for token creation + first buy (client-side convenience)
    async mintTokenCreateBondAndBuy(
      mint: Keypair,
      name: string,
      symbol: string,
      uri: string,
      creator: string,
      curve: Keypair,
      config: ConfigParameters,
      quoteMint: string,
      feeClaimerOrSystem: string,
      firstBuyAmountSOL?: number,
      creationFeeSOL?: number
    ): Promise<{ signature: string }> {
      if (!publicKey || (!signTransaction && !signAllTransactions))
        throw new Error("Wallet not connected");

      // Note: Message signature should be done during wallet connection, not here
      // await requestTradeSignature();

      // Ensure sufficient SOL balance for rents + fees on mainnet
      const balanceLamports = await networkConnection.getBalance(publicKey);
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
      // todo: const minRequired = (firstBuyAmountSOL || 0) + 0.05;
      const minRequired = (firstBuyAmountSOL || 0) + 0.001; // Test mode: reduced fees

      if (balanceSol < minRequired) {
        const shortfall = minRequired - balanceSol;
        throw new Error(
          `Insufficient SOL on mainnet (Test mode). Need ~${minRequired.toFixed(
            2
          )} SOL (including first buy + fees). Shortfall: ${shortfall.toFixed(
            2
          )} SOL. Purchase SOL from an exchange to top up.`
        );
      }

      const payer = publicKey;
      const leftoverReceiver = feeClaimerOrSystem
        ? new PublicKey(feeClaimerOrSystem)
        : payer;
      const lamports = Math.floor((firstBuyAmountSOL || 0) * LAMPORTS_PER_SOL);

      const res = await poolService.createConfigAndPoolWithFirstBuy({
        payer,
        config: curve.publicKey,
        feeClaimer: new PublicKey(feeClaimerOrSystem), // Partner address 사용
        leftoverReceiver,
        quoteMint: new PublicKey(quoteMint),
        ...config,
        preCreatePoolParam: {
          name,
          symbol,
          baseMint: mint.publicKey,
          uri,
          poolCreator: payer,
        },
        firstBuyParam: {
          buyer: payer,
          receiver: payer,
          buyAmount: new BN(lamports),
          minimumAmountOut: new BN(1),
          referralTokenAccount: null,
        },
      });

      let { blockhash } = await networkConnection.getLatestBlockhash();

      // Optional creation fee to system address from UI
      const creationFeeLamports = Math.floor(
        (creationFeeSOL || 0) * LAMPORTS_PER_SOL
      );
      const feeTx = new Transaction();
      if (creationFeeLamports > 0) {
        feeTx.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: leftoverReceiver,
            lamports: creationFeeLamports,
          })
        );
        feeTx.recentBlockhash = blockhash;
        feeTx.feePayer = payer;
      }

      // Split transactions: fee is separate to avoid "malicious" warning
      // Complex multi-instruction transactions trigger Phantom warnings
      let feeSignature: string | null = null;

      // Send creation fee first (if any) as separate simple transaction
      if (creationFeeLamports > 0) {
        try {
          const feeOnlyTx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: payer,
              toPubkey: leftoverReceiver,
              lamports: creationFeeLamports,
            })
          );
          feeOnlyTx.recentBlockhash = blockhash;
          feeOnlyTx.feePayer = payer;

          const signedFee = await signTransaction!(feeOnlyTx);
          feeSignature = await networkConnection.sendRawTransaction(
            signedFee.serialize(),
            { skipPreflight: false, maxRetries: 3 }
          );

          await networkConnection.confirmTransaction(feeSignature, "confirmed");

          // Update blockhash for next transaction
          const { blockhash: newBlockhash } =
            await networkConnection.getLatestBlockhash();
          blockhash = newBlockhash;
        } catch (feeError) {
          console.warn("⚠️ Creation fee transaction failed:", feeError);
          // Continue without fee - don't block token creation
        }
      }

      // Combine config + pool instructions (avoiding fee in same tx)
      const instructions = [
        ...res.createConfigTx.instructions,
        ...res.createPoolTx.instructions,
      ];

      const configTx = new Transaction().add(...instructions);
      configTx.recentBlockhash = blockhash;
      configTx.feePayer = payer;

      // Detailed instruction logging to debug "malicious" warning
      configTx.instructions.forEach((ix, idx) => {
        const programId = ix.programId.toString();
        const isMeteora =
          programId === "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
        const isSystemProgram =
          programId === "11111111111111111111111111111111";
        const isSPLToken =
          programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        const isMetaplex =
          programId === "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
      });

      // Partial sign is required for Meteora SDK (curve and mint keypairs)
      // This is safe as Meteora is a known protocol
      configTx.partialSign(curve, mint);

      // Sign with wallet
      const signedCfg = await signTransaction!(configTx);

      // swapTx blockhash will be set later with fresh blockhash
      const swapTx = res.swapBuyTx as Transaction | undefined;

      try {
        // Send the signed transaction
        const sigCfg = await networkConnection.sendRawTransaction(
          signedCfg.serialize(),
          {
            skipPreflight: false, // Enable preflight for mainnet safety
            preflightCommitment: "confirmed",
            maxRetries: 3,
          }
        );

        await networkConnection.confirmTransaction(sigCfg, "confirmed");

        // brief delay so wallets/indexers can fetch new mint metadata
        await new Promise((r) => setTimeout(r, 800));

        if (swapTx) {
          // Get fresh blockhash for swap transaction
          const { blockhash: freshBlockhash } =
            await networkConnection.getLatestBlockhash();
          swapTx.recentBlockhash = freshBlockhash;
          swapTx.feePayer = payer;

          swapTx.instructions.forEach((ix, idx) => {
            const programId = ix.programId.toString();
            const isMeteora =
              programId === "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
            const isSystemProgram =
              programId === "11111111111111111111111111111111";
            const isSPLToken =
              programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
            const isMetaplex =
              programId === "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
          });

          const signedSwap = await signTransaction!(swapTx);

          const sigSwap = await networkConnection.sendRawTransaction(
            signedSwap.serialize(),
            {
              skipPreflight: false, // Enable preflight for mainnet safety
              preflightCommitment: "confirmed",
              maxRetries: 5, // 재시도 횟수 증가
            }
          );

          await networkConnection.confirmTransaction(sigSwap, "confirmed");
          invalidateBalance();
          return { signature: sigSwap };
        }
        invalidateBalance();
        return { signature: sigCfg };
      } catch (e) {
        console.error("❌ [TX-LOG] Transaction failed with error:");
        console.error(
          "- Error Type:",
          e instanceof Error ? e.constructor.name : typeof e
        );
        console.error(
          "- Error Message:",
          e instanceof Error ? e.message : String(e)
        );

        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e !== null
            ? JSON.stringify(e, null, 2)
            : String(e);

        console.error("❌ [METEORA-CREATE-BUY] Processed message:", msg);

        // InstructionError 처리
        if ((e as any)?.InstructionError) {
          const instructionError = (e as any).InstructionError;
          const errorDetails = Array.isArray(instructionError)
            ? `Instruction ${instructionError[0]}: ${JSON.stringify(
                instructionError[1]
              )}`
            : JSON.stringify(instructionError);
          console.error("❌ [TX-LOG] Instruction Error:", errorDetails);
          throw new Error(`InstructionError: ${errorDetails}`);
        }
        if (
          msg.includes("User rejected") ||
          msg.includes("WalletSignTransactionError")
        ) {
          console.error("❌ [TX-LOG] Wallet rejected the transaction");
          throw new Error("WALLET_REJECTED");
        }
        throw e;
      }
    },
  };
};

"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AgentHeader from "./components/AgentHeader";
import MigrationBanner from "./components/MigrationBanner";
import PoolInfoSection from "./components/PoolInfoSection";
import StrategySection from "./components/StrategySection";
import TopPortfolios from "./components/TopPortfolios";
import ChartSection from "./components/ChartSection";
import TokenInfoCard from "./components/TokenInfoCard";
import TransactionsTable, {
  TransactionsTabs,
} from "./components/TransactionsTable";
import TradingPanel from "./components/TradingPanel";
import AgentInfoSection from "./components/AgentInfoSection";
import DropdownSection from "./components/DropdownSection";
import VirtualFundStats from "./components/VirtualFundStats";
import LoadingBar from "./components/LoadingBar";
import CopySuccessMessage from "./components/CopySuccessMessage";
import {
  AgentMetadata,
  PoolInfo,
  PoolsResponse,
  LoadingState,
  TradeMode,
  ChartTab,
  ActiveTab,
} from "./types";
import styles from "./page.module.scss";
import classNames from "classnames/bind";
import { useTrade } from "../../shared/hooks/useTrade";
import { useWalletConnect } from "../../shared/hooks/useWalletConnect";
import { useBondingCurve } from "../../shared/hooks/useBondingCurve";
import { useCopy } from "../../shared/hooks/useCopy";
import { API_ENDPOINTS, buildUrl } from "@/shared/constants/api";
import { STORAGE_KEYS, storage } from "@/shared/constants/storage";
import { getNetworkConfig } from "@/shared/utils/networkConfig";
import dynamic from "next/dynamic";
import Image from "next/image";
import { trackBuySuccess, trackBuyFail } from "@/shared/utils/ga4";
import TradingViewSkeleton from "@/components/common/skeleton/TradingViewSkeleton";

const cx = classNames.bind(styles);

const TradingViewPageContent = () => {
  const { isDevnet: isDevnetCluster, network: activeNetwork } =
    getNetworkConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] =
    React.useState<ActiveTab>("token-transactions");
  const [chartTab, setChartTab] = React.useState<ChartTab>("token-graph");
  const [tradeMode, setTradeMode] = React.useState<TradeMode>("buy");
  const [agentMetadata, setAgentMetadata] =
    React.useState<AgentMetadata | null>(null);
  const [poolInfo, setPoolInfo] = React.useState<PoolInfo[]>([]);
  const [poolLoading, setPoolLoading] = React.useState(false);
  const [topPortfolios, setTopPortfolios] = React.useState<any[]>([]);
  const [graphData, setGraphData] = React.useState<any[]>([]);
  const [graphLoading, setGraphLoading] = React.useState(false);
  const [agentMetadataLoading, setAgentMetadataLoading] = React.useState(true);
  const [topPortfoliosLoading, setTopPortfoliosLoading] = React.useState(true);
  const [lastTrade, setLastTrade] = React.useState<any>(null);
  const [quoteOutAmount, setQuoteOutAmount] = React.useState<string>("");
  const [minReceived, setMinReceived] = React.useState<string>("");
  const [isQuoteLoading, setIsQuoteLoading] = React.useState<boolean>(false);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [isDevnetToken, setIsDevnetToken] = React.useState<boolean>(false);
  // 입력 금액 상태 (quote 계산에서 사용하므로 상단으로 이동)
  const [inputAmount, setInputAmount] = React.useState<string>("");

  // Devnet 환경 감지
  // Force devnet in preview or development to avoid accidental mainnet swaps
  const isDevnetEnvironment =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ||
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "preview";

  const tokenMint =
    agentMetadata?.tokenAddress || searchParams.get("token") || "";
  const tokenSymbol = agentMetadata?.ticker || searchParams.get("symbol") || "";
  const tokenDecimals = parseInt(searchParams.get("decimals") || "6");
  const tokenName = agentMetadata?.name || tokenSymbol;
  const marketCap = agentMetadata?.marketCap || 0;
  const isMigration = agentMetadata?.isMigration || false;
  const strategy = agentMetadata?.strategy || "";
  const website = agentMetadata?.website || "";
  const twitter = agentMetadata?.twitter || "";
  const telegram = agentMetadata?.telegram || "";
  const targetMarketCap = agentMetadata?.targetMarketCap || 0;
  // Derive Market Cap Progress as (marketCap / targetMarketCap) * 100, clamped 0-100
  const marketCapProgress =
    targetMarketCap > 0
      ? Math.min(100, Math.max(0, (marketCap / targetMarketCap) * 100))
      : 0;
  const marketCapProgressFill =
    marketCapProgress > 0 && marketCapProgress < 1 ? 1 : marketCapProgress;
  const creatorAddress = agentMetadata?.creator || "";

  const { quoteAndBuildSwapInstructions, checkSufficientBalance } = useTrade();

  // useBondingCurve 훅 사용 (Meteora SDK - post-migration)
  const { buyToken, sellToken } = useBondingCurve();

  const hasGraduated = React.useMemo(() => {
    if (agentMetadata?.realTrading) return true;
    if (agentMetadata?.survived) return true;
    if (poolInfo.some((pool) => pool?.poolInfo?.isMigrated === 1)) return true;
    return false;
  }, [agentMetadata, poolInfo]);

  const shouldUseMeteora = React.useMemo(() => {
    if (isDevnetCluster) return true;
    return (
      !hasGraduated ||
      isDevnetEnvironment ||
      (isDevnetToken && !!agentMetadata?.poolAddress) ||
      !!agentMetadata?.poolAddress // poolAddress가 있으면 Meteora SDK 사용
    );
  }, [
    isDevnetCluster,
    hasGraduated,
    isDevnetEnvironment,
    isDevnetToken,
    agentMetadata,
  ]);

  const shouldUseJupiter = !shouldUseMeteora;

  const getFundId = React.useCallback(() => {
    const fromUrl = searchParams.get("fundId");
    const fromStorage = storage.get(STORAGE_KEYS.FUND_ID);
    const fundId = fromUrl || fromStorage || null;

    if (fromUrl && fromUrl !== fromStorage) {
      storage.set(STORAGE_KEYS.FUND_ID, fromUrl);
    }

    return fundId;
  }, [searchParams]);

  React.useEffect(() => {
    if (
      hasGraduated &&
      isDevnetToken &&
      !isDevnetCluster &&
      !isDevnetEnvironment
    ) {
      setIsDevnetToken(false);
    }
  }, [hasGraduated, isDevnetToken, isDevnetCluster, isDevnetEnvironment]);

  // 지갑 연결 상태 확인
  const { publicKey, connected } = useWalletConnect();

  // 복사 기능
  const { textCopy } = useCopy();

  // 복사 성공 메시지 표시
  const [copySuccess, setCopySuccess] = React.useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    textCopy(text);
    setCopySuccess(`${label} 가 복사되었습니다`);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // 지갑 주소 로깅 (디버깅용)
  React.useEffect(() => {
    // tokenMint가 없으면 quote 시도하지 않음
    if (!tokenMint) {
      return;
    }

    // live quote preview on amount or mode change
    const fetchPreview = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0) {
        setQuoteOutAmount("");
        setMinReceived("");
        setQuoteError(null);
        return;
      }

      setIsQuoteLoading(true);
      setQuoteError(null);

      try {
        const slippageBps = 250; // 2.5%

        // Bonding curve (pre-graduation) or devnet: use Meteora data
        if (shouldUseMeteora) {
          // Resolve pool address (URL → metadata → localStorage → SDK)
          let poolAddress =
            searchParams.get("poolAddress") || agentMetadata?.poolAddress || "";

          const fundId =
            searchParams.get("fundId") || storage.get(STORAGE_KEYS.FUND_ID);

          if (!poolAddress && fundId) {
            const tokenData = localStorage.getItem(`token_${fundId}`);
            if (tokenData) {
              try {
                const parsed = JSON.parse(tokenData);
                poolAddress = parsed?.poolAddress || poolAddress;
              } catch {}
            }
          }

          if (!poolAddress) {
            try {
              const userTokens = JSON.parse(
                localStorage.getItem("homo_tokens") || "[]"
              );
              const currentToken = userTokens.find(
                (t: any) => t.fundId === fundId || t.tokenAddress === tokenMint
              );
              poolAddress = currentToken?.poolAddress || poolAddress;
            } catch {}
          }

          // 수동으로 만든 토큰도 동일한 API를 사용하도록 변경
          if (!poolAddress && tokenMint) {
            // 먼저 localStorage에서 poolAddress 찾기
            const fundId = getFundId();
            if (fundId) {
              const tokenKey = `token_${fundId}`;
              const tokenData = localStorage.getItem(tokenKey);
              if (tokenData) {
                try {
                  const parsed = JSON.parse(tokenData);
                  poolAddress = parsed.poolAddress;
                } catch (e) {}
              }
            }
          }

          // if (!poolAddress) {
          //   setQuoteError("Devnet pool address not found for this token");
          //   setQuoteOutAmount("");
          //   setMinReceived("");
          //   return;
          // }

          // Load pool info from backend
          const resp = await fetch("/api/bonding-curve/pools-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addresses: [poolAddress] }),
          });

          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(
              `Failed to load devnet pool info: ${resp.status} ${text}`
            );
          }

          const result: PoolsResponse = await resp.json();
          const pool = result?.poolsInfo?.[0] as any;

          // Price resolution with robust fallbacks
          const priceCandidates: number[] = [];

          // 1) direct tokenPrice string/number
          const directPrice = (() => {
            if (!pool) return NaN;
            const p =
              typeof pool.tokenPrice === "string"
                ? parseFloat(pool.tokenPrice as string)
                : typeof pool.tokenPrice === "number"
                ? (pool.tokenPrice as number)
                : NaN;
            return Number.isFinite(p) && p > 0 ? p : NaN;
          })();
          if (Number.isFinite(directPrice) && directPrice > 0) {
            priceCandidates.push(directPrice);
          }

          // 2) derive from reserves if available: price = (quote/base) * 10^(baseDec - quoteDec) = (quote/base) * 1e-3
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

          const baseReserveBi = parseMaybeHexToBigInt(
            pool?.poolInfo?.baseReserve
          );
          const quoteReserveBi = parseMaybeHexToBigInt(
            pool?.poolInfo?.quoteReserve
          );
          if (baseReserveBi > BigInt(0) && quoteReserveBi > BigInt(0)) {
            // Adjust decimals: base 6, quote 9 → multiply by 1e-3
            const ratio = Number(quoteReserveBi) / Number(baseReserveBi);
            if (Number.isFinite(ratio) && ratio > 0) {
              const derived = ratio * 1e-3;
              if (Number.isFinite(derived) && derived > 0) {
                priceCandidates.push(derived);
              }
            }
          }

          const DEFAULT_DEVNET_PRICE = 0.000001; // fallback ~1e-6 SOL per token
          let price =
            priceCandidates.find((p) => Number.isFinite(p) && p > 0) ?? NaN;

          if (!Number.isFinite(price) || price <= 0) {
            price = DEFAULT_DEVNET_PRICE;
          }

          const amountNum = parseFloat(inputAmount);
          const outUi =
            tradeMode === "buy" ? amountNum / price : amountNum * price;
          const minUi = outUi * (1 - slippageBps / 10_000);

          setQuoteOutAmount(outUi.toFixed(tradeMode === "buy" ? 2 : 6));
          setMinReceived(minUi.toFixed(tradeMode === "buy" ? 2 : 6));
          return;
        }

        // Mainnet or graduated: Jupiter API
        const amount =
          tradeMode === "buy"
            ? Math.floor(parseFloat(inputAmount) * 1_000_000_000) // SOL 9d
            : Math.floor(parseFloat(inputAmount) * 1_000_000); // token 6d

        const inputMint =
          tradeMode === "buy"
            ? "So11111111111111111111111111111111111111112"
            : tokenMint;
        const outputMint =
          tradeMode === "buy"
            ? tokenMint
            : "So11111111111111111111111111111111111111112";

        const quoteUrl = buildUrl(API_ENDPOINTS.JUPITER_QUOTE, {
          inputMint,
          outputMint,
          amount: String(amount),
          slippageBps: String(slippageBps),
          restrictIntermediateTokens: "true",
          ...(isDevnetEnvironment ? { cluster: "devnet" } : {}),
        });

        const resp = await fetch(quoteUrl);

        if (!resp.ok) {
          const errorText = await resp.text();

          try {
            const errorData = JSON.parse(errorText);

            if (errorData.errorCode === "TOKEN_NOT_TRADABLE") {
              setIsDevnetToken(true);
              setQuoteOutAmount("");
              setMinReceived("");
              return;
            } else if (errorData.error) {
              throw new Error(errorData.error);
            }
          } catch (parseError) {}

          throw new Error(
            `Failed to get quote1: ${resp.status} - ${errorText}`
          );
        }

        const quote = await resp.json();
        const out = parseInt(quote.outAmount || "0", 10);
        if (out > 0) {
          const outUi =
            tradeMode === "buy" ? out / 1_000_000 : out / 1_000_000_000; // token 6d vs SOL 9d
          const minUi = outUi * (1 - slippageBps / 10_000);
          setQuoteOutAmount(outUi.toFixed(tradeMode === "buy" ? 2 : 6));
          setMinReceived(minUi.toFixed(tradeMode === "buy" ? 2 : 6));
        } else {
          setQuoteOutAmount("");
          setMinReceived("");
          setQuoteError("No liquidity available");
        }
      } catch (e) {
        // For bonding-curve/devnet fallback errors, keep UI quiet
        if (shouldUseMeteora) {
          setQuoteOutAmount("");
          setMinReceived("");
          setQuoteError(null);
        } else {
          setQuoteOutAmount("");
          setMinReceived("");
          setQuoteError(
            `Failed to get quote: ${
              e instanceof Error ? e.message : "Unknown error"
            }`
          );
        }
      } finally {
        setIsQuoteLoading(false);
      }
    };
    fetchPreview();
  }, [
    inputAmount,
    tradeMode,
    tokenMint,
    poolInfo,
    isDevnetEnvironment,
    searchParams,
    agentMetadata,
    shouldUseMeteora,
    getFundId,
  ]);

  // Remove popstate handling to let browser handle back button naturally
  // This prevents unwanted redirects to landing page

  // Load agent metadata when fundId is available
  React.useEffect(() => {
    const loadAgentMetadata = async () => {
      const fundId = getFundId();

      if (!fundId) {
        setAgentMetadata(null);
        setAgentMetadataLoading(false);
        return;
      }

      setAgentMetadataLoading(true);

      try {
        const cardResp = await fetch(`/api/agent-card/${fundId}`);

        if (!cardResp.ok) {
          setAgentMetadata(null);
          return;
        }

        const cardData = await cardResp.json();

        let resolvedStrategy: string = cardData.strategy || "";
        if (!resolvedStrategy || resolvedStrategy.trim().length === 0) {
          try {
            const metaResp = await fetch(`/api/agent-metadata/${fundId}`);
            if (metaResp.ok) {
              const meta = await metaResp.json();
              resolvedStrategy =
                meta?.strategy ||
                meta?.strategyPrompt ||
                meta?.tradingStrategy ||
                meta?.trading_strategy ||
                meta?.prompt ||
                "";
            }
          } catch (e) {}
        }
        if (!resolvedStrategy || resolvedStrategy.trim().length === 0) {
          try {
            const userTokens = storage.getJSON(STORAGE_KEYS.USER_TOKENS) || [];
            const t = (userTokens as any[]).find((x) => x?.fundId === fundId);
            resolvedStrategy = t?.strategy || resolvedStrategy;
          } catch {}
          if (!resolvedStrategy || resolvedStrategy.trim().length === 0) {
            try {
              const legacy = JSON.parse(
                localStorage.getItem("homo_tokens") || "[]"
              );
              const t = (legacy as any[]).find((x) => x?.fundId === fundId);
              resolvedStrategy = t?.strategy || resolvedStrategy;
            } catch {}
          }
        }

        let totalPnL = cardData.totalPnL;

        if (totalPnL === undefined || totalPnL === null) {
          try {
            const statResp = await fetch(`/api/agent-stat/${fundId}`);
            if (statResp.ok) {
              const statData = await statResp.json();
              totalPnL = statData.totalPnL;
            }
          } catch (error) {}
        }

        const mappedData: AgentMetadata = {
          fundId: cardData.fundId,
          name: cardData.name,
          ticker: cardData.ticker,
          creator: cardData.creator,
          tokenAddress: cardData.tokenAddress,
          marketCap: cardData.marketCap,
          isMigration: cardData.isMigration || false,
          website: cardData.website,
          twitter: cardData.twitter,
          telegram: cardData.telegram,
          strategy: resolvedStrategy || "",
          imageUrl: cardData.imageUrl,
          createdAt: cardData.createdAt,
          marketCapProgress: cardData.marketCapProgress,
          targetMarketCap: cardData.targetMarketCap,
          nav: cardData.nav,
          realizedProfit: cardData.realizedProfit,
          unrealizedProfit: cardData.unrealizedProfit,
          totalPnL: totalPnL,
          poolAddress: cardData.poolAddress,
        };

        setAgentMetadata(mappedData);
        const existingTokens = storage.getJSON(STORAGE_KEYS.USER_TOKENS) || [];
        const updatedTokens = existingTokens.map((token: any) => {
          if (token.fundId === fundId) {
            return {
              ...token,
              marketCap: mappedData.marketCap || token.marketCap,
              marketCapProgress:
                mappedData.marketCapProgress || token.marketCapProgress,
              targetMarketCap:
                mappedData.targetMarketCap || token.targetMarketCap,
              isMigration:
                mappedData.isMigration !== undefined
                  ? mappedData.isMigration
                  : token.isMigration,
              strategy: mappedData.strategy || token.strategy,
              website: mappedData.website || token.website,
              twitter: mappedData.twitter || token.twitter,
              telegram: mappedData.telegram || token.telegram,
              imageUrl: mappedData.imageUrl || token.imageUrl,
              nav: mappedData.nav || token.nav,
              realizedProfit: mappedData.realizedProfit || token.realizedProfit,
              unrealizedProfit:
                mappedData.unrealizedProfit || token.unrealizedProfit,
              totalPnL: mappedData.totalPnL || token.totalPnL,
            };
          }
          return token;
        });
        storage.setJSON(STORAGE_KEYS.USER_TOKENS, updatedTokens);
      } catch (error) {
        setAgentMetadata(null);
      } finally {
        setAgentMetadataLoading(false);
      }
    };

    loadAgentMetadata();
  }, [getFundId]);

  // Load pool information when agent metadata is available
  React.useEffect(() => {
    const loadPoolInfo = async () => {
      if (!agentMetadata?.poolAddress) {
        setPoolInfo([]);
        setPoolLoading(false);
        return;
      }

      setPoolLoading(true);
      try {
        // load pool info for address

        const requestBody = {
          addresses: [agentMetadata.poolAddress],
        };

        const response = await fetch("/api/bonding-curve/pools-info", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: PoolsResponse = await response.json();
        // pool info loaded

        if (result.success && result.poolsInfo) {
          setPoolInfo(result.poolsInfo);
        } else {
          setPoolInfo([]);
        }
      } catch (error) {
      } finally {
        setPoolLoading(false);
      }
    };

    loadPoolInfo();
  }, [agentMetadata]);

  // Load top portfolios data
  React.useEffect(() => {
    const loadTopPortfolios = async () => {
      const fundId = getFundId();

      if (!fundId) {
        setTopPortfolios([]);
        setTopPortfoliosLoading(false);
        return;
      }

      setTopPortfoliosLoading(true);

      try {
        const response = await fetch(
          `/api/top-portfolios/${fundId}?page=1&pageSize=10`
        );
        if (response.ok) {
          const data = await response.json();
          setTopPortfolios(data.results || []);
        } else {
          setTopPortfolios([]);
        }
      } catch (error) {
        setTopPortfolios([]);
      } finally {
        setTopPortfoliosLoading(false);
      }
    };

    loadTopPortfolios();
  }, [getFundId]);

  // Load last trade data
  React.useEffect(() => {
    const loadLastTrade = async () => {
      const fundId = getFundId();

      if (fundId) {
        try {
          // Get the latest transaction (page=1, pageSize=1)
          const response = await fetch(
            `/api/agent-data/token-transactions/${fundId}?page=1&pageSize=1`
          );
          if (response.ok) {
            const data = await response.json();
            const transactions = data.results || data.transactions || [];
            if (transactions.length > 0) {
              setLastTrade(transactions[0]);
            } else {
              setLastTrade(null);
            }
          } else {
            setLastTrade(null);
          }
        } catch (error) {
          setLastTrade(null);
        }
      }
    };

    loadLastTrade();
  }, [searchParams, getFundId]);

  // Load graph data
  React.useEffect(() => {
    const loadGraphData = async () => {
      const fundId = getFundId();

      if (!fundId) {
        setGraphData([]);
        setGraphLoading(false);
        return;
      }

      setGraphLoading(true);
      try {
        // loading graph data
        const response = await fetch(`/api/agent-graph/${fundId}`);
        // graph response

        if (response.ok) {
          const raw = await response.json();
          // Normalize to [{ timestamp: string, value: number }]
          const pickArray = (obj: any): any[] => {
            if (Array.isArray(obj)) return obj;
            if (Array.isArray(obj?.data)) return obj.data;
            if (Array.isArray(obj?.result)) return obj.result;
            if (Array.isArray(obj?.results)) return obj.results;
            if (Array.isArray(obj?.graph)) return obj.graph;
            return [];
          };

          const arr = pickArray(raw);

          const toTimestampString = (v: any): string => {
            if (typeof v === "string") return v;
            if (typeof v === "number") {
              // seconds or ms
              const ms = v < 2_000_000_000 ? v * 1000 : v;
              return new Date(ms).toISOString();
            }
            return new Date().toISOString();
          };

          const mapped = arr
            .map((item: any) => {
              const ts =
                item.timestamp ??
                item.time ??
                item.date ??
                item.createdAt ??
                item.updatedAt;
              const val =
                item.value ?? item.nav ?? item.NAV ?? item.price ?? item.y;
              if (ts === undefined || val === undefined) return null;
              const valueNum = typeof val === "number" ? val : parseFloat(val);
              if (Number.isNaN(valueNum)) return null;
              return {
                timestamp: toTimestampString(ts),
                value: valueNum,
              };
            })
            .filter(Boolean);

          setGraphData(mapped as any[]);
        } else {
          const errorText = await response.text();
          setGraphData([]);
        }
      } catch (error) {
        setGraphData([]);
      } finally {
        setGraphLoading(false);
      }
    };

    loadGraphData();
  }, [searchParams, getFundId]);

  const [actualBalance, setActualBalance] = React.useState<number | null>(null);

  const [isTrading, setIsTrading] = React.useState(false);
  const [loadingState, setLoadingState] = React.useState<LoadingState>("idle");
  const [loadingMessage, setLoadingMessage] = React.useState("");

  const handleBackToAgents = () => {
    // URL 파라미터에서 이전 페이지 확인
    const from = searchParams.get("from");

    // 브라우저 히스토리 길이 확인
    const hasHistory = window.history.length > 1;

    switch (from) {
      case "agent":
        router.push("/agent");
        break;
      case "main":
        // main에서 왔다면 landing page 대신 이전 페이지로
        if (hasHistory) {
          router.back();
        } else {
          router.push("/agent"); // 기본적으로 agent 페이지로
        }
        break;
      case "my-tokens":
        router.push("/my-tokens");
        break;
      case "create-token":
        router.push("/create-token");
        break;
      case "my":
        router.push("/my");
        break;
      default:
        // from 파라미터가 없으면 브라우저의 기본 뒤로가기 동작 사용
        if (hasHistory) {
          router.back();
        } else {
          router.push("/agent"); // 기본적으로 agent 페이지로
        }
        break;
    }
  };

  const handleBuyClick = async () => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet first!");
      return;
    }

    let finalAmount = inputAmount;
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      finalAmount = tradeMode === "buy" ? "0.001" : "1";
    }

    if (
      tradeMode === "buy" &&
      actualBalance &&
      parseFloat(finalAmount) > actualBalance
    ) {
      alert(
        `Insufficient SOL balance!\nYou have: ${actualBalance.toFixed(
          6
        )} SOL\nTrying to spend: ${finalAmount} SOL`
      );
      return;
    }

    try {
      setIsTrading(true);
      setLoadingState("progress");
      setLoadingMessage(
        tradeMode === "buy"
          ? `Buying ${parseFloat(finalAmount).toLocaleString()} ${tokenSymbol}`
          : `Selling ${parseFloat(finalAmount).toLocaleString()} ${tokenSymbol}`
      );

      // Bonding curve 단계 또는 devnet 환경에서는 Meteora SDK 사용
      if (shouldUseMeteora) {
        // Devnet 환경에서는 poolAddress가 없어도 Meteora SDK 사용
        // URL 파라미터를 우선으로 하고, 그 다음 agentMetadata, 마지막으로 localStorage
        let poolAddress =
          searchParams.get("poolAddress") || agentMetadata?.poolAddress;

        // localStorage에서 poolAddress 찾기 (create-token에서 생성한 경우)
        if (!poolAddress) {
          // 1. 토큰별 localStorage 키 확인 (fundId 기반)
          const tokenKey = `token_${getFundId()}`;
          const tokenData = localStorage.getItem(tokenKey);
          if (tokenData) {
            try {
              const parsed = JSON.parse(tokenData);
              poolAddress = parsed.poolAddress;
            } catch (e) {}
          }

          // 2. 전체 토큰 배열에서 찾기 (fallback)
          if (!poolAddress) {
            const userTokens = JSON.parse(
              localStorage.getItem("homo_tokens") || "[]"
            );

            // 각 토큰의 poolAddress 확인
            userTokens.forEach((token: any, index: number) => {});

            const currentToken = userTokens.find((token: any) => {
              const fundIdMatch = token.fundId === getFundId();
              const tokenAddressMatch = token.tokenAddress === tokenMint;
              return fundIdMatch || tokenAddressMatch;
            });
            poolAddress = currentToken?.poolAddress;
          }
        }

        // SDK로 검증/보정: tokenMint 기준으로 실제 Meteora virtual pool 주소 재해석
        if (tokenMint) {
          // localStorage에서 poolAddress 찾기
          if (!poolAddress) {
            const fundId = getFundId();
            if (fundId) {
              const tokenKey = `token_${fundId}`;
              const tokenData = localStorage.getItem(tokenKey);
              if (tokenData) {
                try {
                  const parsed = JSON.parse(tokenData);
                  poolAddress = parsed.poolAddress;
                } catch (e) {}
              }
            }
          }
        }

        if (!poolAddress) {
          // 실제 devnet pool address로 교체하세요
          // 예: "8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz"
          // create-token에서 생성된 실제 devnet pool address로 교체하세요
          // 예: "8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz8Wjz"
          // 실제 devnet pool address로 교체하세요
          // create-token 콘솔에서 curve.publicKey 값을 복사해서 넣으세요
          // create-token 콘솔에서 복사한 실제 pool address로 교체하세요
          // Pool address를 찾을 수 없는 경우 에러 발생
          throw new Error(
            "Pool address is required for devnet trading.\n\n" +
              "Please ensure the token was created with a pool address or provide it via URL parameter.\n\n" +
              "Example: ?poolAddress=YOUR_POOL_ADDRESS"
          );
        }

        // Devnet에서는 Meteora SDK만 사용
        if (tradeMode === "buy") {
          await buyToken(poolAddress, parseFloat(finalAmount), tokenSymbol);
        } else {
          await sellToken(
            poolAddress,
            parseFloat(finalAmount),
            tokenDecimals,
            tokenSymbol
          );
        }
      } else {
        // Mainnet 토큰인 경우 Jupiter API 사용
        if (tradeMode === "buy") {
          await quoteAndBuildSwapInstructions(false, finalAmount);
        } else {
          await quoteAndBuildSwapInstructions(true, finalAmount);
        }
      }

      // Success state
      setLoadingState("success");
      setLoadingMessage(
        tradeMode === "buy"
          ? `Successfully bought ${parseFloat(
              finalAmount
            ).toLocaleString()} ${tokenSymbol}`
          : `Successfully sold ${parseFloat(
              finalAmount
            ).toLocaleString()} ${tokenSymbol}`
      );

      // GA4 Buy Success 이벤트
      if (tradeMode === "buy") {
        const volume = parseFloat(finalAmount) || 0;
        trackBuySuccess(volume);
      }

      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setLoadingState("idle");
        setLoadingMessage("");
      }, 3000);
    } catch (error) {
      // ignore error
      const msg = error instanceof Error ? error.message : String(error);
      console.error("❌ [TRADING] Transaction error:", error);
      console.error("❌ [TRADING] Error message:", msg);

      setLoadingState("failure");
      if (
        msg.includes("WALLET_REJECTED") ||
        msg.includes("User rejected") ||
        msg.includes("WalletSignTransactionError")
      ) {
        setLoadingMessage("Transaction failed. Try again.");
      } else if (msg.includes("Wallet not connected")) {
        setLoadingMessage(
          "Wallet not connected. Please connect your wallet and try again."
        );
      } else {
        setLoadingMessage("Transaction failed. Try again.");
      }

      // GA4 Buy Fail 이벤트
      if (tradeMode === "buy") {
        const volume = parseFloat(finalAmount) || 0;
        trackBuyFail(volume);
      }
    } finally {
      setIsTrading(false);
    }
  };

  const clearLoadingState = () => {
    setLoadingState("idle");
    setLoadingMessage("");
  };

  const isPageLoading =
    agentMetadataLoading || poolLoading || graphLoading || topPortfoliosLoading;

  if (isPageLoading) {
    return (
      <div className={cx("tradingview-page")}>
        <TradingViewSkeleton />
      </div>
    );
  }

  return (
    <div className={cx("tradingview-page")}>
      <CopySuccessMessage message={copySuccess} />
      <LoadingBar
        loadingState={loadingState}
        loadingMessage={loadingMessage}
        onClear={clearLoadingState}
      />

      <div className={cx("main-layout")}>
        <div className={cx("back-button-container")}>
          {handleBackToAgents && (
            <button className={cx("back-btn")} onClick={handleBackToAgents}>
              <Image
                src="/icons/backArrow.svg"
                alt="Back"
                width={30}
                height={30}
              />
            </button>
          )}
        </div>
        <div className={cx("main-content")}>
          <div className={cx("top-section")}>
            <AgentHeader
              imageUrl={agentMetadata?.imageUrl}
              name={tokenName}
              symbol={tokenSymbol}
              tokenMint={tokenMint}
              marketCap={marketCap}
              marketCapProgress={marketCapProgress}
              targetMarketCap={targetMarketCap}
              totalPnL={agentMetadata?.totalPnL}
              topPortfolios={topPortfolios}
              lastTrade={lastTrade}
              website={agentMetadata?.website}
              twitter={agentMetadata?.twitter}
              telegram={agentMetadata?.telegram}
            />

            <MigrationBanner isMigration={!!isMigration} />
            <TopPortfolios items={topPortfolios} showTitle={true} />
            <div className={cx("dropdown-sections")}>
              <StrategySection strategy={strategy} showTitle={true} />

              <TokenInfoCard
                agentCard={{
                  ticker: tokenSymbol,
                  name: tokenName,
                  marketCap,
                  marketCapProgress,
                  targetMarketCap,
                  tokenAddress: tokenMint,
                  creator: creatorAddress,
                }}
              />

              {/* Keep graph section as collapsible */}
              <DropdownSection title="Graph" defaultOpen={true}>
                <ChartSection
                  chartTab={chartTab}
                  setChartTab={(tab: string) => setChartTab(tab as ChartTab)}
                  tokenMint={tokenMint}
                  graphData={graphData}
                  graphLoading={graphLoading}
                  fundId={getFundId()}
                />
              </DropdownSection>

              <DropdownSection
                title="About"
                defaultOpen={true}
                headerExtras={
                  <TransactionsTabs
                    activeTab={activeTab}
                    setActiveTab={(tab: string) =>
                      setActiveTab(tab as ActiveTab)
                    }
                    className="dropdown-header-tabs"
                  />
                }
              >
                <div className={cx("about-section")}>
                  <TransactionsTable
                    activeTab={activeTab}
                    setActiveTab={(tab: string) =>
                      setActiveTab(tab as ActiveTab)
                    }
                    fundId={getFundId()}
                    showTitle={false}
                  />
                </div>
              </DropdownSection>
            </div>
          </div>
        </div>

        <div className={cx("trading-panel-wrapper")}>
          <TradingPanel
            tradeMode={tradeMode}
            setTradeMode={(mode: string) => setTradeMode(mode as TradeMode)}
            connected={connected}
            publicKey={publicKey}
            actualBalance={actualBalance}
            hasSufficientBalance={true}
            isCheckingBalance={false}
            inputAmount={inputAmount}
            setInputAmount={setInputAmount}
            tokenSymbol={tokenSymbol}
            tokenMint={tokenMint}
            quoteOutAmount={quoteOutAmount}
            minReceived={minReceived}
            isTrading={isTrading}
            isQuoteLoading={isQuoteLoading}
            quoteError={quoteError}
            onSubmit={handleBuyClick}
          ></TradingPanel>
        </div>
      </div>
    </div>
  );
};

// Suspense로 감싸는 메인 컴포넌트
const TradingViewPage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <TradingViewPageContent />
  </Suspense>
);

export default TradingViewPage;

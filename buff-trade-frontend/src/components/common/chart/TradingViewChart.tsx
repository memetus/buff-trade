"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { TokenBalance, ParsedTransactionWithMeta } from "@solana/web3.js";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  CandlestickSeries,
  BusinessDay,
} from "lightweight-charts";
import styles from "./TradingViewChart.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);
const LAMPORTS_PER_SOL = 1_000_000_000;

const resolveTimeToSeconds = (time: Time): number => {
  if (typeof time === "number") return time;
  if (typeof time === "string") {
    const parsed = Number(time);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (
    typeof time === "object" &&
    time !== null &&
    "year" in time &&
    "month" in time &&
    "day" in time
  ) {
    const { year, month, day } = time as BusinessDay;
    return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
  }
  return Math.floor(Date.now() / 1000);
};

type BondingCurveMeta = {
  poolAddress: string;
  baseVault: string;
  quoteVault: string;
  baseMint?: string;
};

type BondingCurveTrade = {
  signature: string;
  time: number;
  price: number;
  side: "buy" | "sell";
  baseAmount: number;
  quoteAmount: number;
};

const findTokenBalance = (
  balances: readonly TokenBalance[] | null | undefined,
  index: number
) => balances?.find?.((entry) => entry.accountIndex === index);

const extractBalanceSnapshot = (
  meta: ParsedTransactionWithMeta["meta"],
  index: number
) => {
  if (!meta) return null;

  const preToken = findTokenBalance(meta.preTokenBalances, index);
  const postToken = findTokenBalance(meta.postTokenBalances, index);
  const decimals =
    postToken?.uiTokenAmount?.decimals ??
    preToken?.uiTokenAmount?.decimals ??
    0;

  const toUiAmount = (tokenBalance?: TokenBalance | null) => {
    if (!tokenBalance) return 0;
    const info = tokenBalance.uiTokenAmount;
    if (!info) return 0;

    if (typeof info.uiAmount === "number" && Number.isFinite(info.uiAmount)) {
      return info.uiAmount;
    }

    if (typeof info.uiAmountString === "string") {
      const parsed = parseFloat(info.uiAmountString);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    if (typeof info.amount === "string") {
      const parsed = Number(info.amount);
      if (!Number.isNaN(parsed)) {
        return parsed / Math.pow(10, decimals);
      }
    }

    return 0;
  };

  if (preToken || postToken) {
    return {
      pre: toUiAmount(preToken),
      post: toUiAmount(postToken),
      decimals,
    };
  }

  const preLamports = meta.preBalances?.[index];
  const postLamports = meta.postBalances?.[index];

  if (typeof preLamports === "number" && typeof postLamports === "number") {
    return {
      pre: preLamports / LAMPORTS_PER_SOL,
      post: postLamports / LAMPORTS_PER_SOL,
      decimals: 9,
    };
  }

  return null;
};

const buildCandlesFromTrades = (
  trades: BondingCurveTrade[],
  intervalSeconds = 60
): CandlestickData[] => {
  if (!Array.isArray(trades) || trades.length === 0) {
    return [];
  }

  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number }
  >();

  for (const trade of trades) {
    const bucketTime =
      Math.floor(trade.time / intervalSeconds) * intervalSeconds;
    const existing = buckets.get(bucketTime);

    if (!existing) {
      buckets.set(bucketTime, {
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
      });
    } else {
      existing.high = Math.max(existing.high, trade.price);
      existing.low = Math.min(existing.low, trade.price);
      existing.close = trade.price;
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, data]) => ({
      time: time as Time,
      open: Number(data.open.toFixed(8)),
      high: Number(data.high.toFixed(8)),
      low: Number(data.low.toFixed(8)),
      close: Number(data.close.toFixed(8)),
    }));
};

interface TradingViewChartProps {
  symbol?: string;
  tokenMint?: string; // Pump token mint or identifier
  height?: number;
  className?: string;
  showBuySell?: boolean;
  onBuy?: () => void;
  onSell?: () => void;
  showHeader?: boolean; // 헤더 표시 여부 추가
  enableJupiter?: boolean;
  isBondingCurve?: boolean;
  bondingCurveMeta?: BondingCurveMeta;
  bondingCurvePollIntervalMs?: number;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = "",
  tokenMint,
  height = 400,
  className,
  showBuySell = false,
  onBuy,
  onSell,
  showHeader = true, // 기본값 true
  enableJupiter = true,
  isBondingCurve = false,
  bondingCurveMeta,
  bondingCurvePollIntervalMs = 15_000,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [activeTradeTab, setActiveTradeTab] = useState<"buy" | "sell">("buy");
  const [isMounted, setIsMounted] = useState(true);

  const [chartInitialized, setChartInitialized] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const solanaModuleRef = useRef<null | typeof import("@solana/web3.js")>(null);
  const connectionRef = useRef<any>(null);
  const tradesRef = useRef<BondingCurveTrade[]>([]);
  const processedSignaturesRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Ensure mounted flag toggles true after mount (Fast Refresh-safe)
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // 가격 포맷팅 함수
  const applyPriceStats = useCallback((series: CandlestickData[]) => {
    if (!Array.isArray(series) || series.length === 0) {
      setCurrentPrice(0);
      setPriceChange(0);
      setPriceChangePercent(0);
      return;
    }

    const latest = series[series.length - 1];
    const prev = series.length > 1 ? series[series.length - 2] : null;
    const lastClose = latest?.close ?? 0;

    setCurrentPrice(lastClose);

    if (prev) {
      const baseClose = prev?.close ?? 0;
      const change = lastClose - baseClose;
      setPriceChange(change);
      setPriceChangePercent(baseClose !== 0 ? (change / baseClose) * 100 : 0);
    } else {
      setPriceChange(0);
      setPriceChangePercent(0);
    }
  }, []);

  // Token price data from DexScreener (pair discovery + OHLC candles)
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  // Devnet 시드 제거(요청사항): 최초엔 빈 상태를 유지하고, buy/sell에만 반응

  const fetchPairAndCandles = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const actualPoolAddress = bondingCurveMeta?.poolAddress;
      const actualTokenMint = tokenMint;

      if (!actualPoolAddress && !actualTokenMint) {
        setCandles([]);
        setLoadError("No pool address or token mint available");

        return;
      }

      // 1. Try external APIs for real trading data
      let jupiterPrice: number | null = null;

      if (actualTokenMint) {
        // Fetch current spot price from Jupiter (most reliable for up-to-date tick)
        try {
          const jupiterRes = await fetch(
            `https://lite-api.jup.ag/price/v3?ids=${actualTokenMint}`,
            { cache: "no-store" }
          );

          if (jupiterRes.ok) {
            const jupiterData = await jupiterRes.json();
            const tokenData = jupiterData[actualTokenMint];

            if (tokenData?.usdPrice) {
              jupiterPrice = Number(tokenData.usdPrice);
            }
          }
        } catch (jupiterError) {
          // ignore and continue to DexScreener attempt
        }

        // Fetch historical candles from DexScreener
        try {
          const dexRes = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${actualTokenMint}`,
            { cache: "no-store" }
          );

          if (dexRes.ok) {
            const dexData = await dexRes.json();
            const best = dexData?.pairs?.[0];

            if (best?.pairAddress) {
              const candlesRes = await fetch(
                `https://api.dexscreener.com/latest/dex/charts?pairAddress=${best.pairAddress}&interval=5m&limit=288`,
                { cache: "no-store" }
              );

              if (candlesRes.ok) {
                const candlesData = await candlesRes.json();

                const bars =
                  candlesData?.pairs?.[0]?.charts ||
                  candlesData?.pairs?.[0]?.history ||
                  candlesData?.pairs?.[0]?.candles ||
                  candlesData?.charts ||
                  [];

                const dexCandles: CandlestickData[] = Array.isArray(bars)
                  ? bars
                      .map((b: any) => ({
                        time: Math.floor(b.t / 1000) as Time,
                        open: b.o || b.open,
                        high: b.h || b.high,
                        low: b.l || b.low,
                        close: b.c || b.close,
                      }))
                      .filter((candle) =>
                        [
                          candle.open,
                          candle.high,
                          candle.low,
                          candle.close,
                        ].every(
                          (value) =>
                            typeof value === "number" && Number.isFinite(value)
                        )
                      )
                  : [];

                if (dexCandles.length > 0) {
                  let finalCandles = [...dexCandles];

                  if (jupiterPrice !== null) {
                    const nowSec = Math.floor(Date.now() / 1000);
                    const lastCandle = finalCandles[finalCandles.length - 1];
                    const lastTime = resolveTimeToSeconds(lastCandle.time);

                    if (nowSec <= lastTime) {
                      finalCandles[finalCandles.length - 1] = {
                        ...lastCandle,
                        close: jupiterPrice,
                        high: Math.max(lastCandle.high, jupiterPrice),
                        low: Math.min(lastCandle.low, jupiterPrice),
                      };
                    } else {
                      finalCandles = [
                        ...finalCandles,
                        {
                          time: nowSec as Time,
                          open: jupiterPrice,
                          high: jupiterPrice,
                          low: jupiterPrice,
                          close: jupiterPrice,
                        },
                      ];
                    }
                  }

                  setCandles(finalCandles);
                  applyPriceStats(finalCandles);
                  setLoadError("");
                  return; // Successfully populated with DexScreener data
                }
              }
            }
          }
        } catch (dexError) {
          // ignore and continue to fallback
        }

        if (jupiterPrice !== null) {
          const currentTime = Math.floor(Date.now() / 1000) as Time;
          const jupiterCandle: CandlestickData = {
            time: currentTime,
            open: jupiterPrice,
            high: jupiterPrice,
            low: jupiterPrice,
            close: jupiterPrice,
          };

          setCandles([jupiterCandle]);
          applyPriceStats([jupiterCandle]);
          setLoadError("");
          return;
        }
      }

      // 2. Fallback: Use pool price with time-based candles (only if we have pool address)
      if (actualPoolAddress) {
        const backendApiRes = await fetch(
          `/api/bonding-curve/pool-info/${actualPoolAddress}`
        );

        if (backendApiRes.ok) {
          const poolInfo = await backendApiRes.json();
          const price = poolInfo.tokenPriceUSD || poolInfo.tokenPrice;

          if (price && price > 0) {
            setCurrentPrice(price);

            // Create initial candle with current price
            const currentTime = Math.floor(Date.now() / 1000) as Time;
            const initialCandle: CandlestickData = {
              time: currentTime,
              open: price,
              high: price,
              low: price,
              close: price,
            };

            setCandles([initialCandle]);
            applyPriceStats([initialCandle]);
          } else {
            setCandles([]);
            setLoadError("No price data available");
          }
        } else {
          setCandles([]);
          setLoadError("Failed to load pool data");
        }
      } else {
        setCandles([]);
        setLoadError("No pool address available for chart data");
      }
    } catch (err) {
      setLoadError("Failed to load market data");
      setCandles([]);
    } finally {
      setIsLoading(false);
    }
  }, [bondingCurveMeta, tokenMint, applyPriceStats]);

  const getSolanaModule = useCallback(async () => {
    if (!solanaModuleRef.current) {
      solanaModuleRef.current = await import("@solana/web3.js");
    }
    return solanaModuleRef.current;
  }, []);

  const getConnection = useCallback(async () => {
    const solana = await getSolanaModule();
    if (!connectionRef.current) {
      // 항상 메인넷 사용
      const endpoint = process.env.NEXT_PUBLIC_HELIUS_API_KEY
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
        : "https://api.mainnet-beta.solana.com";

      connectionRef.current = new solana.Connection(endpoint, "confirmed");

      // 연결 테스트
      try {
        const version = await connectionRef.current.getVersion();
      } catch (error) {}
    }

    return {
      connection: connectionRef.current as any,
      PublicKey: solana.PublicKey,
    };
  }, [getSolanaModule]);

  const fetchBondingCurveTrades = useCallback(
    async (initial = false) => {
      if (!isBondingCurve || enableJupiter) {
        return;
      }

      if (
        !bondingCurveMeta?.poolAddress ||
        !bondingCurveMeta.baseVault ||
        !bondingCurveMeta.quoteVault
      ) {
        if (initial) {
          setIsLoading(false);
          setLoadError("Bonding curve pool data unavailable");
        }
        return;
      }

      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      if (initial) {
        setIsLoading(true);
      }

      try {
        const { connection, PublicKey } = await getConnection();

        let poolKey;
        try {
          poolKey = new PublicKey(bondingCurveMeta.poolAddress);
        } catch (pubKeyErr) {
          throw new Error("Invalid pool address");
        }

        const signatureInfos = await connection.getSignaturesForAddress(
          poolKey,
          { limit: 40 }
        );

        let producedCandles = false;

        if (Array.isArray(signatureInfos) && signatureInfos.length > 0) {
          const newInfos = signatureInfos.filter(
            (info) =>
              info?.signature &&
              !processedSignaturesRef.current.has(info.signature)
          );

          if (newInfos.length > 0) {
            const orderedInfos = [...newInfos].reverse();
            const transactions = await connection.getTransactions(
              orderedInfos.map((info) => info.signature),
              {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
              }
            );

            const newTrades: BondingCurveTrade[] = [];

            orderedInfos.forEach((info, idx) => {
              const tx = transactions?.[idx];
              if (!tx || !tx.meta || !tx.transaction) {
                return;
              }

              const accountKeys = tx.transaction.message.accountKeys.map(
                (account: any) =>
                  typeof account === "string"
                    ? account
                    : account.pubkey?.toBase58?.() ?? ""
              );

              const baseIndex = accountKeys.indexOf(bondingCurveMeta.baseVault);
              const quoteIndex = accountKeys.indexOf(
                bondingCurveMeta.quoteVault
              );

              if (baseIndex === -1 || quoteIndex === -1) {
                return;
              }

              const baseSnapshot = extractBalanceSnapshot(tx.meta, baseIndex);
              const quoteSnapshot = extractBalanceSnapshot(tx.meta, quoteIndex);

              if (!baseSnapshot || !quoteSnapshot) {
                return;
              }

              const deltaBase = baseSnapshot.post - baseSnapshot.pre;
              const deltaQuote = quoteSnapshot.post - quoteSnapshot.pre;

              if (!deltaBase || !deltaQuote) {
                return;
              }

              let side: "buy" | "sell" | null = null;
              let price = 0;

              if (deltaBase < 0 && deltaQuote > 0) {
                side = "buy";
                const baseAbs = Math.abs(deltaBase);
                price = baseAbs > 0 ? deltaQuote / baseAbs : 0;
              } else if (deltaBase > 0 && deltaQuote < 0) {
                side = "sell";
                price = deltaBase > 0 ? Math.abs(deltaQuote) / deltaBase : 0;
              }

              if (!side || !Number.isFinite(price) || price <= 0) {
                return;
              }

              newTrades.push({
                signature: info.signature,
                time: info.blockTime ?? Math.floor(Date.now() / 1000),
                price,
                side,
                baseAmount: Math.abs(deltaBase),
                quoteAmount: Math.abs(deltaQuote),
              });

              processedSignaturesRef.current.add(info.signature);
            });

            if (newTrades.length > 0) {
              tradesRef.current = [...tradesRef.current, ...newTrades].sort(
                (a, b) => a.time - b.time
              );

              if (tradesRef.current.length > 600) {
                tradesRef.current = tradesRef.current.slice(-600);
              }

              if (processedSignaturesRef.current.size > 1_200) {
                processedSignaturesRef.current = new Set(
                  tradesRef.current
                    .slice(-1_200)
                    .map((trade) => trade.signature)
                );
              }

              const nextCandles = buildCandlesFromTrades(tradesRef.current);
              setCandles(nextCandles);

              if (nextCandles.length > 0) {
                setLoadError("");
                producedCandles = true;
              }
            }
          }
        }

        if (!producedCandles && tradesRef.current.length === 0) {
          setLoadError("No bonding-curve swaps yet");
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load bonding curve data";
        setLoadError(message);
      } finally {
        if (initial) {
          setIsLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [bondingCurveMeta, enableJupiter, getConnection, isBondingCurve]
  );

  // 차트 정리 함수
  const cleanupChart = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (error) {
        // 차트가 이미 disposed된 경우 무시
      } finally {
        chartRef.current = null;
        seriesRef.current = null;
        setChartInitialized(false);
      }
    }
  }, []);

  // 컴포넌트 언마운트 시 차트 정리
  useEffect(() => {
    return () => {
      setIsMounted(false);
      cleanupChart();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [cleanupChart]);

  // 차트 초기화
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || !isMounted || chartInitialized) {
      return;
    }

    try {
      // 기존 차트 정리
      cleanupChart();

      // 차트 생성 - TradingView 스타일
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height,
        layout: {
          background: { color: "#000000" }, // 검은 배경
          textColor: "#ffffff",
        },
        grid: {
          vertLines: { color: "#333333" }, // 어두운 그리드
          horzLines: { color: "#333333" },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: "#666666",
            width: 1,
            style: 0,
            labelVisible: true,
            labelBackgroundColor: "#1a1a1a",
          },
          horzLine: {
            color: "#666666",
            width: 1,
            style: 0,
            labelVisible: true,
            labelBackgroundColor: "#1a1a1a",
          },
        },
        rightPriceScale: {
          borderColor: "#333333",
          entireTextOnly: false,
          ticksVisible: true,
        },
        timeScale: {
          borderColor: "#333333",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 12,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      // 캔들스틱 시리즈 추가 - TradingView 색상
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#00d4aa", // 밝은 녹색 (암호화폐 스타일)
        downColor: "#ff6b6b", // 밝은 빨간색
        borderDownColor: "#ff6b6b",
        borderUpColor: "#00d4aa",
        wickDownColor: "#ff6b6b",
        wickUpColor: "#00d4aa",
        priceFormat: {
          type: "price",
          precision: 8,
          minMove: 0.00000001,
        },
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
      setChartInitialized(true);

      // 리사이즈 핸들러
      const handleResize = () => {
        if (chartContainerRef.current && chart && isMounted) {
          try {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          } catch (error) {}
        }
      };

      window.addEventListener("resize", handleResize);

      // cleanup 함수 설정
      cleanupRef.current = () => {
        window.removeEventListener("resize", handleResize);
      };

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  }, [height, isMounted, chartInitialized, cleanupChart]);

  // 차트 초기화 실행
  useEffect(() => {
    initializeChart();
  }, [initializeChart]);

  // 데이터 업데이트
  useEffect(() => {
    if (
      chartRef.current &&
      seriesRef.current &&
      isMounted &&
      chartInitialized
    ) {
      try {
        if (candles.length > 0) {
          seriesRef.current.setData(candles);
          chartRef.current.timeScale().fitContent();
        } else {
          seriesRef.current.setData([]);
        }
      } catch (error) {
        // ignore error
      }
    }
  }, [candles, isMounted, chartInitialized]);

  useEffect(() => {
    applyPriceStats(candles);
  }, [candles, applyPriceStats]);

  useEffect(() => {
    tradesRef.current = [];
    processedSignaturesRef.current = new Set();
    setCandles([]);
    setLoadError("");
  }, [tokenMint]);

  // 실시간 데이터 업데이트 (거래 데이터 + 풀 가격)
  useEffect(() => {
    if (!bondingCurveMeta?.poolAddress && !tokenMint) {
      return;
    }

    const updateData = async () => {
      try {
        // Try external APIs for fresh trading data
        if (tokenMint) {
          let jupiterPrice: number | null = null;

          try {
            const jupiterRes = await fetch(
              `https://lite-api.jup.ag/price/v3?ids=${tokenMint}`,
              { cache: "no-store" }
            );

            if (jupiterRes.ok) {
              const jupiterData = await jupiterRes.json();
              const tokenData = jupiterData[tokenMint];

              if (tokenData?.usdPrice) {
                jupiterPrice = Number(tokenData.usdPrice);
              }
            }
          } catch (jupiterError) {
            // ignore and continue to DexScreener attempt
          }

          try {
            const dexRes = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`,
              { cache: "no-store" }
            );

            if (dexRes.ok) {
              const dexData = await dexRes.json();
              const best = dexData?.pairs?.[0];

              if (best?.pairAddress) {
                const candlesRes = await fetch(
                  `https://api.dexscreener.com/latest/dex/charts?pairAddress=${best.pairAddress}&interval=5m&limit=288`,
                  { cache: "no-store" }
                );

                if (candlesRes.ok) {
                  const candlesData = await candlesRes.json();
                  const bars =
                    candlesData?.pairs?.[0]?.charts ||
                    candlesData?.pairs?.[0]?.history ||
                    candlesData?.pairs?.[0]?.candles ||
                    candlesData?.charts ||
                    [];

                  const dexCandles: CandlestickData[] = Array.isArray(bars)
                    ? bars
                        .map((b: any) => ({
                          time: Math.floor(b.t / 1000) as Time,
                          open: b.o || b.open,
                          high: b.h || b.high,
                          low: b.l || b.low,
                          close: b.c || b.close,
                        }))
                        .filter((candle) =>
                          [
                            candle.open,
                            candle.high,
                            candle.low,
                            candle.close,
                          ].every(
                            (value) =>
                              typeof value === "number" &&
                              Number.isFinite(value)
                          )
                        )
                    : [];

                  if (dexCandles.length > 0) {
                    let finalCandles = [...dexCandles];

                    if (jupiterPrice !== null) {
                      const nowSec = Math.floor(Date.now() / 1000);
                      const lastCandle = finalCandles[finalCandles.length - 1];
                      const lastTime = resolveTimeToSeconds(lastCandle.time);

                      if (nowSec <= lastTime) {
                        finalCandles[finalCandles.length - 1] = {
                          ...lastCandle,
                          close: jupiterPrice,
                          high: Math.max(lastCandle.high, jupiterPrice),
                          low: Math.min(lastCandle.low, jupiterPrice),
                        };
                      } else {
                        finalCandles = [
                          ...finalCandles,
                          {
                            time: nowSec as Time,
                            open: jupiterPrice,
                            high: jupiterPrice,
                            low: jupiterPrice,
                            close: jupiterPrice,
                          },
                        ];
                      }
                    }

                    setCandles(finalCandles);
                    applyPriceStats(finalCandles);
                    setLoadError("");
                    return;
                  }
                }
              }
            }
          } catch (dexError) {
            // ignore
          }

          if (jupiterPrice !== null) {
            const nowTime = Math.floor(Date.now() / 1000) as Time;
            const latestPrice = jupiterPrice;

            let nextCandles: CandlestickData[] = [];

            setCandles((prev) => {
              if (prev.length > 0) {
                const updated = [...prev];
                const lastCandle = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...lastCandle,
                  time: nowTime,
                  close: latestPrice,
                  high: Math.max(lastCandle.high, latestPrice),
                  low: Math.min(lastCandle.low, latestPrice),
                };
                nextCandles = updated;
                return updated;
              }

              const initial = [
                {
                  time: nowTime,
                  open: latestPrice,
                  high: latestPrice,
                  low: latestPrice,
                  close: latestPrice,
                },
              ];
              nextCandles = initial;
              return initial;
            });

            if (nextCandles.length > 0) {
              applyPriceStats(nextCandles);
            }

            setLoadError("");
            return;
          }
        }

        // Fallback: Update pool price with time-based candles
        if (bondingCurveMeta?.poolAddress) {
          const poolInfoRes = await fetch(
            `/api/bonding-curve/pool-info/${bondingCurveMeta.poolAddress}`
          );
          if (poolInfoRes.ok) {
            const poolInfo = await poolInfoRes.json();
            if (
              poolInfo.tokenPriceUSD &&
              typeof poolInfo.tokenPriceUSD === "number"
            ) {
              setCurrentPrice(poolInfo.tokenPriceUSD);

              // Create time-based candles for better visualization
              setCandles((prev) => {
                const currentTime = Math.floor(Date.now() / 1000);
                const currentPrice = poolInfo.tokenPriceUSD;

                if (prev.length === 0) {
                  // First candle
                  return [
                    {
                      time: currentTime as Time,
                      open: currentPrice,
                      high: currentPrice,
                      low: currentPrice,
                      close: currentPrice,
                    },
                  ];
                }

                const lastCandle = prev[prev.length - 1];
                const timeDiff = currentTime - (lastCandle.time as number);

                // Create new candle every 15 minutes (900 seconds)
                if (timeDiff >= 900) {
                  const newCandle = {
                    time: currentTime as Time,
                    open: lastCandle.close,
                    high: Math.max(lastCandle.close, currentPrice),
                    low: Math.min(lastCandle.close, currentPrice),
                    close: currentPrice,
                  };
                  return [...prev, newCandle].slice(-200); // Keep last 200 candles
                } else {
                  // Update current candle
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...lastCandle,
                    close: currentPrice,
                    high: Math.max(lastCandle.high, currentPrice),
                    low: Math.min(lastCandle.low, currentPrice),
                  };
                  return updated;
                }
              });
            }
          }
        }
      } catch (error) {}
    };

    // Initial data update
    updateData();

    // Update data every 30 seconds for real-time updates
    const dataInterval = setInterval(updateData, 30000);

    return () => {
      clearInterval(dataInterval);
    };
  }, [bondingCurveMeta?.poolAddress, tokenMint, applyPriceStats]);

  // 데이터 로드
  useEffect(() => {
    // Fetch data if we have either pool address or token mint
    if (bondingCurveMeta?.poolAddress || tokenMint) {
      fetchPairAndCandles();
    }
  }, [fetchPairAndCandles, bondingCurveMeta?.poolAddress, tokenMint]);

  useEffect(() => {
    if (!enableJupiter && isBondingCurve && bondingCurveMeta) {
      tradesRef.current = [];
      processedSignaturesRef.current = new Set();
      setCandles([]);
      setLoadError("");

      fetchBondingCurveTrades(true);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      pollingRef.current = setInterval(() => {
        fetchBondingCurveTrades(false);
      }, Math.max(5_000, bondingCurvePollIntervalMs));

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return undefined;
  }, [
    bondingCurveMeta,
    bondingCurvePollIntervalMs,
    enableJupiter,
    fetchBondingCurveTrades,
    isBondingCurve,
    tokenMint,
  ]);

  // 시드 캔들 없음: 초기에는 빈 화면 유지

  // Devnet synthetic candles: react to buy/sell events
  useEffect(() => {
    const handler = (e: Event) => {
      if (!seriesRef.current || !chartRef.current) return;
      const evt = e as CustomEvent;
      const { type, price, timestamp } = evt.detail || {};
      const nowSec = Math.floor((timestamp || Date.now()) / 1000) as Time;

      // pick base price from last candle or currentPrice
      const last = candles[candles.length - 1];
      const base = price || last?.close || currentPrice || 0.000001;

      const delta = base * (type === "buy" ? 0.08 : -0.06); // +8% buy, -6% sell
      const newClose = Math.max(base + delta, base * 0.5);
      const newHigh = Math.max(base, newClose) * 1.02;
      const newLow = Math.min(base, newClose) * 0.98;

      const bar: CandlestickData = {
        time: nowSec,
        open: base,
        high: newHigh,
        low: newLow,
        close: newClose,
      };

      try {
        // append synthetic candle and update visuals without reloading
        seriesRef.current.update(bar);
        chartRef.current.timeScale().scrollToRealTime();
        setCurrentPrice(newClose);
        setPriceChange(newClose - base);
        setPriceChangePercent(((newClose - base) / base) * 100);
      } catch (err) {}
    };

    window.addEventListener("devnet-trade", handler as any);
    return () => window.removeEventListener("devnet-trade", handler as any);
  }, [candles, currentPrice]);

  return (
    <div className={cx("tradingview-chart", className)}>
      {/* 헤더는 showHeader가 true일 때만 표시 */}
      {showHeader && (
        <div className={cx("chart-header")}>
          <div className={cx("chart-controls")}>
            <select className={cx("indicators-select")}></select>
          </div>
        </div>
      )}

      {/* Buy/Sell Tabs */}
      {showBuySell && (
        <div className={cx("trade-tabs")}>
          <button
            className={cx("trade-tab", { active: activeTradeTab === "buy" })}
            onClick={() => {
              setActiveTradeTab("buy");
              if (enableJupiter && onBuy) {
                onBuy();
              }
            }}
          >
            Buy
          </button>
          <button
            className={cx("trade-tab", { active: activeTradeTab === "sell" })}
            onClick={() => {
              setActiveTradeTab("sell");
              onSell?.();
            }}
          >
            Sell
          </button>
        </div>
      )}

      <div
        className={cx("chart-container")}
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: height,
          minHeight: height,
          backgroundColor: "#000000",
          position: "relative",
          border: "1px solid #333333",
          borderRadius: "4px",
        }}
      >
        {isLoading && (
          <div
            className={cx("loading")}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#ffffff",
            }}
          >
            <div className={cx("loading-spinner")}></div>
            <span>Loading chart...</span>
          </div>
        )}
        {!isLoading && loadError && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#ff6b6b",
              textAlign: "center",
              fontSize: 12,
            }}
          >
            {loadError}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingViewChart;

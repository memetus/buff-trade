"use client";
import React, { useCallback, useEffect, useState, Suspense } from "react";
import styles from "@/app/main-page/page.module.scss";
import classNames from "classnames/bind";
import SocketProvider from "@/contexts/partials/socket/SocketProvider";
import MainPageStyles from "@/app/main-page/MainPage.module.scss";
import { useRouter, useSearchParams } from "next/navigation";
import MoltenFooter from "@/components/visuals/moltenFooter/MoltenFooter";
import { TokenData } from "./types";
import {
  formatMarketCap,
  formatPercent,
  formatSolAmount,
  formatChange,
  formatSymbol,
} from "./utils/formatters";
import { buildTokenPath, buildTokenUrl, isGraduated } from "./utils/tokenUtils";
import { useTrendingDataQuery } from "@/shared/api/agentDashboard";
import { useWallet } from "@solana/wallet-adapter-react";
import LoginFlowModal from "@/components/common/modal/loginFlowModal/LoginFlowModal";

const cx = classNames.bind(styles);
const tcx = classNames.bind(MainPageStyles);

// useSearchParams를 사용하는 컴포넌트를 별도로 분리
const MainPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { publicKey } = useWallet();
  const pageSize = 50;
  const [searchTerm, setSearchTerm] = useState("");
  const [strategy, setStrategy] = useState("");
  const [sortBy, setSortBy] = useState("marketCap");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showGraduatedOnly, setShowGraduatedOnly] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [showLoginFlow, setShowLoginFlow] = useState(false);

  // 지갑 연결 및 invite code 인증 여부 확인
  useEffect(() => {
    const isInvited = localStorage.getItem("isInvited");
    const isConnected = localStorage.getItem("isConnected");

    // 지갑이 연결되지 않았거나 invite code가 인증되지 않은 경우 적절한 페이지로 리다이렉트
    if (isConnected !== "true") {
      router.push("/");
      return;
    }
    if (isInvited !== "true") {
      router.push("/invite");
      return;
    }
  }, [router]);

  // invite code 인증 후 LoginFlowModal을 한 번만 보여주는 로직
  useEffect(() => {
    const hasSeenLoginFlow = localStorage.getItem("hasSeenLoginFlow");
    const hasAccessToken = localStorage.getItem("accessToken");
    const isInvited = localStorage.getItem("isInvited");

    // invite code 인증을 완료했고, accessToken이 있고, 아직 LoginFlow를 보지 않았다면 모달 표시
    if (isInvited === "true" && hasAccessToken && !hasSeenLoginFlow) {
      setShowLoginFlow(true);
    }
  }, []);

  const handleLoginFlowComplete = () => {
    // LoginFlow 완료 후 localStorage에 표시 기록 저장
    localStorage.setItem("hasSeenLoginFlow", "true");
    setShowLoginFlow(false);
  };

  const handleLoginFlowClose = () => {
    // LoginFlow 닫기 시에도 표시 기록 저장
    localStorage.setItem("hasSeenLoginFlow", "true");
    setShowLoginFlow(false);
  };

  const handleCopyTokenLink = async (
    event: React.MouseEvent<HTMLButtonElement>,
    token: TokenData
  ) => {
    event.stopPropagation();
    const contractAddress = token.tokenAddress;
    if (!contractAddress) {
      console.error("No contract address available for token:", token.fundId);
      return;
    }
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopiedTokenId(token.fundId);
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenTokenInNewTab = (
    event: React.MouseEvent<HTMLButtonElement>,
    token: TokenData
  ) => {
    event.stopPropagation();
    if (typeof window !== "undefined") {
      window.open(buildTokenPath(token), "_blank");
    }
  };

  const handleOpenWebsite = (
    event: React.MouseEvent<HTMLButtonElement>,
    token: TokenData
  ) => {
    event.stopPropagation();
    if (token.website && token.website.trim()) {
      window.open(token.website, "_blank");
    }
  };

  const handleOpenTwitter = (
    event: React.MouseEvent<HTMLButtonElement>,
    token: TokenData
  ) => {
    event.stopPropagation();
    if (token.twitter && token.twitter.trim()) {
      window.open(token.twitter, "_blank");
    }
  };

  const {
    data: trendingData,
    isError: isTrendingError,
    error: trendingError,
  } = useTrendingDataQuery({
    page: 1,
    pageSize: pageSize,
    sort:
      sortBy === "totalPnL" ? "totalPnL" : sortBy === "nav" ? "topMc" : "topMc",
    sortOrder: sortOrder,
  });

  const tokens = trendingData?.results ?? [];
  const totalCount = trendingData?.totalCount ?? 0;
  const error = isTrendingError
    ? trendingError?.message ?? "Failed to fetch tokens"
    : null;

  const handleCreateToken = () =>
    router.push(`/create-token?strategy=${encodeURIComponent(strategy)}`);

  const handleTokenClick = useCallback(
    async (token: TokenData) => {
      const params = new URLSearchParams({
        fundId: token.fundId,
        from: "main",
      });

      if (token.tokenAddress) {
        params.set("token", token.tokenAddress);
      }

      if (token.poolAddress) {
        params.set("poolAddress", token.poolAddress);
      } else {
        try {
          const meteoraEndpoints = [
            `https://dammv2-api.meteora.ag/pools?token_a_mint=${token.tokenAddress}&any=true&limit=10`,
            `https://dammv2-api.meteora.ag/pools?token_b_mint=${token.tokenAddress}&any=true&limit=10`,
          ];

          for (const endpoint of meteoraEndpoints) {
            try {
              const response = await fetch(endpoint);
              if (!response.ok) continue;
              const data = await response.json();
              const poolAddress = data?.data?.[0]?.pool_address;
              if (poolAddress) {
                params.set("poolAddress", poolAddress);
                break;
              }
            } catch (endpointError) {
              // eslint-disable-next-line no-console
            }
          }
        } catch (poolError) {
          // eslint-disable-next-line no-console
        }
      }

      router.push(`/tradingview?${params.toString()}`);
    },
    [router]
  );

  const filteredTokens = (() => {
    let filtered = tokens;

    // 졸업 필터 적용
    if (showGraduatedOnly) {
      filtered = filtered.filter(isGraduated);
    }

    // 검색 필터 적용
    const q = (searchTerm || "").toLowerCase();
    if (q) {
      filtered = filtered.filter((token) => {
        const name = (token.name || "").toLowerCase();
        const strategy = (token.strategyPrompt || "").toLowerCase();
        return name.includes(q) || strategy.includes(q);
      });
    }

    return filtered;
  })();

  const totalPages = Math.ceil(totalCount / pageSize);
  return (
    // <SocketProvider>
    <main className={cx("page")}>
      <div className={tcx("mainPage")}>
        <div className={tcx("container")}>
          <div className={tcx("token-list-section")}>
            <div className={tcx("list-header")}>
              <div className={tcx("trending-title-section")}>
                <h2>Trending</h2>
                <img
                  src="/icons/TrendFire.svg"
                  alt="Trending"
                  className={tcx("flame-icon")}
                  width="30"
                  height="30"
                />
              </div>
              <div className={tcx("other-buttons")}>
                <div className={tcx("search-section")}>
                  <button
                    className={tcx("search-icon-btn", {
                      active: showSearchInput,
                    })}
                    onClick={() => {
                      setShowSearchInput(!showSearchInput);
                      if (!showSearchInput) {
                        // 검색창이 열릴 때 포커스
                        setTimeout(() => {
                          const searchInput = document.querySelector(
                            `.${tcx("search-input")}`
                          ) as HTMLInputElement;
                          if (searchInput) {
                            searchInput.focus();
                          }
                        }, 100);
                      }
                    }}
                    title="Search tokens"
                  >
                    <img
                      src="/icons/searchTrend.svg"
                      alt="Search"
                      width="20"
                      height="20"
                    />
                  </button>
                </div>
                {/* todo: btn css */}
                <div className={tcx("filters")}>
                  <button
                    className={tcx("filter-btn", {
                      active: showGraduatedOnly,
                    })}
                    onClick={() => {
                      setShowGraduatedOnly(!showGraduatedOnly);
                      if (!showGraduatedOnly) {
                        setSortBy("createdAt");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    Graduated
                  </button>
                  <button
                    className={tcx("filter-btn", {
                      active: sortBy === "totalPnL" && !showGraduatedOnly,
                    })}
                    onClick={() => {
                      if (sortBy === "totalPnL" && !showGraduatedOnly) {
                        setSortBy("createdAt"); // 기본 정렬로 리셋
                      } else {
                        setSortBy("totalPnL");
                      }
                      setShowGraduatedOnly(false);
                    }}
                  >
                    Top PnL
                  </button>
                  <button
                    className={tcx("filter-btn", {
                      active: sortBy === "txCount" && !showGraduatedOnly,
                    })}
                    onClick={() => {
                      if (sortBy === "txCount" && !showGraduatedOnly) {
                        setSortBy("createdAt"); // 기본 정렬로 리셋
                      } else {
                        setSortBy("txCount");
                      }
                      setShowGraduatedOnly(false);
                    }}
                  >
                    24h V
                  </button>
                  <button
                    className={tcx("filter-btn", {
                      active: sortBy === "nav" && !showGraduatedOnly,
                    })}
                    onClick={() => {
                      if (sortBy === "nav" && !showGraduatedOnly) {
                        setSortBy("createdAt"); // 기본 정렬로 리셋
                      } else {
                        setSortBy("nav");
                      }
                      setShowGraduatedOnly(false);
                    }}
                  >
                    Top MC
                  </button>
                </div>
              </div>

              {/* Search Modal Overlay */}
              {showSearchInput && (
                <div
                  className={tcx("search-modal-overlay")}
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchTerm("");
                  }}
                >
                  <div
                    className={tcx("search-modal-content")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      className={tcx("search-input-modal")}
                      type="text"
                      placeholder="Search tokens..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onBlur={() => {
                        // 검색어가 없으면 검색창 닫기
                        if (!searchTerm.trim()) {
                          setShowSearchInput(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowSearchInput(false);
                          setSearchTerm("");
                        }
                      }}
                      autoFocus
                    />

                    {/* Search Results */}
                    {searchTerm && filteredTokens.length > 0 && (
                      <div className={tcx("search-results")}>
                        {filteredTokens.map((token) => {
                          const topTrades = Array.isArray(token.topPortfolios)
                            ? token.topPortfolios.slice(0, 2)
                            : [];
                          const lastTrade = token.latestTrade;
                          const ticker = token.ticker || token.symbol;

                          return (
                            <div
                              key={token.fundId}
                              className={tcx("search-result-card")}
                              onClick={() => {
                                handleTokenClick(token);
                                setShowSearchInput(false);
                              }}
                            >
                              <div className={tcx("search-result-header")}>
                                <img
                                  className={tcx("search-result-image")}
                                  src={
                                    token.imageUrl ||
                                    "/images/default-profile.png"
                                  }
                                  alt={token.name}
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.src =
                                      "/images/default-profile.png";
                                  }}
                                />
                                <div className={tcx("search-result-info")}>
                                  <div
                                    className={tcx(
                                      "search-result-name-section"
                                    )}
                                  >
                                    <h3 className={tcx("search-result-name")}>
                                      {token.name}
                                    </h3>
                                    {(token.ticker || token.symbol) && (
                                      <span
                                        className={tcx("search-result-symbol")}
                                      >
                                        {formatSymbol(
                                          token.ticker || token.symbol
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={tcx(
                                      "search-result-metrics-section"
                                    )}
                                  >
                                    <div
                                      className={tcx("search-result-metric")}
                                    >
                                      <span
                                        className={tcx("search-result-label")}
                                      >
                                        Agents
                                      </span>
                                      <span
                                        className={tcx("search-result-value")}
                                      >
                                        Total PnL
                                      </span>
                                      <span
                                        className={tcx("search-result-pnl", {
                                          positive: token.totalPnL > 0,
                                          negative: token.totalPnL < 0,
                                        })}
                                        style={{ color: "#D1D9E0" }}
                                      >
                                        {formatPercent(token.totalPnL, 0)}
                                      </span>
                                      <span
                                        className={tcx("search-result-change")}
                                      >
                                        <img
                                          src={
                                            (token.totalPnLChangePercent ??
                                              0) >= 0
                                              ? "/icons/stat-up.svg"
                                              : "/icons/stat-down.svg"
                                          }
                                          alt={
                                            (token.totalPnLChangePercent ??
                                              0) >= 0
                                              ? "Up"
                                              : "Down"
                                          }
                                          width="10"
                                          height="10"
                                        />
                                        <span
                                          className={tcx(
                                            (token.totalPnLChangePercent ??
                                              0) >= 0
                                              ? "is-positive"
                                              : "is-negative"
                                          )}
                                        >
                                          {Math.abs(
                                            token.totalPnLChangePercent ?? 0
                                          ).toFixed(0)}
                                          %
                                        </span>
                                      </span>
                                    </div>
                                    <div
                                      className={tcx("search-result-metric")}
                                    >
                                      <span
                                        className={tcx("search-result-label")}
                                      >
                                        Token
                                      </span>
                                      <span
                                        className={tcx("search-result-value")}
                                      >
                                        Market Cap
                                      </span>
                                      <span
                                        className={tcx(
                                          "search-result-market-cap"
                                        )}
                                      >
                                        {formatMarketCap(token.marketCap)}
                                      </span>
                                      <span
                                        className={tcx("search-result-change")}
                                      >
                                        <img
                                          src={
                                            (token.marketCapChangePercent ??
                                              0) >= 0
                                              ? "/icons/stat-up.svg"
                                              : "/icons/stat-down.svg"
                                          }
                                          alt={
                                            (token.marketCapChangePercent ??
                                              0) >= 0
                                              ? "Up"
                                              : "Down"
                                          }
                                          width="10"
                                          height="10"
                                          style={{ marginRight: "3px" }}
                                        />
                                        <span
                                          className={tcx(
                                            (token.marketCapChangePercent ??
                                              0) >= 0
                                              ? "is-positive"
                                              : "is-negative"
                                          )}
                                        >
                                          {Math.abs(
                                            token.marketCapChangePercent ?? 0
                                          ).toFixed(0)}
                                          %
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* No Results */}
                    {searchTerm && filteredTokens.length === 0 && (
                      <div className={tcx("search-no-results")}>
                        <p>No results</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!showSearchInput && filteredTokens.length > 0 && (
              <section className={tcx("featured-trending-section")}>
                {filteredTokens.map((token) => {
                  const topTrades = Array.isArray(token.topPortfolios)
                    ? token.topPortfolios.slice(0, 2)
                    : [];
                  const lastTrade = token.latestTrade;
                  const ticker = token.ticker || token.symbol;

                  return (
                    <article
                      key={token.fundId}
                      className={tcx("featured-trending-card")}
                      onClick={() => handleTokenClick(token)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleTokenClick(token);
                        }
                      }}
                    >
                      <header className={tcx("featured-card-header")}>
                        <div className={tcx("identity-block")}>
                          <img
                            className={tcx("identity-image")}
                            src={
                              token.imageUrl || "/images/default-profile.png"
                            }
                            alt={token.name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.src =
                                "/images/default-profile.png";
                            }}
                          />
                          <div className={tcx("identity-meta")}>
                            <div className={tcx("identity-name-row")}>
                              <h3 className={tcx("identity-name")}>
                                {token.name}
                              </h3>
                              {ticker && (
                                <span className={tcx("identity-symbol")}>
                                  {formatSymbol(ticker)}
                                </span>
                              )}
                            </div>
                            <div className={tcx("featured-metrics-row")}>
                              <div className={tcx("metric-card")}>
                                <span className={tcx("metric-inline-title")}>
                                  Agents
                                </span>
                                <span
                                  className={tcx("metric-inline-subtitle")}
                                  style={{ marginLeft: "8px" }}
                                >
                                  Total PnL
                                </span>
                                <span
                                  className={tcx("metric-inline-value", {
                                    positive: token.totalPnL > 0,
                                    negative: token.totalPnL < 0,
                                  })}
                                  style={{
                                    color: "#D1D9E0",
                                    marginLeft: "4px",
                                  }}
                                >
                                  {formatPercent(token.totalPnL, 0)}
                                </span>
                                <span className={tcx("metric-inline-change")}>
                                  <img
                                    src={
                                      (token.totalPnLChangePercent ?? 0) >= 0
                                        ? "/icons/stat-up.svg"
                                        : "/icons/stat-down.svg"
                                    }
                                    alt={
                                      (token.totalPnLChangePercent ?? 0) >= 0
                                        ? "Up"
                                        : "Down"
                                    }
                                    width="12"
                                    height="12"
                                  />
                                  <span
                                    className={tcx(
                                      (token.totalPnLChangePercent ?? 0) >= 0
                                        ? "is-positive"
                                        : "is-negative"
                                    )}
                                  >
                                    {Math.abs(
                                      token.totalPnLChangePercent ?? 0
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </span>
                              </div>
                              <div className={tcx("metric-card")}>
                                <span className={tcx("metric-inline-title")}>
                                  <span>Token</span>
                                </span>
                                <span className={tcx("metric-inline-subtitle")}>
                                  <span style={{ marginLeft: "8px" }}>
                                    Market Cap
                                  </span>
                                </span>
                                <span className={tcx("metric-inline-value")}>
                                  <span style={{ marginLeft: "4px" }}>
                                    {formatMarketCap(token.marketCap)}
                                  </span>
                                </span>
                                <span
                                  className={tcx("metric-inline-change", {
                                    positive:
                                      (token.marketCapChangePercent ?? 0) >= 0,
                                    negative:
                                      (token.marketCapChangePercent ?? 0) < 0,
                                  })}
                                >
                                  <img
                                    src={
                                      (token.marketCapChangePercent ?? 0) >= 0
                                        ? "/icons/stat-up.svg"
                                        : "/icons/stat-down.svg"
                                    }
                                    alt={
                                      (token.marketCapChangePercent ?? 0) >= 0
                                        ? "Up"
                                        : "Down"
                                    }
                                    width="12"
                                    height="12"
                                    style={{ top: "12px" }}
                                  />
                                  <span
                                    className={tcx(
                                      (token.marketCapChangePercent ?? 0) >= 0
                                        ? "is-positive"
                                        : "is-negative"
                                    )}
                                  >
                                    {Math.abs(
                                      token.marketCapChangePercent ?? 0
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </span>
                              </div>
                              <div className={tcx("card-action-buttons")}>
                                <button
                                  type="button"
                                  className={tcx("icon-button")}
                                  title="Copy link"
                                  aria-label="Copy trading link"
                                  onClick={(event) =>
                                    handleCopyTokenLink(event, token)
                                  }
                                >
                                  <img
                                    src={
                                      copiedTokenId === token.fundId
                                        ? "/icons/greenCheck.svg"
                                        : "/icons/copyIcon.svg"
                                    }
                                    alt={
                                      copiedTokenId === token.fundId
                                        ? "Copied"
                                        : "Copy"
                                    }
                                    width="18"
                                    height="18"
                                    title={
                                      copiedTokenId === token.fundId
                                        ? "Copied!"
                                        : "Copy contract address"
                                    }
                                  />
                                </button>
                                {token.website && token.website.trim() && (
                                  <button
                                    type="button"
                                    className={tcx("icon-button")}
                                    title="Website"
                                    aria-label="Open website"
                                    onClick={(event) =>
                                      handleOpenWebsite(event, token)
                                    }
                                  >
                                    <img
                                      src="/icons/website.svg"
                                      alt="Website"
                                      width="18"
                                      height="18"
                                    />
                                  </button>
                                )}
                                {token.twitter && token.twitter.trim() && (
                                  <button
                                    type="button"
                                    className={tcx("icon-button")}
                                    title="Twitter"
                                    aria-label="Open Twitter"
                                    onClick={(event) =>
                                      handleOpenTwitter(event, token)
                                    }
                                  >
                                    <img
                                      src="/icons/twitterlink.svg"
                                      alt="Twitter"
                                      width="18"
                                      height="18"
                                    />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </header>

                      <div className={tcx("featured-info-strip")}>
                        <div className={tcx("featured-strip-top")}>
                          <span className={tcx("strip-icon", "arrow")}>
                            <img
                              src="/icons/TopTrades.svg"
                              alt="Top Trades"
                              width="10"
                              height="12"
                            />
                          </span>
                          <span className={tcx("strip-title")}>Top Trades</span>
                          <div className={tcx("strip-chips")}>
                            {topTrades.length > 0 ? (
                              topTrades.map((trade, index) => (
                                <span
                                  key={`${token.fundId}-trade-${index}`}
                                  className={tcx("strip-chip")}
                                >
                                  <span className={tcx("chip-symbol")}>
                                    {formatSymbol(trade.symbol)}
                                  </span>
                                  <span
                                    className={tcx(
                                      "chip-change",
                                      Number(trade.totalPnl) >= 0
                                        ? "is-positive"
                                        : "is-negative"
                                    )}
                                  >
                                    {formatPercent(Number(trade.totalPnl), 0)}
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className={tcx("strip-empty")}>
                                No top trades
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={tcx("featured-strip-bottom")}>
                          <span className={tcx("strip-icon-clock")}>
                            <img
                              src="/icons/lastTrade.svg"
                              alt="Last Trade"
                              width="13"
                              height="13"
                            />
                          </span>
                          <span className={tcx("strip-title-clock")}>
                            Last Trade
                          </span>
                          {lastTrade ? (
                            <div className={tcx("strip-last-trade")}>
                              <span
                                className={tcx("last-trade-type", {
                                  buy: lastTrade.type === "BUY",
                                  sell: lastTrade.type === "SELL",
                                })}
                              >
                                {lastTrade.type === "BUY" ? "Buy" : "Sell"}
                              </span>
                              <span
                                className={tcx(
                                  "last-trade-detail",
                                  lastTrade.type === "BUY"
                                    ? "is-positive"
                                    : "is-negative"
                                )}
                              >
                                {`${formatSolAmount(
                                  lastTrade.solAmount
                                )} SOL of ${formatSymbol(lastTrade.symbol)}`}
                              </span>
                            </div>
                          ) : (
                            <span className={tcx("strip-empty")}>
                              No trades yet
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={tcx("featured-card-cta")}>
                        <button
                          type="button"
                          className={tcx("featured-buy-button")}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleTokenClick(token);
                          }}
                        >
                          <span className={tcx("buy-icon")}>
                            <img
                              src="/icons/BuyNowWhite.svg"
                              alt="Buy Now"
                              width="18"
                              height="18"
                            />
                          </span>
                          <span style={{ marginLeft: "8px" }}>Buy Now</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            {error && (
              <div className={tcx("error")}>
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
        {/* <MoltenFooter /> */}
      </div>

      {/* LoginFlowModal - invite code 인증 후 한 번만 표시 */}
      {showLoginFlow && (
        <LoginFlowModal
          isOpen={showLoginFlow}
          onClose={handleLoginFlowClose}
          onComplete={handleLoginFlowComplete}
        />
      )}
    </main>
    // </SocketProvider>
  );
};

// Suspense로 감싸는 메인 컴포넌트
const MainPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainPageContent />
    </Suspense>
  );
};

export default MainPage;

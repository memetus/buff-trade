"use client";

import React, { useMemo, useState } from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Props = {
  imageUrl?: string;
  name?: string;
  symbol?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  tokenMint?: string;
  marketCap?: number;
  marketCapProgress?: number;
  targetMarketCap?: number;
  totalPnL?: number;
  topPortfolios?: any[];
  lastTrade?: any;
  onBack?: () => void;
};

const AgentHeader: React.FC<Props> = ({
  imageUrl,
  name,
  symbol,
  website,
  twitter,
  telegram,
  tokenMint,
  marketCap,
  marketCapProgress,
  targetMarketCap,
  totalPnL,
  topPortfolios,
  lastTrade,
  onBack,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const topTrades = useMemo(() => {
    if (!Array.isArray(topPortfolios)) return [] as any[];
    return topPortfolios.slice(0, 2);
  }, [topPortfolios]);

  const formatSymbol = (value?: string) => {
    if (!value) return "--";
    const trimmed = value.trim();
    if (!trimmed) return "--";
    return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
  };

  const parseNumber = (value: any): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const handleOpenLink = (url?: string) => {
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    const finalUrl = trimmed.startsWith("http")
      ? trimmed
      : `https://${trimmed}`;
    window.open(finalUrl, "_blank");
  };

  const handleCopy = async () => {
    if (!tokenMint) return;

    try {
      await navigator.clipboard.writeText(tokenMint);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };
  const totalPnLValue = typeof totalPnL === "number" ? totalPnL : 0;
  const totalPnLClass = totalPnLValue >= 0 ? "is-positive" : "is-negative";
  const formattedMarketCap =
    typeof marketCap === "number" ? `$${marketCap.toLocaleString()}` : "--";

  const lastTradeAmount = parseNumber(
    lastTrade?.solAmount ?? lastTrade?.amount
  );
  const lastTradeTypeRaw =
    typeof lastTrade?.type === "string" ? lastTrade.type.toUpperCase() : "";
  const lastTradeType = lastTradeTypeRaw === "SELL" ? "SELL" : "BUY";

  return (
    <div className={cx("agent-header")}>
      <div className={cx("agent-header-card")}>
        <div className={cx("identity-block")}>
          <div className={cx("identity-image")}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name || symbol || "Agent"}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className={cx("identity-image-placeholder")}>🤖</div>
            )}
          </div>
          <div className={cx("identity-meta")}>
            <div className={cx("identity-name-row")}>
              <h3 className={cx("identity-name")}>{name}</h3>
              {symbol && (
                <span className={cx("identity-symbol")}>
                  {formatSymbol(symbol)}
                </span>
              )}
              <div className={cx("identity-actions")}>
                {tokenMint && (
                  <button
                    type="button"
                    className={cx("identity-icon-button")}
                    onClick={handleCopy}
                    title="Copy contract address"
                    aria-label="Copy contract address"
                  >
                    <img
                      src={
                        isCopied
                          ? "/icons/greenCheck.svg"
                          : "/icons/copyIcon.svg"
                      }
                      alt={isCopied ? "Copied" : "Copy"}
                      width={18}
                      height={18}
                    />
                  </button>
                )}
                {website && website.trim() && (
                  <button
                    type="button"
                    className={cx("identity-icon-button")}
                    title="Website"
                    aria-label="Open website"
                    onClick={() => handleOpenLink(website)}
                  >
                    <img
                      src="/icons/website.svg"
                      alt="Website"
                      width={18}
                      height={18}
                    />
                  </button>
                )}
                {twitter && twitter.trim() && (
                  <button
                    type="button"
                    className={cx("identity-icon-button")}
                    title="Twitter"
                    aria-label="Open Twitter"
                    onClick={() => handleOpenLink(twitter)}
                  >
                    <img
                      src="/icons/twitterlink.svg"
                      alt="Twitter"
                      width={18}
                      height={18}
                    />
                  </button>
                )}
                {telegram && telegram.trim() && (
                  <button
                    type="button"
                    className={cx("identity-icon-button")}
                    title="Telegram"
                    aria-label="Open Telegram"
                    onClick={() => handleOpenLink(telegram)}
                  >
                    <img
                      src="/icons/telegram.svg"
                      alt="Telegram"
                      width={18}
                      height={18}
                    />
                  </button>
                )}
              </div>
            </div>

            <div className={cx("identity-metrics")}>
              <div className={cx("metric-card")}>
                <span className={cx("metric-title")}>Total PnL</span>
                <span className={cx("metric-value", totalPnLClass)}>
                  {`${totalPnLValue >= 0 ? "+" : ""}${totalPnLValue.toFixed(
                    2
                  )}%`}
                </span>
              </div>
              <div className={cx("metric-card")}>
                <span className={cx("metric-title")}>Market Cap</span>
                <span className={cx("metric-value")}>{formattedMarketCap}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={cx("info-strip")}>
          <div className={cx("strip-top")}>
            <span className={cx("strip-icon")}>
              <img
                src="/icons/TopTrades.svg"
                alt="Top Trades"
                width={10}
                height={12}
              />
            </span>
            <span className={cx("strip-title")}>Top Trades</span>
            <div className={cx("strip-chips")}>
              {topTrades.length > 0 ? (
                <>
                  {topTrades.map((trade, index) => {
                    const pnlValue = parseNumber(
                      trade.totalPnL ?? trade.totalPnl ?? trade.pnl
                    );
                    const symbolValue =
                      trade.symbol || trade.token || trade.ticker || symbol;
                    return (
                      <span
                        className={cx("strip-chip")}
                        key={`top-trade-${index}`}
                      >
                        <span className={cx("chip-symbol")}>
                          {formatSymbol(symbolValue)}
                        </span>
                        <span
                          className={cx(
                            "chip-change",
                            pnlValue >= 0 ? "is-positive" : "is-negative"
                          )}
                        >
                          {`${pnlValue >= 0 ? "+" : "-"}${Math.abs(
                            pnlValue
                          ).toFixed(0)}%`}
                        </span>
                      </span>
                    );
                  })}
                </>
              ) : (
                <span className={cx("strip-empty")}>No top trades</span>
              )}
            </div>
          </div>
          <div className={cx("strip-bottom")}>
            <span className={cx("strip-icon-clock")}>
              <img
                src="/icons/lastTrade.svg"
                alt="Last Trade"
                width={13}
                height={13}
              />
            </span>
            <span className={cx("strip-title-clock")}>Last Trade</span>
            {lastTrade ? (
              <div className={cx("strip-last-trade")}>
                <span
                  className={cx(
                    "last-trade-type",
                    lastTradeType === "BUY" ? "buy" : "sell"
                  )}
                >
                  {lastTradeType === "BUY" ? "Buy" : "Sell"}
                </span>
                <span
                  className={cx(
                    "last-trade-detail",
                    lastTradeType === "BUY" ? "is-positive" : "is-negative"
                  )}
                >
                  {`${lastTradeAmount.toFixed(1)} SOL of ${formatSymbol(
                    symbol
                  )}`}
                </span>
              </div>
            ) : (
              <span className={cx("strip-empty")}>No trades yet</span>
            )}
          </div>
        </div>
      </div>
      <div className={cx("market-cap-section")}>
        {(() => {
          const derived =
            typeof marketCapProgress === "number"
              ? marketCapProgress
              : targetMarketCap &&
                targetMarketCap > 0 &&
                typeof marketCap === "number"
              ? (marketCap / targetMarketCap) * 100
              : 0;
          const clamped = Math.max(0, Math.min(100, derived));
          const fill = clamped > 0 && clamped < 1 ? 1 : clamped;
          return (
            <>
              <div className={cx("market-cap-title-row")}>
                <span className={cx("market-cap-section-title")}>
                  Market Cap Progress
                </span>
                <span className={cx("market-cap-section-target-value")}>
                  {clamped.toFixed(2)}%
                </span>
              </div>
              <div className={cx("progress-bar")}>
                <div
                  className={cx("progress-fill")}
                  style={{ width: `${fill}%` }}
                />
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default AgentHeader;

"use client";

import React from "react";
import { AgentMetadata, PoolInfo } from "../types";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface VirtualFundStatsProps {
  agentMetadata: AgentMetadata | null;
  poolInfo: PoolInfo[];
  topPortfolios: any[];
  tokenSymbol: string;
  lastTrade: any;
}

const VirtualFundStats: React.FC<VirtualFundStatsProps> = ({
  agentMetadata,
  poolInfo,
  topPortfolios,
  tokenSymbol,
  lastTrade,
}) => {
  const parseNumber = (value: any): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatSymbol = (value?: string) => {
    if (!value) return "--";
    const trimmed = value.trim();
    if (!trimmed) return "--";
    return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
  };

  const topTrade = topPortfolios?.[0];
  const topTradeSymbol = topTrade?.symbol || topTrade?.token || tokenSymbol;
  const topTradePnL = parseNumber(topTrade?.totalPnL ?? topTrade?.totalPnl);

  const totalPnLValue = parseNumber(agentMetadata?.totalPnL);
  const marketCapValue = Number(agentMetadata?.marketCap) || 0;
  const lastTradeAmount = parseNumber(lastTrade?.solAmount ?? lastTrade?.amount);
  const lastTradeTypeRaw =
    typeof lastTrade?.type === "string" ? lastTrade.type.toUpperCase() : "";
  const lastTradeType = lastTradeTypeRaw === "SELL" ? "SELL" : "BUY";

  const formatSolAmount = (value?: number) => {
    if (!value) return "0.0";
    if (value >= 1000) return value.toFixed(0);
    if (value >= 10) return value.toFixed(1);
    return value.toFixed(2);
  };

  return (
    <div className={cx("fund-stats-section")}>
      <div className={cx("stats-list")}>
        <div className={cx("stat-row")}>
          <span className={cx("stat-label")}>Total PnL</span>
          <span
            className={cx(
              "stat-value",
              "pnl-value",
              totalPnLValue >= 0 ? "positive" : "negative"
            )}
          >
            {`${totalPnLValue >= 0 ? "+" : "-"}${Math.abs(totalPnLValue).toFixed(
              2
            )}%`}
          </span>
        </div>
        <div className={cx("stat-row")}>
          <span className={cx("stat-label")}>Market Cap</span>
          <span className={cx("stat-value")}>
            ${marketCapValue.toLocaleString()}
          </span>
        </div>
        <div className={cx("stat-row")}>
          <span className={cx("stat-label")}>Top Trades</span>
          <div className={cx("stat-content")}>
            {topTrade ? (
              <>
                <span className={cx("trade-details-first-topTrade")}>
                  {formatSymbol(topTradeSymbol)}
                </span>
                <span
                  className={cx(
                    "trade-details-second-topTrade",
                    topTradePnL >= 0 ? "positive" : "negative"
                  )}
                >
                  {`${topTradePnL >= 0 ? "+" : "-"}${Math.abs(topTradePnL).toFixed(
                    0
                  )}%`}
                </span>
              </>
            ) : (
              <span className={cx("stat-placeholder")}>No top trades</span>
            )}
          </div>
        </div>
        <div className={cx("stat-row")}>
          <span className={cx("stat-label")}>Last Trade</span>
          <div className={cx("stat-content")}>
            {lastTrade ? (
              <>
                <button
                  className={cx(
                    "trade-badge",
                    lastTradeType === "BUY" ? "buy" : "sell"
                  )}
                >
                  {lastTradeType === "BUY" ? "Buy" : "Sell"}
                </button>
                <span
                  className={cx(
                    "trade-details-lastTrade",
                    lastTradeType === "BUY" ? "positive" : "negative"
                  )}
                >
                  {`${formatSolAmount(lastTradeAmount)} SOL of ${formatSymbol(
                    tokenSymbol
                  )}`}
                </span>
              </>
            ) : (
              <span className={cx("stat-placeholder")}>No trades yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualFundStats;

// Token Table - Commented out for future reference
// This component contains the table view logic that was removed from the main page

/*
import React from "react";
import { TokenData } from "../types";
import TestStyles from "@/app/test/page.module.scss";
import classNames from "classnames/bind";

const tcx = classNames.bind(TestStyles);

interface TokenTableCommentedProps {
  filteredTokens: TokenData[];
  handleTokenClick: (token: TokenData) => void;
  ensureInvited: (action: () => void) => void;
  isGraduated: (token: TokenData) => boolean;
}

const TokenTableCommented: React.FC<TokenTableCommentedProps> = ({
  filteredTokens,
  handleTokenClick,
  ensureInvited,
  isGraduated,
}) => {
  return (
    <div className={tcx("token-table")}>
      <div className={tcx("table-header")}>
        <div className={tcx("col-token")}>Token</div>
        <div className={tcx("col-market-cap")}>Market Cap</div>
        <div className={tcx("col-last-trade")}>Last Trade</div>
        <div className={tcx("col-top-trade")}>Top Trades</div>
        <div className={tcx("col-total-pnl")}>Total PnL</div>
        <div className={tcx("col-action")}></div>
      </div>

      {filteredTokens.map((token) => (
        <div
          key={token.fundId}
          className={tcx("table-row")}
          onClick={() => handleTokenClick(token)}
        >
          <div className={tcx("col-token")} data-label="Token">
            <div className={tcx("token-cell")}>
              <img
                className={tcx("token-icon")}
                src={token.imageUrl || "/images/default-profile.png"}
                alt={token.name}
                loading="lazy"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  objectFit: "cover",
                  marginBottom: 0,
                }}
                onError={(e) => {
                  e.currentTarget.src = "/images/default-profile.png";
                }}
              />
              <span>{token.name}</span>
              {isGraduated(token) && (
                <span className={tcx("graduated-badge")}>🎓</span>
              )}
            </div>
          </div>
          <div className={tcx("col-market-cap")} data-label="Market Cap">
            ${token.marketCap ? token.marketCap.toLocaleString() : "0"}
          </div>
          <div className={tcx("col-last-trade")} data-label="Last Trade">
            <div className={tcx("last-trade-container")}>
              <button
                className={tcx("trade-action-btn", {
                  buy: token.latestTrade?.type === "BUY",
                  sell: token.latestTrade?.type === "SELL",
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTokenClick(token);
                }}
              >
                {token.latestTrade?.type || "Buy"}
              </button>
              <span className={tcx("trade-details")}>
                {token.latestTrade ? (
                  <>
                    {Math.trunc(
                      token.latestTrade.solAmount
                    ).toLocaleString()}{" "}
                    SOL of {token.latestTrade.symbol}
                  </>
                ) : (
                  "No trades"
                )}
              </span>
            </div>
          </div>
          <div className={tcx("col-top-trade")} data-label="Top Trades">
            {Array.isArray(token.topPortfolios) &&
            token.topPortfolios.length > 0
              ? token.topPortfolios.slice(0, 1).map((tp, idx) => (
                  <span
                    key={`${token.fundId}-row-tp-${idx}`}
                    className={tcx("row-chip")}
                  >
                    <span>{tp.symbol}</span>{" "}
                    <span
                      className={tcx("top-trade-pnl", {
                        positive: Number(tp.totalPnl) >= 0,
                      })}
                    >
                      {Number(tp.totalPnl) >= 0 ? "+" : ""}
                      {Math.trunc(Number(tp.totalPnl))}%
                    </span>
                  </span>
                ))
              : "-"}
          </div>
          <div className={tcx("col-total-pnl")} data-label="Total PnL">
            <span
              className={tcx("pnl", {
                positive: token.totalPnL > 0,
                negative: token.totalPnL < 0,
                zero: token.totalPnL === 0,
              })}
              title={`Total PnL: ${token.totalPnL}%`}
              style={{
                color:
                  token.totalPnL > 0
                    ? "#10b981"
                    : token.totalPnL < 0
                    ? "#ef4444"
                    : "#6b7280",
                fontWeight: "700",
                fontSize: "0.95rem",
              }}
            >
              {token.totalPnL !== undefined && token.totalPnL !== null
                ? `${
                    token.totalPnL > 0 ? "+" : ""
                  }${token.totalPnL.toFixed(2)}%`
                : "N/A"}
            </span>
          </div>
          <div className={tcx("col-action")} data-label="Action">
            <button
              className={tcx("buy-button")}
              onClick={(e) => {
                e.stopPropagation();
                ensureInvited(() => handleTokenClick(token));
              }}
            >
              Buy
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TokenTableCommented;
*/

// This file is kept for reference but the component is not exported
// Remove this file if the table view is not needed in the future

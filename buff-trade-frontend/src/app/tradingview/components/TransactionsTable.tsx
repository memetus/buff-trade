"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";
import TokenTransactions from "./TokenTransactions";
import TokenHolders from "./TokenHolders";

const cx = classNames.bind(styles);

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  fundId?: string | null;
  title?: string;
  showTitle?: boolean;
};

type ActivityItem = {
  type: "buy" | "sell";
  token: string;
  address: string;
  txHash: string;
  total: number | null;
  profit: number | null;
  yaps: string;
  createdAt: string;
};

type PortfolioItem = {
  token: string;
  address: string;
  realizedProfit: number;
  unrealizedProfit: number;
  totalPnL: number; // percent
  nav: number;
};

const formatCurrency = (n: number | null) => {
  if (n === null || Number.isNaN(n)) return "-";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
};

const formatPercent = (n: number | null) => {
  if (n === null || Number.isNaN(n)) return "-";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n).toFixed(2);
  return `${sign}${abs}%`;
};

const formatAge = (iso: string) => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

type TransactionsTabsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  className?: string;
};

export const TransactionsTabs: React.FC<TransactionsTabsProps> = ({
  activeTab,
  setActiveTab,
  className,
}) => {
  return (
    <div className={cx("tab-buttons", className)}>
      <button
        className={cx("tab-btn", {
          active: activeTab === "token-transactions",
        })}
        onClick={() => setActiveTab("token-transactions")}
      >
        Token Transactions
      </button>
      <button
        className={cx("tab-btn", {
          active: activeTab === "token-holders",
        })}
        onClick={() => setActiveTab("token-holders")}
      >
        Token Holders
      </button>
      <button
        className={cx("tab-btn", {
          active: activeTab === "agent-activity",
        })}
        onClick={() => setActiveTab("agent-activity")}
      >
        Agent Activity
      </button>
      <button
        className={cx("tab-btn", {
          active: activeTab === "agent-portfolio",
        })}
        onClick={() => setActiveTab("agent-portfolio")}
      >
        Agent Portfolio
      </button>
    </div>
  );
};

const TransactionsTable: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  fundId,
  title = "About",
  showTitle = true,
}) => {
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);
  const [activityTotal, setActivityTotal] = React.useState(0);
  const [portfolio, setPortfolio] = React.useState<PortfolioItem[]>([]);
  const [portfolioTotal, setPortfolioTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);

  const loadActivity = React.useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/agent-data/activity/${fundId}?page=${page}&pageSize=${pageSize}`
      );
      if (res.ok) {
        const json = await res.json();
        setActivity(json.results || []);
        setActivityTotal(json.totalCount || 0);
      } else {
        setActivity([]);
        setActivityTotal(0);
      }
    } catch {
      setActivity([]);
      setActivityTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fundId, page, pageSize]);

  const loadPortfolio = React.useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    try {
      const url = `/api/agent-data/portfolio/${fundId}?sort=totalPnL&sortOrder=desc&page=${page}&pageSize=${pageSize}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setPortfolio(json.results || []);
        setPortfolioTotal(json.totalCount || 0);
      } else {
        setPortfolio([]);
        setPortfolioTotal(0);
      }
    } catch {
      setPortfolio([]);
      setPortfolioTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fundId, page, pageSize]);

  React.useEffect(() => {
    if (activeTab === "agent-activity") loadActivity();
    if (activeTab === "agent-portfolio") loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fundId, page]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      ((activeTab === "agent-activity" ? activityTotal : portfolioTotal) || 0) /
        pageSize
    )
  );

  React.useEffect(() => {
    setPage(1);
  }, [activeTab]);

  return (
    <div className={cx("transactions-section")}>
      {showTitle && (
        <div className={cx("transactions-header")}>
          <div className={cx("section-header")}>
            <span className={cx("section-title")}>{title}</span>
            <TransactionsTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>
        </div>
      )}

      <div className={cx("table-container")}>
        {activeTab === "token-transactions" && (
          <div className={cx("tab-content", "token-transactions")}>
            <TokenTransactions fundId={fundId} />
          </div>
        )}

        {activeTab === "token-holders" && (
          <div className={cx("tab-content", "token-holders")}>
            <TokenHolders fundId={fundId} />
          </div>
        )}

        {activeTab === "agent-activity" && (
          <div className={cx("tab-content", "agent-activity")}>
            {!loading && (
              <div className={cx("table-wrapper")}>
                <table className={cx("activity-table")}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Token</th>
                      <th>Amount</th>
                      <th>Profit</th>
                      <th>Rationale</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No activity</td>
                      </tr>
                    ) : (
                      activity.map((row, idx) => (
                        <tr key={`${row.address}-${row.createdAt}-${idx}`}>
                          <td>
                            <span
                              className={cx(
                                "trade-type",
                                row.type === "buy" ? "buy" : "sell"
                              )}
                            >
                              {row.type === "buy" ? "Buy" : "Sell"}
                            </span>
                          </td>
                          <td>{row.token}</td>
                          <td
                            className={cx(
                              (row.total ?? 0) >= 0 ? "positive" : "negative"
                            )}
                          >
                            {formatCurrency(row.total)}
                          </td>
                          <td
                            className={cx(
                              (row.profit ?? 0) >= 0 ? "positive" : "negative"
                            )}
                          >
                            {formatCurrency(row.profit)}
                          </td>
                          <td>
                            <div className={cx("rationale")}>
                              <span>{row.yaps}</span>
                            </div>
                          </td>
                          <td>{formatAge(row.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "agent-portfolio" && (
          <div className={cx("tab-content", "agent-portfolio")}>
            {!loading && (
              <div className={cx("table-wrapper")}>
                <table className={cx("portfolio-table")}>
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>NAV</th>
                      <th>Realized PnL</th>
                      <th>Unrealized PnL</th>
                      <th>Total PnL (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No portfolio</td>
                      </tr>
                    ) : (
                      portfolio.map((row, idx) => (
                        <tr key={`${row.address}-${idx}`}>
                          <td>{row.token}</td>
                          <td>{formatCurrency(row.nav)}</td>
                          <td
                            className={cx(
                              row.realizedProfit >= 0 ? "positive" : "negative"
                            )}
                          >
                            {formatCurrency(row.realizedProfit)}
                          </td>
                          <td
                            className={cx(
                              row.unrealizedProfit >= 0
                                ? "positive"
                                : "negative"
                            )}
                          >
                            {formatCurrency(row.unrealizedProfit)}
                          </td>
                          <td
                            className={cx(
                              row.totalPnL >= 0 ? "positive" : "negative"
                            )}
                          >
                            {formatPercent(row.totalPnL)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <div className={cx("pagination")}>
          <button
            className={cx("pagination-btn")}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <div className={cx("page-numbers")}>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  className={cx("page-btn", { active: page === pageNum })}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            )}
          </div>
          <button
            className={cx("pagination-btn")}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable;

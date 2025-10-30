"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "../page.module.scss";
import classNames from "classnames/bind";
import Reactotron from "reactotron-react-js";

const cx = classNames.bind(styles);

type Props = {
  fundId?: string | null;
};

type TransactionData = {
  type?: "buy" | "sell";
  account?: string;
  amount?: number;
  tokenAmount?: number;
  rationale?: string;
  txLink?: string;
  timestamp?: string;
  // API에서 받을 수 있는 다른 필드들
  [key: string]: any;
};

const TokenTransactions: React.FC<Props> = ({ fundId }) => {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const buildExplorerHref = (rawLink: string | undefined) => {
    const cluster =
      process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "devnet" : "";

    if (!rawLink || rawLink === "#") return "#";

    const isHttp = /^https?:\/\//i.test(rawLink);
    if (!isHttp) {
      // Treat as signature
      return `https://solscan.io/tx/${rawLink}${
        cluster ? `?cluster=${cluster}` : ""
      }`;
    }

    try {
      const url = new URL(rawLink);
      const host = url.hostname.toLowerCase();
      const isSolscan = host.includes("solscan.io");
      const isExplorer = host.includes("explorer.solana.com");
      if (
        (isSolscan || isExplorer) &&
        cluster &&
        !url.searchParams.has("cluster")
      ) {
        url.searchParams.set("cluster", cluster);
      }
      return url.toString();
    } catch {
      // Fallback to signature link
      return `https://solscan.io/tx/${rawLink}${
        cluster ? `?cluster=${cluster}` : ""
      }`;
    }
  };

  const resolveTransactionType = (tx: any): "buy" | "sell" => {
    const candidates = [tx?.type, tx?.transaction_type, tx?.side, tx?.action];

    for (const candidate of candidates) {
      if (typeof candidate !== "string") continue;
      const normalized = candidate.trim().toLowerCase();
      if (normalized === "buy" || normalized === "sell") {
        return normalized;
      }
    }

    return "sell";
  };

  const loadTransactions = useCallback(
    async (targetPage: number) => {
      if (!fundId) return;
      setLoading(true);

      try {
        const res = await fetch(
          `/api/agent-data/token-transactions/${fundId}?page=${targetPage}&pageSize=${pageSize}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const json = await res.json();

          // API 응답 구조에 맞게 수정: json.transactions 또는 json.results
          const rawTransactions = json.transactions || json.results || [];

          // API 데이터를 컴포넌트에서 사용하는 형식으로 변환
          const mappedTransactions = rawTransactions.map((tx: any) => ({
            ...tx,
            type: resolveTransactionType(tx),
            account:
              tx.account ||
              tx.user_address ||
              tx.from ||
              tx.userAccount ||
              "Unknown",
            amount: tx.amount || tx.sol_amount || tx.value || tx.solAmount || 0,
            tokenAmount: tx.token_amount || tx.quantity || 0,
            rationale: tx.rationale || tx.reason || "No reason provided",
            txLink:
              tx.tx_link ||
              tx.transaction_hash ||
              tx.hash ||
              tx.signature ||
              "#",
            timestamp:
              tx.timestamp ||
              tx.created_at ||
              tx.date ||
              new Date().toISOString(),
          }));
          setTransactions(mappedTransactions);
        } else {
          setTransactions([]);
        }
      } catch (error) {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [fundId, pageSize]
  );

  useEffect(() => {
    if (!fundId) return;
    loadTransactions(page);
  }, [fundId, page, loadTransactions]);

  useEffect(() => {
    const handler = () => {
      setPage(1);
      loadTransactions(1);
    };

    window.addEventListener("devnet-trade", handler);
    return () => window.removeEventListener("devnet-trade", handler);
  }, [loadTransactions]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(3)}k`;
    }
    return amount.toFixed(4);
  };

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(3)}k`;
    }
    return amount.toFixed(0);
  };

  // Safe transactions array for rendering
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const totalPages = Math.ceil(safeTransactions.length / pageSize);

  return (
    <div className={cx("token-transactions")}>
      <div className={cx("transactions-header")}>
        <div className={cx("section-title")}>Token Transactions</div>
      </div>

      <div className={cx("table-container")}>
        <div className={cx("table-wrapper")}>
          <table className={cx("transactions-table")}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Account</th>
                <th>Sol Amount</th>
                <th>Token Amount</th>
                <th>Transaction Time</th>
                <th>Tx Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? null : safeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6}>No transactions</td>
                </tr>
              ) : (
                safeTransactions.map((tx, idx) => (
                  <tr key={`${tx.account}-${tx.timestamp}-${idx}`}>
                    <td>
                      <span
                        className={cx(
                          "trade-type",
                          tx.type === "buy" ? "buy" : "sell"
                        )}
                      >
                        {tx.type === "buy" ? "Buy" : "Sell"}
                      </span>
                    </td>
                    <td className={cx("account-address")}>
                      {tx.account
                        ? `${tx.account.slice(0, 5)}...${tx.account.slice(-5)}`
                        : "Unknown"}
                    </td>
                    <td>{formatAmount(tx.amount || 0)}</td>
                    <td>{formatTokenAmount(tx.tokenAmount || 0)}</td>
                    <td className={cx("timestamp")}>
                      {formatTime(
                        tx.timestamp || tx.rationale || new Date().toISOString()
                      )}
                    </td>
                    <td>
                      <a
                        href={buildExplorerHref(tx.txLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cx("tx-link")}
                      >
                        <Image
                          src="/icons/externalLink.svg"
                          alt="View transaction"
                          width={16}
                          height={16}
                        />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className={cx("pagination")}>
          <button
            className={cx("pagination-btn")}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <div className={cx("page-numbers")}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default TokenTransactions;

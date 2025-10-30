"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";
import Reactotron from "reactotron-react-js";

const cx = classNames.bind(styles);

type Props = {
  fundId?: string | null;
};

type HolderData = {
  rank?: number;
  holder?: string;
  percentage?: number;
  address?: string;
  // API에서 받을 수 있는 다른 필드들
  [key: string]: any;
};

const TokenHolders: React.FC<Props> = ({ fundId }) => {
  const [holders, setHolders] = useState<HolderData[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHolders = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/agent-data/token-holders/${fundId}`);

      if (res.ok) {
        const json = await res.json();

        // API 응답 구조에 맞게 수정: json.data.holders 또는 json.results
        const rawHolders = json.data?.holders || json.results || [];

        // API 데이터를 컴포넌트에서 사용하는 형식으로 변환
        const mappedHolders = rawHolders.map((holder: any, index: number) => ({
          rank: holder.rank || index + 1,
          holder: holder.holder || holder.address || `Holder ${index + 1}`,
          percentage: holder.percentage || holder.percentage_held || 0,
          address: holder.address || holder.holder || `Address ${index + 1}`,
          ...holder, // 원본 데이터도 보존
        }));

        setHolders(mappedHolders);
      } else {
        setHolders([]);
      }
    } catch (error) {
      setHolders([]);
    } finally {
      setLoading(false);
    }
  }, [fundId]);

  useEffect(() => {
    loadHolders();
  }, [fundId, loadHolders]);

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  // Safe holders array for rendering
  const safeHolders = Array.isArray(holders) ? holders : [];

  return (
    <div className={cx("token-holders")}>
      <div className={cx("holders-header")}>
        <div className={cx("section-title")}>Token Holders</div>
      </div>

      <div className={cx("table-container")}>
        <div className={cx("table-wrapper")}>
          {safeHolders.length === 0 ? (
            <div className={cx("empty-state")}>No holders</div>
          ) : (
            <table className={cx("holders-table")}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Holder</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {safeHolders.map((holder, idx) => (
                  <tr
                    key={`${holder.address || holder.holder || idx}-${idx}`}
                    className={cx("holder-row")}
                  >
                    <td className={cx("rank-cell")}>
                      {holder.rank || idx + 1}
                    </td>
                    <td className={cx("holder-cell")}>
                      <div className={cx("holder-info")}>
                        <span className={cx("holder-address")}>
                          {formatAddress(
                            holder.holder ||
                              holder.address ||
                              `Holder ${idx + 1}`
                          )}
                        </span>
                        <a
                          href={`https://solscan.io/account/${
                            holder.address || holder.holder || "#"
                          }${
                            process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet"
                              ? "?cluster=devnet"
                              : ""
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cx("external-link")}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15,3 21,3 21,9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </div>
                    </td>
                    <td className={cx("percentage-cell")}>
                      {formatPercentage(holder.percentage || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={cx("update-info")}>
        <span>
          updates every 1 hour / last updated {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default TokenHolders;

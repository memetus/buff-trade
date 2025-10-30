"use client";

import React from "react";
import Image from "next/image";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Pool = {
  poolAddress: string;
  poolInfo: {
    creator: string;
    baseMint: string;
    baseVault: string;
    quoteVault: string;
    baseReserve: string;
    quoteReserve: string;
    sqrtPrice: string;
    activationPoint: string;
    isMigrated: number;
    migrationProgress: number;
    protocolBaseFee: string;
    protocolQuoteFee: string;
    partnerBaseFee: string;
    partnerQuoteFee: string;
    creatorBaseFee: string;
    creatorQuoteFee: string;
    metrics: any;
  };
  marketCap: number;
};

type Props = {
  agentMetadata: any | null;
  agentCard: any | null;
  poolInfo: Pool[];
  poolLoading: boolean;
  tokenSymbol: string;
};

const PoolInfoSection: React.FC<Props> = ({
  agentMetadata,
  agentCard,
  poolInfo,
  poolLoading,
  tokenSymbol,
}) => {
  if (!agentMetadata?.poolAddress) return null;

  return (
    <div className={cx("pool-info-section")}>
      {poolLoading ? (
        <div className={cx("pool-loading")}>
          <p>Loading pool information...</p>
        </div>
      ) : poolInfo.length > 0 ? (
        poolInfo.map((pool, index) => {
          const currentSOL = parseFloat(pool.poolInfo.quoteReserve) / 1e9;
          const targetSOL = 85;
          const isMigrated = pool.poolInfo.isMigrated === 1;
          const currentMarketCap =
            (agentCard?.marketCap as number | undefined) ?? pool.marketCap;
          const targetMarketCap =
            (agentCard?.targetMarketCap as number | undefined) ??
            targetSOL * 1000000;
          const progressPercent =
            (agentCard?.marketCapProgress as number | undefined) !== undefined
              ? (agentCard!.marketCapProgress as number)
              : Math.min((currentMarketCap / targetMarketCap) * 100, 100);
          const timeRemaining = isMigrated ? "Migrated" : "11h";
          const protocolFee =
            parseInt(pool.poolInfo.protocolQuoteFee, 16) / 1e9;
          const tradeFee = (protocolFee * 100).toFixed(2);
          const realizedPnL = agentMetadata?.realizedProfit || 0;
          const unrealizedPnL = agentMetadata?.unrealizedProfit || 0;
          const totalPnL = agentMetadata?.totalPnL || 0;
          const nav = agentMetadata?.marketCap || 0;

          return (
            <div key={index} className={cx("token-card")}>
              <div className={cx("token-header")}>
                <div className={cx("token-identity")}>
                  <div className={cx("token-icon")}>
                    {agentMetadata?.imageUrl ? (
                      <Image
                        src={agentMetadata.imageUrl}
                        alt={agentMetadata.name || tokenSymbol}
                        className={cx("token-image")}
                        width={52}
                        height={52}
                        unoptimized
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : null}
                    <div
                      className={cx("token-placeholder")}
                      style={{
                        display: agentMetadata?.imageUrl ? "none" : "flex",
                      }}
                    >
                      🟡
                    </div>
                  </div>
                  <div className={cx("token-name")}>
                    <div className={cx("token-symbol")}>
                      {agentMetadata?.name || tokenSymbol}
                    </div>
                    {agentMetadata?.generation !== undefined && (
                      <div
                        className={cx("token-generation")}
                      >{`Gen${agentMetadata.generation}`}</div>
                    )}
                  </div>
                </div>
                <div className={cx("token-actions")}>
                  <button className={cx("action-btn")}>×</button>
                  <button className={cx("action-btn")}>🌐</button>
                  <button className={cx("action-btn")}>⭐</button>
                </div>
                <div className={cx("time-remaining")}>{timeRemaining}</div>
              </div>

              <div className={cx("market-cap-section")}>
                <div className={cx("section-title")}>Market Cap Progress:</div>
                <div className={cx("progress-bar")}>
                  <div
                    className={cx("progress-fill")}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className={cx("progress-values")}>
                  <span className={cx("current-value")}>
                    Current: ${currentMarketCap.toLocaleString()}
                  </span>
                  <span className={cx("target-value")}>
                    Target: ${targetMarketCap.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className={cx("token-info-section")}>
                <div className={cx("section-title")}>Token Info</div>
                <div className={cx("info-grid")}>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>
                      Migration threshold:
                    </span>
                    <span className={cx("info-value")}>{targetSOL} SOL</span>
                  </div>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>Contract address:</span>
                    <span className={cx("info-value")}>
                      {pool.poolInfo.baseMint.slice(0, 6)}...
                      {pool.poolInfo.baseMint.slice(-4)}
                      <button className={cx("copy-btn")}>📋</button>
                    </span>
                  </div>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>Developer address:</span>
                    <span className={cx("info-value")}>
                      {pool.poolInfo.creator.slice(0, 6)}...
                      {pool.poolInfo.creator.slice(-4)}
                      <button className={cx("copy-btn")}>📋</button>
                    </span>
                  </div>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>Trade Fee:</span>
                    <span className={cx("info-value")}>{tradeFee}%</span>
                  </div>
                </div>
              </div>

              <div className={cx("agent-info-section")}>
                <div className={cx("section-title")}>Agent Info</div>
                <div className={cx("info-grid")}>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>NAV:</span>
                    <span className={cx("info-value")}>
                      {nav.toLocaleString()} SOL
                    </span>
                  </div>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>Realized PnL:</span>
                    <span
                      className={cx(
                        "info-value",
                        realizedPnL >= 0 ? "positive" : "negative"
                      )}
                    >
                      {realizedPnL >= 0 ? "+" : ""}
                      {realizedPnL.toLocaleString()} SOL
                    </span>
                  </div>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>Unrealized PnL:</span>
                    <span
                      className={cx(
                        "info-value",
                        unrealizedPnL >= 0 ? "positive" : "negative"
                      )}
                    >
                      {unrealizedPnL >= 0 ? "+" : ""}
                      {unrealizedPnL.toLocaleString()} SOL
                    </span>
                  </div>
                  <div className={cx("info-item")}>
                    <span className={cx("info-label")}>Total PnL:</span>
                    <span
                      className={cx(
                        "info-value",
                        totalPnL >= 0 ? "positive" : "negative"
                      )}
                    >
                      {totalPnL >= 0 ? "+" : ""}
                      {totalPnL.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className={cx("pool-empty")}>
          <p>No pool information available</p>
        </div>
      )}
    </div>
  );
};

export default PoolInfoSection;

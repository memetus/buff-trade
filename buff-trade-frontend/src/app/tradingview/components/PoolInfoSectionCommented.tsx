// Pool Info Section - Commented out for future reference
// This component contains the pool information display logic that was removed from the main page

/*
import React from "react";
import Image from "next/image";
import { AgentMetadata, PoolInfo } from "../types";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface PoolInfoSectionCommentedProps {
  agentMetadata: AgentMetadata | null;
  poolInfo: PoolInfo[];
  poolLoading: boolean;
  tokenSymbol: string;
}

const PoolInfoSectionCommented: React.FC<PoolInfoSectionCommentedProps> = ({
  agentMetadata,
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
          const targetSOL = 85;
          const isMigrated = pool.poolInfo.isMigrated === 1;

          const currentMarketCap =
            (agentMetadata?.marketCap as number | undefined) ??
            pool.marketCap;
          // Derive target from 85 SOL using pool USD price if available
          const derivedTarget = (pool as any)?.tokenPriceUSD
            ? (pool as any).tokenPriceUSD * targetSOL
            : (agentMetadata?.targetMarketCap as
                | number
                | undefined) ?? 0;
          const targetMarketCap = Math.max(0, derivedTarget);
          const progressPercent =
            (agentMetadata?.marketCapProgress as
              | number
              | undefined) !== undefined
              ? (agentMetadata!.marketCapProgress as number)
              : targetMarketCap > 0
              ? Math.min(
                  (currentMarketCap / targetMarketCap) * 100,
                  100
                )
              : 0;

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
                        onError={(e) => {
                          // image error
                          e.currentTarget.style.display = "none";
                          const nextElement = e.currentTarget
                            .nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}
                  </div>
                  <div className={cx("token-name")}>
                    <div className={cx("token-symbol")}>
                      {agentMetadata?.name || tokenSymbol}
                    </div>
                    {agentMetadata?.generation !== undefined && (
                      <div className={cx("token-generation")}>
                        {`Gen${agentMetadata.generation}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className={cx("no-pool-info")}>
          <p>No pool information available</p>
        </div>
      )}
    </div>
  );
};

export default PoolInfoSectionCommented;
*/

// This file is kept for reference but the component is not exported
// Remove this file if the pool info section is not needed in the future

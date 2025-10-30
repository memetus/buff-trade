"use client";

import React from "react";
import Image from "next/image";
import styles from "../page.module.scss";
import classNames from "classnames/bind";
import { useCopy } from "@/shared/hooks/useCopy";

const cx = classNames.bind(styles);

type Portfolio = {
  token: string;
  totalPnL: number;
  imageUrl?: string;
  address?: string;
  creator?: string;
  contractAddress?: string;
  tokenAddress?: string;
  userAddress?: string;
  userAccount?: string;
  account?: string;
  from?: string;
  to?: string;
};

type TopPortfoliosProps = {
  items: Portfolio[];
  showTitle?: boolean;
};

const TopPortfolios: React.FC<TopPortfoliosProps> = ({
  items,
  showTitle = true,
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopyAddress = async (portfolio: Portfolio, index: number) => {
    const address =
      portfolio.userAddress ||
      portfolio.userAccount ||
      portfolio.account ||
      portfolio.from ||
      portfolio.to ||
      portfolio.contractAddress ||
      portfolio.tokenAddress ||
      portfolio.address;
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };
  return (
    <div className={cx("portfolios-section")}>
      {showTitle && <h4 className={cx("section-title")}>Top Portfolios</h4>}
      <div className={cx("portfolio-list")}>
        {items.length > 0 &&
          items.slice(0, 3).map((portfolio, index) => (
            <div key={index} className={cx("portfolio-item")}>
              <div className={cx("portfolio-left")}>
                <div className={cx("portfolio-icon")}>
                  {portfolio.imageUrl ? (
                    <Image
                      src={portfolio.imageUrl}
                      alt={portfolio.token}
                      className={cx("portfolio-image")}
                      width={40}
                      height={40}
                      unoptimized={true}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : null}
                  <div
                    className={cx("portfolio-placeholder")}
                    style={{
                      display: portfolio.imageUrl ? "none" : "flex",
                    }}
                  >
                    🏠
                  </div>
                </div>
                <div className={cx("portfolio-details")}>
                  <div className={cx("portfolio-line")}>
                    <span className={cx("portfolio-token")}>
                      ${portfolio.token}
                    </span>
                    <span
                      className={cx(
                        "portfolio-pnl",
                        portfolio.totalPnL >= 0 ? "positive" : "negative"
                      )}
                    >
                      {portfolio.totalPnL >= 0 ? "+" : ""}
                      {portfolio.totalPnL.toLocaleString()}%
                    </span>
                  </div>
                </div>
              </div>
              <div className={cx("portfolio-right")}>
                <div className={cx("portfolio-address")}>
                  <span className={cx("address-text")}>
                    {(() => {
                      const address =
                        portfolio.address || portfolio.tokenAddress;
                      return address
                        ? `${address.slice(0, 4)}...${address.slice(-4)}`
                        : "Unknown";
                    })()}
                  </span>
                  <button
                    className={cx("copy-icon")}
                    onClick={() => handleCopyAddress(portfolio, index)}
                    title="Copy address"
                  >
                    <Image
                      src={
                        copiedIndex === index
                          ? "/icons/greenCheck.svg"
                          : "/icons/copyIcon.svg"
                      }
                      alt={copiedIndex === index ? "Copied" : "Copy"}
                      width={16}
                      height={16}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        {items.length === 0 && (
          <div className={cx("no-portfolios")}>No portfolio data available</div>
        )}
      </div>
    </div>
  );
};

export default TopPortfolios;

"use client";

import React from "react";
import Image from "next/image";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Props = {
  agentCard: any | null;
};

const TokenInfoCard: React.FC<Props> = ({ agentCard }) => {
  const [copiedField, setCopiedField] = React.useState<
    "contract" | "creator" | null
  >(null);
  if (!agentCard) return null;

  const handleCopy = async (text?: string, field?: "contract" | "creator") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field ?? null);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  const shortenAddress = (value?: string) => {
    if (!value || value.length < 8) return value || "-";
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return `$${value.toLocaleString()}`;
  };

  const deriveProgress = () => {
    const progressValue = agentCard?.marketCapProgress;
    if (typeof progressValue === "number" && !Number.isNaN(progressValue)) {
      if (progressValue <= 1 && (agentCard?.targetMarketCap ?? 0) > 1) {
        return progressValue * 100;
      }
      return progressValue;
    }

    if (
      typeof agentCard?.marketCap === "number" &&
      typeof agentCard?.targetMarketCap === "number" &&
      agentCard.targetMarketCap > 0
    ) {
      return (agentCard.marketCap / agentCard.targetMarketCap) * 100;
    }

    return 0;
  };

  const rawProgress = deriveProgress();
  const normalizedProgress = Math.min(Math.max(rawProgress, 0), 100);
  const fillProgress =
    normalizedProgress > 0 && normalizedProgress < 1 ? 1 : normalizedProgress;
  const progressLabel = `${Math.max(normalizedProgress, 0).toFixed(2)}%`;
  const progressFillStyle =
    fillProgress > 0 ? { width: `${fillProgress}%` } : { width: "4px" };

  const contractCell = (
    <div className={cx("address-cell")}>
      <span className={cx("address-text")}>
        {shortenAddress(agentCard.tokenAddress)}
      </span>
      {agentCard?.tokenAddress && (
        <button
          className={cx("table-action-btn")}
          onClick={() => handleCopy(agentCard.tokenAddress, "contract")}
          aria-label="Copy contract address"
        >
          <Image
            src={
              copiedField === "contract"
                ? "/icons/circle-check.svg"
                : "/icons/copyIcon.svg"
            }
            alt={copiedField === "contract" ? "Copied" : "Copy"}
            width={16}
            height={16}
          />
        </button>
      )}
    </div>
  );

  const creatorCell = (
    <div className={cx("address-cell")}>
      <span className={cx("address-text")}>
        {shortenAddress(agentCard.creator)}
      </span>
      {agentCard?.creator && (
        <button
          className={cx("table-action-btn")}
          onClick={() => handleCopy(agentCard.creator, "creator")}
          aria-label="Copy creator address"
        >
          <Image
            src={
              copiedField === "creator"
                ? "/icons/circle-check.svg"
                : "/icons/copyIcon.svg"
            }
            alt={copiedField === "creator" ? "Copied" : "Copy"}
            width={16}
            height={16}
          />
        </button>
      )}
    </div>
  );

  const MIGRATION_THRESHOLD = "85 SOL";

  return (
    <div className={cx("token-info-section")}>
      <div className={cx("token-info-card")}>
        <div className={cx("token-info-header")}>
          <h3 className={cx("token-info-title")}>Token Info</h3>
        </div>

        <div className={cx("token-info-table")}>
          <div className={cx("table-header")}>
            <span>Market Cap</span>
            <span>Migration threshold</span>
            <span>Contract Address</span>
            <span>Creator address</span>
          </div>
          <div className={cx("table-row")}>
            {/* Market Cap */}
            <span className={cx("row-cell", "market-cap-cell")}>
              {typeof agentCard.marketCap === "number" ? (
                <span className={cx("market-cap-current")}>
                  {formatCurrency(agentCard.marketCap)}
                </span>
              ) : (
                ""
              )}
            </span>

            {/* Migration threshold (optional) */}
            <span className={cx("row-cell")}>{MIGRATION_THRESHOLD}</span>

            {/* Contract Address */}
            <span className={cx("row-cell")}>{contractCell}</span>

            {/* Creator Address */}
            <span className={cx("row-cell")}>{creatorCell}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenInfoCard;

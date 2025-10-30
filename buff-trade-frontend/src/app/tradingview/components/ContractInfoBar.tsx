"use client";

import React, { useState } from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

const ContractInfoBar: React.FC<{
  tokenMint: string;
  marketCap: number;
  website?: string;
  twitter?: string;
  onBack?: () => void;
}> = ({ tokenMint, marketCap, website, twitter, onBack }) => {
  const [isCopied, setIsCopied] = useState(false);

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

  return (
    <div className={cx("contract-info-bar")}>
      <div className={cx("contract-address")}>
        Contract Address:{" "}
        <span className={cx("address-value")}>
          {tokenMint && `${tokenMint.slice(0, 6)}...${tokenMint.slice(-4)}`}
        </span>
        <button className={cx("copy-btn")} onClick={handleCopy}>
          <img
            src={isCopied ? "/icons/greenCheck.svg" : "/icons/copyIcon.svg"}
            alt={isCopied ? "Copied" : "Copy"}
            width="16"
            height="16"
          />
        </button>
      </div>
      <div className={cx("info-right")}>
        <div className={cx("market-cap")}>
          Market Cap:{" "}
          <span className={cx("cap-value")}>${marketCap.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default ContractInfoBar;

"use client";

import React, { useState, useEffect } from "react";
import MintTokenButton from "@/components/common/button/mintTokenButton/MintTokenButton";
import TradeTokenButton from "@/components/common/button/tradeTokenButton/TradeTokenButton";
import TradeBondTokenButton from "@/components/common/button/tradeBondTokenButton/TradeBondTokenButton";
import MintTokenWithBuyButton from "@/components/common/button/mintTokenWithBuyButton/MintTokenWithBuyButton";
import MintTokenWithoutSuffixButton from "@/components/common/button/mintTokenWithoutSuffixButton/MintTokenWithoutSuffixButton";
import MintTokenWithoutSuffixAndBuyButton from "@/components/common/button/mintTokenWithoutSuffixAndBuyButton/MintTokenWithoutSuffixAndBuyButton";
import SocketCheckButton from "@/components/common/button/socketCheckButton/SocketCheckButton";
import ConnectionTestButton from "@/components/common/button/connectionTestButton/ConnectionTestButton";
import { useRouter } from "next/navigation";
import styles from "./page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface TokenData {
  fundId: string;
  name: string;
  imageUrl: string;
  generation: number;
  strategyPrompt: string;
  nav: number;
  realizedProfit: number;
  unrealizedProfit: number;
  totalPnL: number;
  survived: boolean;
  realTrading: boolean;
  createdAt: string;
  holdingsCount: number;
  txCount: number;
}

interface AgentDashboardResponse {
  totalCount: number;
  results: TokenData[];
}

const TestPage = () => {
  const router = useRouter();

  const handleCreateToken = () => {
    router.push("/create-token");
  };

  return (
    <div className={cx("test-page")}>
      <div className={cx("container")}>
        <div className={cx("test-section")}>
          <button
            className={cx("create-token-btn")}
            onClick={handleCreateToken}
          >
            Create Token
          </button>
        </div>

        {/* Network Connection Test */}
        <div className={cx("connection-test-section")}>
          <h3 className="m3-headline-small-em">Network Connection Test</h3>
          <p className="m3-body-medium">
            Test network connection without spending SOL
          </p>
          <ConnectionTestButton />
        </div>
      </div>

      {/* Dev/Test Buttons moved from main page */}
      <div
        className={cx("dev-section")}
        style={{
          display: "flex",
          gap: "8px",
          padding: "24px 0",
          flexWrap: "wrap",
        }}
      >
        <MintTokenButton />
        {/* <TradeTokenButton
          type={"graduate-buy"}
          params={{
            chainIndex: "501",
            chainId: "501",
            amount: "1000000",
            fromTokenAddress: "So11111111111111111111111111111111111111112",
            toTokenAddress: "7Uuzh9JwqF8z3u6MWpQuQJbpD1u46xPDY6PGjwfwTh4o",
            slippage: "0.01",
            userWalletAddress: "BSLEAWWy44RszzipjvVzV5ThbHnxFcqqSXSQApdspMgN",
          }}
        /> */}
        <MintTokenWithBuyButton />
        <TradeBondTokenButton
          title="Buy Bond Token"
          type="buy"
          pool="GJCgfsRJFv36kUcR9r9Gj7QySXyLNX16vyq48wicD292"
          amount="1"
        />
        <TradeBondTokenButton
          title="Sell Bond Token"
          type="sell"
          pool="GJCgfsRJFv36kUcR9r9Gj7QySXyLNX16vyq48wicD292"
          amount="19666815"
        />
        <MintTokenWithoutSuffixButton />
        <MintTokenWithoutSuffixAndBuyButton />
        {/* <SocketCheckButton /> */}
      </div>
    </div>
  );
};

export default TestPage;

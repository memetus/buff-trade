"use client";

import React, { useMemo, useEffect, useState } from "react";
import Image from "next/image";
import styles from "../page.module.scss";
import classNames from "classnames/bind";
import { useBalance } from "@/shared/hooks/useBalance";
import { fetchWalletTokens } from "@/shared/api/onchain";
import { trackBuyClick } from "@/shared/utils/ga4";

const cx = classNames.bind(styles);

type Props = {
  tradeMode: string;
  setTradeMode: (mode: string) => void;
  connected: boolean;
  publicKey: any;
  actualBalance: number | null;
  hasSufficientBalance: boolean;
  isCheckingBalance: boolean;
  inputAmount: string;
  setInputAmount: (value: string) => void;
  tokenSymbol: string;
  quoteOutAmount: string;
  minReceived: string;
  isTrading: boolean;
  isQuoteLoading: boolean;
  quoteError: string | null;
  isMainnetEnvironment?: boolean;
  onSubmit: () => Promise<void> | void;
  children?: React.ReactNode;
  // optional for showing token balance in sell tab
  tokenMint?: string;
};

const TradingPanel: React.FC<Props> = ({
  tradeMode,
  setTradeMode,
  connected,
  publicKey,
  actualBalance,
  hasSufficientBalance,
  isCheckingBalance,
  inputAmount,
  setInputAmount,
  tokenSymbol,
  quoteOutAmount,
  minReceived,
  isTrading,
  isQuoteLoading,
  quoteError,
  isMainnetEnvironment = true,
  onSubmit,
  children,
  tokenMint,
}) => {
  // State for panel expansion
  const [isExpanded, setIsExpanded] = useState(false);

  // Get real-time balance using useBalance hook
  const safePublicKey = useMemo(() => {
    if (publicKey) {
      return publicKey.toBase58();
    }
    return null;
  }, [publicKey]);

  const {
    balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance(safePublicKey);

  // Track token balance for sell mode
  const [tokenUiBalance, setTokenUiBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (tradeMode === "sell" && safePublicKey && tokenMint) {
          const tokens = await fetchWalletTokens(safePublicKey);
          const token = tokens.find((t) => t.mint === tokenMint);
          if (!cancelled) setTokenUiBalance(token?.uiAmount ?? 0);
        } else {
          if (!cancelled) setTokenUiBalance(null);
        }
      } catch {}
    };

    load();

    const handleTradeSuccess = () => {
      load();
    };

    window.addEventListener("trade-success", handleTradeSuccess);

    return () => {
      cancelled = true;
      window.removeEventListener("trade-success", handleTradeSuccess);
    };
    // refresh when switching tabs or wallet/mint changes
  }, [tradeMode, safePublicKey, tokenMint]);

  // Use real-time balance if available, otherwise fall back to actualBalance prop
  const currentBalance = balance !== 0 ? balance : actualBalance;

  return (
    <div className={cx("trading-panel", { expanded: isExpanded })}>
      {!isExpanded ? (
        // Collapsed state - show Buy/Sell toggle like the spec
        <div className={cx("collapsed-panel")}>
          <div className={cx("collapsed-toggle")}>
            <button
              className={cx("collapsed-tab", "buy")}
              onClick={() => {
                setTradeMode("buy");
                setIsExpanded(true);
              }}
            >
              Buy
            </button>
            <button
              className={cx("collapsed-tab", "sell")}
              onClick={() => {
                setTradeMode("sell");
                setIsExpanded(true);
              }}
            >
              Sell
            </button>
          </div>
          <button
            className={cx("collapsed-expander")}
            onClick={() => setIsExpanded(true)}
            aria-label="Expand trading panel"
          >
            <Image
              src="/icons/downside.svg"
              alt="Expand"
              width={16}
              height={16}
            />
          </button>
        </div>
      ) : (
        // Expanded state - show full trading interface
        <div className={cx("trade-section", tradeMode)}>
          <button
            className={cx("close-btn")}
            onClick={() => setIsExpanded(false)}
          >
            ×
          </button>
          <div className={cx("trade-tabs")}>
            <button
              className={cx("trade-tab", "buy", {
                active: tradeMode === "buy",
              })}
              onClick={() => setTradeMode("buy")}
            >
              Buy
            </button>
            <button
              className={cx("trade-tab", "sell", {
                active: tradeMode === "sell",
              })}
              onClick={() => setTradeMode("sell")}
            >
              Sell
            </button>
          </div>

          <div className={cx("slippage-info")}>
            <span className={cx("slippage-text")}>Slippage 2.5%</span>
            <span className={cx("balance-text")}>
              {connected && publicKey
                ? tradeMode === "sell" && tokenUiBalance !== null
                  ? `Bal: ${tokenUiBalance.toLocaleString()} ${tokenSymbol}`
                  : balanceLoading
                  ? "Loading..."
                  : currentBalance !== null && currentBalance !== undefined
                  ? `Bal: ${currentBalance.toFixed(2)} SOL`
                  : "Bal: -.------ SOL"
                : "Wallet not connected"}
            </span>
          </div>

          <div className={cx("input-group")}>
            <label className={cx("input-label")}>Amount</label>
            <div className={cx("input-wrapper")}>
              <input
                type="number"
                className={cx("amount-input")}
                placeholder="Amount"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
              />
              <span className={cx("currency")}>
                {tradeMode === "buy" ? "SOL" : tokenSymbol}
              </span>
            </div>
            <div className={cx("quick-amounts")}>
              {tradeMode === "buy" ? (
                <>
                  <button
                    className={cx("quick-btn")}
                    onClick={() => setInputAmount("0.1")}
                  >
                    0.1
                  </button>
                  <button
                    className={cx("quick-btn")}
                    onClick={() => setInputAmount("0.5")}
                  >
                    0.5
                  </button>
                  <button
                    className={cx("quick-btn")}
                    onClick={() => setInputAmount("1")}
                  >
                    1
                  </button>
                  <button
                    className={cx("quick-btn")}
                    onClick={() =>
                      setInputAmount(currentBalance?.toFixed(2) || "0")
                    }
                  >
                    Max
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={cx("quick-btn")}
                    onClick={() => setInputAmount("1000000")}
                  >
                    1M
                  </button>
                  <button
                    className={cx("quick-btn")}
                    onClick={() => setInputAmount("10000000")}
                  >
                    10M
                  </button>
                  <button
                    className={cx("quick-btn")}
                    onClick={() => setInputAmount("50000000")}
                  >
                    50M
                  </button>
                  <button
                    className={cx("quick-btn")}
                    onClick={() =>
                      setInputAmount(tokenUiBalance?.toString() || "0")
                    }
                  >
                    Max
                  </button>
                </>
              )}
            </div>
          </div>

          {!connected && (
            <div className={cx("insufficient-balance")}>
              Please connect your wallet
            </div>
          )}
          {connected && !hasSufficientBalance && !isCheckingBalance && (
            <div className={cx("insufficient-balance")}>
              Insufficient balance
            </div>
          )}
          {connected && isCheckingBalance && (
            <div className={cx("insufficient-balance")}>
              Checking balance...
            </div>
          )}

          <div className={cx("estimated-section")}>
            <div className={cx("estimated-info")}>
              {quoteError ? (
                <div className={cx("quote-error")}>
                  <span className={cx("error-icon")}>⚠️</span>
                  <span className={cx("error-message")}>{quoteError}</span>
                </div>
              ) : (
                <>
                  <div className={cx("receive-amount")}>
                    <span className={cx("label")}>You receive:</span>
                    <span className={cx("amount")}>
                      {isQuoteLoading ? (
                        <span className={cx("loading")}>Loading...</span>
                      ) : quoteOutAmount ? (
                        <>
                          {parseFloat(quoteOutAmount).toLocaleString()}{" "}
                          <span className={cx("token-symbol")}>
                            {tradeMode === "buy" ? tokenSymbol : "SOL"}
                          </span>
                        </>
                      ) : (
                        <span className={cx("placeholder")}></span>
                      )}
                    </span>
                    <span className={cx("min-label")}>
                      {" "}
                      (Minimum received:{" "}
                      {isQuoteLoading ? (
                        <span className={cx("loading")}>Loading...</span>
                      ) : minReceived ? (
                        <>
                          {parseFloat(minReceived).toLocaleString()}{" "}
                          <span className={cx("token-symbol")}>
                            {tradeMode === "buy" ? tokenSymbol : "SOL"}
                          </span>
                        </>
                      ) : (
                        <span className={cx("placeholder")}></span>
                      )}
                      )
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            className={cx("action-btn", tradeMode, {
              disabled:
                !connected ||
                !hasSufficientBalance ||
                isCheckingBalance ||
                isTrading,
            })}
            onClick={() => {
              // Buy 버튼 클릭 이벤트 추적
              if (tradeMode === "buy") {
                const volume = parseFloat(inputAmount) || 0;
                trackBuyClick(volume);
              }
              onSubmit();
            }}
            disabled={
              !connected ||
              !hasSufficientBalance ||
              isCheckingBalance ||
              isTrading
            }
          >
            {!connected
              ? "Connect Wallet"
              : isCheckingBalance
              ? "Checking..."
              : !hasSufficientBalance
              ? "Insufficient Balance"
              : isTrading
              ? `${tradeMode === "buy" ? "Buying" : "Selling"}...`
              : tradeMode === "buy"
              ? `Buy ${tokenSymbol}`
              : `Sell ${tokenSymbol}`}
          </button>
        </div>
      )}

      {children}
    </div>
  );
};

export default TradingPanel;

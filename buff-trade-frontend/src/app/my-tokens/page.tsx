"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWalletConnect } from "../../shared/hooks/useWalletConnect";
import styles from "./page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface TokenInfo {
  fundId: string;
  name: string;
  ticker: string;
  creator: string;
  tokenAddress: string;
  marketCap: number;
  isMigration: boolean;
  website: string;
  twitter: string;
  telegram: string;
  strategy: string;
  poolAddress?: string;
  createdAt: string;
}

const MyTokensPage = () => {
  const router = useRouter();
  const { publicKey, connected } = useWalletConnect();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's tokens from localStorage (temporary solution)
  useEffect(() => {
    const loadTokens = () => {
      try {
        const storedTokens = localStorage.getItem("homo_tokens");
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens);
          setTokens(parsedTokens);
        }
      } catch (error) {
        setError("Failed to load tokens");
      }
    };

    loadTokens();
  }, []);

  const handleTokenClick = (token: any) => {
    const params = new URLSearchParams({
      fundId: token.fundId,
      from: "my-tokens",
    });

    // poolAddress가 있으면 URL에 추가
    if (token.poolAddress) {
      params.set("poolAddress", token.poolAddress);
    }

    router.push(`/tradingview?${params.toString()}`);
  };

  const handleCreateNewToken = () => {
    router.push("/create-token");
  };

  if (!connected) {
    return (
      <div className={cx("container")}>
        <div className={cx("not-connected")}>
          <h2>Connect Your Wallet</h2>
          <p>Please connect your wallet to view your tokens.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("container")}>
      <div className={cx("header")}>
        <h1>My Tokens</h1>
        <button className={cx("create-btn")} onClick={handleCreateNewToken}>
          Create New Token
        </button>
      </div>

      {loading && (
        <div className={cx("loading")}>
          <p>Loading your tokens...</p>
        </div>
      )}

      {error && (
        <div className={cx("error")}>
          <p>{error}</p>
        </div>
      )}

      {tokens.length === 0 && !loading && !error && (
        <div className={cx("empty-state")}>
          <h3>No tokens found</h3>
          <p>You haven&apos;t created any tokens yet.</p>
          <button className={cx("create-btn")} onClick={handleCreateNewToken}>
            Create Your First Token
          </button>
        </div>
      )}

      <div className={cx("tokens-grid")}>
        {tokens.map((token) => (
          <div
            key={token.fundId}
            className={cx("token-card")}
            onClick={() => handleTokenClick(token)}
          >
            <div className={cx("token-header")}>
              <div className={cx("token-info")}>
                <h3>{token.name}</h3>
                <span className={cx("ticker")}>{token.ticker}</span>
              </div>
              <div
                className={cx("migration-status", {
                  migrated: token.isMigration,
                })}
              >
                {token.isMigration ? "Migrated" : "Pre-Migration"}
              </div>
            </div>

            <div className={cx("token-details")}>
              <div className={cx("detail-row")}>
                <span className={cx("label")}>Market Cap:</span>
                <span className={cx("value")}>
                  ${token.marketCap.toLocaleString()}
                </span>
              </div>
              <div className={cx("detail-row")}>
                <span className={cx("label")}>Token Address:</span>
                <span className={cx("value", "address")}>
                  {token.tokenAddress.slice(0, 8)}...
                  {token.tokenAddress.slice(-8)}
                </span>
              </div>
              <div className={cx("detail-row")}>
                <span className={cx("label")}>Created:</span>
                <span className={cx("value")}>
                  {new Date(token.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {token.strategy && (
              <div className={cx("strategy")}>
                <span className={cx("label")}>Strategy:</span>
                <p>{token.strategy}</p>
              </div>
            )}

            <div className={cx("social-links")}>
              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx("social-link")}
                  onClick={(e) => e.stopPropagation()}
                >
                  🌐 Website
                </a>
              )}
              {token.twitter && (
                <a
                  href={`https://twitter.com/${token.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx("social-link")}
                  onClick={(e) => e.stopPropagation()}
                >
                  🐦 Twitter
                </a>
              )}
              {token.telegram && (
                <a
                  href={`https://t.me/${token.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx("social-link")}
                  onClick={(e) => e.stopPropagation()}
                >
                  📱 Telegram
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyTokensPage;

"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./MyCreations.module.scss";
import classNames from "classnames/bind";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProfileTokens } from "@/shared/hooks/useProfile";
import type { TokenInfoItem } from "@/shared/types/data/profile";
import { useQueryClient } from "@tanstack/react-query";
import { useBondingCurve } from "@/shared/hooks/useBondingCurve";
import type { PoolsFeesResponse } from "@/shared/types/data/meteora";
import { getNetworkConfig } from "@/shared/utils/networkConfig";

const cx = classNames.bind(styles);

type Row = {
  id: string;
  name?: string;
  ticker?: string;
  tokenAddress?: string;
  totalRewards?: number;
  unclaimedRewards?: number;
  marketCap?: number;
  agentPnL?: number;
  imageUrl?: string;
  poolAddress?: string;
};

const MyCreations = () => {
  const [walletPreview, setWalletPreview] = useState<string>("");
  const [walletAddressFull, setWalletAddressFull] = useState<string>("");
  const { publicKey } = useWallet();
  const { data: profileData, isLoading, error } = useProfileTokens();
  const queryClient = useQueryClient();
  const { claimCreatorTradingFee } = useBondingCurve();
  const { network: activeNetwork } = getNetworkConfig();

  const tokens = useMemo(
    () => (profileData?.tokenInfoList || []) as TokenInfoItem[],
    [profileData?.tokenInfoList]
  );

  useEffect(() => {
    const pkStr = publicKey?.toBase58?.();
    if (pkStr) {
      setWalletPreview(`${pkStr.slice(0, 6)}...${pkStr.slice(-4)}`);
      setWalletAddressFull(pkStr);
      return;
    }
    const pk =
      typeof window !== "undefined" ? localStorage.getItem("publicKey") : null;
    if (pk) {
      setWalletPreview(`${pk.slice(0, 6)}...${pk.slice(-4)}`);
      setWalletAddressFull(pk);
    } else {
      setWalletPreview("—");
      setWalletAddressFull("");
    }
  }, [publicKey]);

  const rows: Row[] = useMemo(() => {
    return tokens.map((t, i) => {
      const poolAddressCandidate =
        t.poolAddress || (t as any)?.pool_address || (t as any)?.pool;

      return {
        id: `${i}-${t.tokenAddress}`,
        name: t.name,
        ticker: t.ticker,
        tokenAddress: t.tokenAddress,
        totalRewards: t.totalRewards,
        unclaimedRewards: t.unclaimedRewards,
        marketCap: (t as any)?.marketCap,
        agentPnL: (t as any)?.agentPnL,
        imageUrl: (t as any)?.imageUrl,
        poolAddress: poolAddressCandidate,
      };
    });
  }, [tokens]);

  const totals = useMemo(() => {
    const total = tokens.reduce((a, t) => a + (t.totalRewards || 0), 0);
    const unclaimed = tokens.reduce((a, t) => a + (t.unclaimedRewards || 0), 0);
    return {
      total: total
        ? `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        : "",
      unclaimed: unclaimed
        ? `$${unclaimed.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`
        : "",
    };
  }, [tokens]);

  const [copied, setCopied] = useState<boolean>(false);
  const [claimingPool, setClaimingPool] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [poolsFees, setPoolsFees] = useState<PoolsFeesResponse | null>(null);

  useEffect(() => {
    if (!claimStatus) return;
    const timer = setTimeout(() => setClaimStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [claimStatus]);

  const handleCopyAddress = async (address?: string) => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const fetchCreatorPoolsFees = useCallback(
    async (authToken: string): Promise<PoolsFeesResponse> => {
      if (!walletAddressFull) {
        throw new Error("Wallet address is not available.");
      }

      const clusterParam = activeNetwork
        ? `&cluster=${encodeURIComponent(activeNetwork)}`
        : "";

      const response = await fetch(
        `/api/creator/pools-fees?creator=${encodeURIComponent(
          walletAddressFull
        )}${clusterParam}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || "Failed to fetch creator pool fees. Please try again."
        );
      }

      const data: PoolsFeesResponse = await response.json();
      setPoolsFees(data);
      return data;
    },
    [walletAddressFull, activeNetwork]
  );

  const handleClaim = async (creation: Row) => {
    if (!creation.poolAddress) {
      setClaimStatus({
        type: "error",
        message: "No pool address available for this token.",
      });
      return;
    }

    if (typeof window === "undefined") return;

    if (!walletAddressFull) {
      setClaimStatus({
        type: "error",
        message: "Please connect your wallet to claim rewards.",
      });
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setClaimStatus({
        type: "error",
        message: "Please sign in again to claim rewards.",
      });
      return;
    }

    try {
      setClaimingPool(creation.poolAddress);
      setClaimStatus(null);
      let poolsFeesSnapshot = poolsFees;

      if (!poolsFeesSnapshot || poolsFeesSnapshot.length === 0) {
        poolsFeesSnapshot = await fetchCreatorPoolsFees(token);
      }

      if (!poolsFeesSnapshot || poolsFeesSnapshot.length === 0) {
        throw new Error("No claimable fee data available.");
      }

      const result = await claimCreatorTradingFee(
        creation.poolAddress,
        poolsFeesSnapshot
      );

      if (!result?.success) {
        throw new Error(result?.message || "Failed to claim rewards.");
      }

      const successMessage = result.signature
        ? `Claim successful! Tx: ${result.signature.slice(0, 8)}...`
        : result.message || "Successfully claimed rewards.";

      setClaimStatus({ type: "success", message: successMessage });

      try {
        await fetchCreatorPoolsFees(token);
      } catch (refreshError) {
        console.warn("Failed to refresh pools fees after claim:", refreshError);
      }

      await queryClient.invalidateQueries({ queryKey: ["profile", "tokens"] });
    } catch (error) {
      console.error("Claim rewards failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to claim rewards.";
      setClaimStatus({ type: "error", message });
    } finally {
      setClaimingPool(null);
    }
  };

  const displayWallet =
    walletPreview && walletPreview.trim().length > 0 ? walletPreview : "—";

  if (isLoading) {
    return (
      <div className={cx("my-creations")}>
        <div className={cx("container")}>
          <div className={cx("header")}>
            <h1 className={cx("title")}>My creations</h1>
            <div className={cx("skeleton-header")}>
              <div className={cx("skeleton-box", "skeleton-rewards")} />
              <div className={cx("skeleton-box", "skeleton-wallet")} />
            </div>
          </div>
          <div className={cx("creations-list")}>
            <div className={cx("skeleton-box")} style={{ height: 144 }} />
            <div className={cx("skeleton-box")} style={{ height: 144 }} />
            <div className={cx("skeleton-box")} style={{ height: 144 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx("my-creations")}>
        <div className={cx("container")}>
          <div className={cx("header")}>
            <h1 className={cx("title")}>My creations</h1>
          </div>
          <div className={cx("error-state")}>
            <p>Failed to load tokens. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("my-creations")}>
      <div className={cx("container")}>
        <div className={cx("header")}>
          <h1 className={cx("title")}>My creations</h1>
          <div className={cx("header-stats")}>
            <div className={cx("rewards-info")}>
              <span className={cx("stat-label")}>Total Rewards</span>
              <span className={cx("stat-value")}>{totals.total}</span>
              <span className={cx("stat-label")}>Unclaimed Rewards</span>
              <span className={cx("stat-value")}>{totals.unclaimed}</span>
            </div>
            <div className={cx("wallet-info")}>
              <span className={cx("wallet-address")}>{displayWallet}</span>
              <button
                className={cx("copy-btn")}
                onClick={() =>
                  handleCopyAddress(
                    walletAddressFull || publicKey?.toBase58?.() || ""
                  )
                }
              >
                <Image
                  src={
                    copied ? "/icons/circle-check.svg" : "/icons/copyIcon.svg"
                  }
                  alt={copied ? "Copied" : "Copy"}
                  width={16}
                  height={16}
                />
              </button>
            </div>
          </div>
        </div>
        {claimStatus && (
          <div className={cx("claim-status", claimStatus.type)}>
            {claimStatus.message}
          </div>
        )}
        {/* Creations List */}
        <div className={cx("creations-list")}>
          {rows.length === 0 ? (
            <div className={cx("empty-state")}>
              <p>No tokens created yet.</p>
            </div>
          ) : (
            rows.map((creation) => (
              <div key={creation.id} className={cx("creation-card")}>
                <div className={cx("card-header")}>
                  <div className={cx("creation-info")}>
                    <div className={cx("avatar")}>
                      {creation.imageUrl ? (
                        <Image
                          src={creation.imageUrl}
                          alt={creation.name || "Token"}
                          width={48}
                          height={48}
                          className={cx("avatar-image")}
                        />
                      ) : (
                        <div className={cx("avatar-placeholder")}></div>
                      )}
                    </div>
                    <div className={cx("creation-details")}>
                      <h3 className={cx("creation-name")}>
                        {creation.name || ""}
                        <span className={cx("creation-ticker")}>
                          {creation.ticker ? ` $${creation.ticker}` : ""}
                        </span>
                      </h3>
                    </div>
                  </div>
                  <button
                    className={cx("claim-btn", {
                      active: (creation.unclaimedRewards || 0) > 0,
                      loading:
                        claimingPool !== null &&
                        claimingPool === creation.poolAddress,
                    })}
                    onClick={() => handleClaim(creation)}
                    disabled={
                      (creation.unclaimedRewards || 0) <= 0 ||
                      claimingPool === creation.poolAddress
                    }
                  >
                    {claimingPool === creation.poolAddress
                      ? "Claiming..."
                      : "Claim"}
                  </button>
                </div>

                <div className={cx("data-table")}>
                  <div className={cx("table-header")}>
                    <span>Ticker</span>
                    <span>CA</span>
                    <span>Market Cap</span>
                    <span>Agent PnL</span>
                    <span>Total Rewards</span>
                    <span>Unclaimed Rewards</span>
                  </div>
                  <div className={cx("table-row")}>
                    <span className={cx("ticker")}>
                      {creation.ticker || ""}
                    </span>
                    <span className={cx("contract-address")}>
                      {creation.tokenAddress
                        ? `${creation.tokenAddress.slice(
                            0,
                            4
                          )}...${creation.tokenAddress.slice(-4)}`
                        : ""}
                      <button
                        className={cx("copy-btn", "small")}
                        onClick={() => handleCopyAddress(creation.tokenAddress)}
                      >
                        <Image
                          src={
                            copied
                              ? "/icons/circle-check.svg"
                              : "/icons/copyIcon.svg"
                          }
                          alt="Copy"
                          width={12}
                          height={12}
                        />
                      </button>
                    </span>
                    <span className={cx("market-cap")}>
                      {creation.marketCap
                        ? `$${creation.marketCap.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}`
                        : ""}
                    </span>
                    <span className={cx("agent-pnl")}>
                      {creation.agentPnL !== undefined ? (
                        <span
                          className={cx(
                            "agent-pnl-value",
                            creation.agentPnL >= 0 ? "positive" : "negative"
                          )}
                        >
                          {creation.agentPnL >= 0 ? "+" : ""}
                          {creation.agentPnL.toFixed(2)}%
                        </span>
                      ) : (
                        ""
                      )}
                    </span>
                    <span className={cx("total-rewards")}>
                      {typeof creation.totalRewards === "number"
                        ? `$${creation.totalRewards.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}`
                        : ""}
                    </span>
                    <span className={cx("unclaimed-rewards")}>
                      {typeof creation.unclaimedRewards === "number"
                        ? `$${creation.unclaimedRewards.toLocaleString(
                            undefined,
                            { maximumFractionDigits: 2 }
                          )}`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCreations;

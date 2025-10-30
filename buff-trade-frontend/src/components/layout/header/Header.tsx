"use client";
import React from "react";
import styles from "@/components/layout/header/Header.module.scss";
import classNames from "classnames/bind";
import dynamic from "next/dynamic";
import HeaderNav from "@/components/common/nav/headerNav/HeaderNav";
import CombinedLogo from "@/components/common/logo/combinedLogo/CombinedLogo";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRewards } from "@/shared/hooks/useProfile";
import Image from "next/image";

const cx = classNames.bind(styles);

const WalletConnectButton = dynamic(
  () =>
    import(
      "@/components/common/button/walletConnectButton/WalletConnectButton"
    ),
  { ssr: false }
);

const Header = () => {
  const { publicKey } = useWallet();
  const { data: rewards, isLoading, error } = useRewards();

  return (
    <header className={cx("header")}>
      <div className={cx("left-section")}>
        <CombinedLogo />
      </div>
      <div className={cx("right-section")}>
        <HeaderNav />
        {publicKey && (
          <div className={cx("creator-rewards")}>
            <Image
              src="/icons/creatorRewards.svg"
              alt="Creator Rewards"
              className={cx("rewards-icon")}
              width={16}
              height={16}
            />
            <span className={cx("rewards-text")}>
              {isLoading ? (
                <div className={cx("loading-spinner")}></div>
              ) : error ? (
                <div>
                  Error loading rewards
                  {process.env.NODE_ENV === "development" && (
                    <div style={{ fontSize: "10px", color: "#ff6b6b" }}>
                      {error.message}
                    </div>
                  )}
                </div>
              ) : (
                `Rewards: $${(rewards || 0).toFixed(2)}`
              )}
            </span>
          </div>
        )}
        <WalletConnectButton />
      </div>
    </header>
  );
};

export default Header;

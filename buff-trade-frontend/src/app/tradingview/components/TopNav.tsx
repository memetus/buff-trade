"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";
import dynamic from "next/dynamic";

const cx = classNames.bind(styles);

const WalletConnectButton = dynamic(
  () =>
    import(
      "@/components/common/button/walletConnectButton/WalletConnectButton"
    ),
  { ssr: false }
);

const TopNav: React.FC = () => {
  return (
    <div className={cx("top-nav")}>
      <div className={cx("nav-left")}>
        <h1 className={cx("logo")}>Homo</h1>
        <div className={cx("nav-links")}>
          <a href="#" className={cx("nav-link")}>
            Trading
          </a>
          <a href="#" className={cx("nav-link")}>
            Portfolio
          </a>
          <a href="#" className={cx("nav-link")}>
            Watchlist
          </a>
        </div>
      </div>
      <div className={cx("nav-right")}>
        <WalletConnectButton />
      </div>
    </div>
  );
};

export default TopNav;

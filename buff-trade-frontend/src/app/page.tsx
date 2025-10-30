"use client";
import React, { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import WalletConnectModal from "@/components/common/modal/walletConnectModal/WalletConnectModal";
import SkeletonCard from "@/components/common/skeleton/SkeletonCard";
import styles from "./page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

const LandingPage = () => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [hasTriggeredConnect, setHasTriggeredConnect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const redirectAfterConnect = useCallback(() => {
    router.push("/invite");
  }, [router]);

  const handleConnect = () => {
    if (connected && publicKey) {
      // 이미 연결되어 있으면 바로 리다이렉트
      redirectAfterConnect();
      return;
    }

    // 모달 열기
    setShowWalletModal(true);
    setHasTriggeredConnect(true);
  };

  const handleCloseModal = useCallback(() => {
    setShowWalletModal(false);
    // 모달이 닫힐 때 지갑이 연결되어 있다면 리다이렉트
    if (connected && publicKey) {
      setTimeout(() => {
        redirectAfterConnect();
      }, 100);
    }
  }, [connected, publicKey, redirectAfterConnect]);

  // 지갑 연결 상태 변화 감지 - 더 정확한 감지
  useEffect(() => {
    if (connected && publicKey && hasTriggeredConnect) {
      setShowWalletModal(false);
      setHasTriggeredConnect(false);
      // 모달이 완전히 닫힌 후 리다이렉트
      setTimeout(() => {
        redirectAfterConnect();
      }, 500);
    }
  }, [connected, publicKey, hasTriggeredConnect, redirectAfterConnect]);

  if (isLoading) {
    return (
      <div className={cx("landing-root")}>
        <div className={cx("landing-container")}>
          <div className={cx("trending-section")}>
            <div className={cx("trending-header")}>
              <h2 className={cx("trending-title")}>
                <span>Trending</span>
                <img
                  src="/icons/TrendFire.svg"
                  alt="Fire"
                  width="16"
                  height="16"
                />
              </h2>
              <div className={cx("trending-filters")}>
                <img
                  src="/icons/search.svg"
                  alt="Search"
                  width="16"
                  height="16"
                />
                <button className={cx("filter-btn", "active")}>
                  Graduated
                </button>
                <button className={cx("filter-btn")}>Top PnL</button>
                <button className={cx("filter-btn")}>24h V</button>
                <button className={cx("filter-btn")}>Top MC</button>
              </div>
            </div>
            <div className={cx("skeleton-cards")}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cx("landing-root")}>
        <div className={cx("landing-container")}>
          <div className={cx("landing-card")}>
            <div className={cx("logo-section")}>
              <div className={cx("logo")}>
                <img
                  src="/icons/logo_pc_hover.svg"
                  alt="Buff Logo"
                  width="215"
                  height="52"
                />
              </div>
            </div>
            <p className={cx("slogan")}>
              buff your bag better with trading agents
            </p>
            <button className={cx("connect-button")} onClick={handleConnect}>
              Connect to Start
            </button>
          </div>
        </div>
      </div>

      {/* 지갑 연결 모달 직접 렌더링 */}
      {showWalletModal && <WalletConnectModal onClose={handleCloseModal} />}
    </>
  );
};

export default LandingPage;

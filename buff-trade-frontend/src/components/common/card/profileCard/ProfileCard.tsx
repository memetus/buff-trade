"use client";
import React, { useMemo } from "react";
import styles from "@/components/common/card/profileCard/ProfileCard.module.scss";
import classNames from "classnames/bind";
import { useBalance } from "@/shared/hooks/useBalance";
import { useWalletConnect } from "@/shared/hooks/useWalletConnect";
import BaseSpinner from "@/components/base/baseSpinner/BaseSpinner";
import DownsideIcon from "@/public/icons/downside.svg";
import UpsideIcon from "@/public/icons/upside.svg";

const cx = classNames.bind(styles);

interface ProfileCardProps {
  isOpen?: boolean;
}

const ProfileCard = ({ isOpen = false }: ProfileCardProps) => {
  const { publicKey, isLoading } = useWalletConnect();
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
  const shortAddress = useMemo(() => {
    if (!safePublicKey) return "";
    if (safePublicKey.length <= 10) return safePublicKey;
    // 더 간결한 주소 표시 (4자리 + ... + 4자리)
    return `${safePublicKey.slice(0, 4)}...${safePublicKey.slice(-4)}`;
  }, [safePublicKey]);

  const safeBalance = useMemo(() => {
    if (balanceLoading) {
      return null;
    }
    if (balanceError) {
      return "Error";
    }
    if (balance === null || balance === undefined) {
      return null;
    }
    // 소수점 2자리까지 표시하되, 정수인 경우 .00 생략
    const formatted = balance.toFixed(2);
    return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
  }, [balance, balanceLoading, balanceError]);

  if (isLoading) {
    return (
      <div className={cx("card")}>
        <BaseSpinner size={18} color="light" type="base" />
      </div>
    );
  }

  return (
    <div className={cx("card")}>
      <div className={cx("profile-text-wrapper")}>
        <span className={cx("profile-name-text")}>{shortAddress}</span>
        <span className={cx("profile-balance-text")}>
          {safeBalance === null
            ? balanceLoading
              ? "Loading..."
              : "-"
            : `${safeBalance} SOL`}
        </span>
      </div>
      <div className={cx("dropdown-arrow")}>
        {isOpen ? (
          <UpsideIcon viewBox="0 0 24 24" className={cx("arrow-icon")} />
        ) : (
          <DownsideIcon viewBox="0 0 24 24" className={cx("arrow-icon")} />
        )}
      </div>
    </div>
  );
};

export default ProfileCard;

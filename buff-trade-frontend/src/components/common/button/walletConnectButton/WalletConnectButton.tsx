"use client";
import React, { useCallback } from "react";
import styles from "@/components/common/button/walletConnectButton/WalletConnectButton.module.scss";
import classNames from "classnames/bind";
import { useDispatch } from "react-redux";
import { APPEND_MODAL } from "@/contexts/global/slice/modalSlice";
import ProfileDropdown from "../../dropdown/profileDropdown/ProfileDropdown";
import { useWalletConnect } from "@/shared/hooks/useWalletConnect";
import { useWallet } from "@solana/wallet-adapter-react";

const cx = classNames.bind(styles);

const WalletConnectButton = () => {
  const dispatch = useDispatch();
  const { publicKey } = useWallet();
  const { isLoading, setIsLoading } = useWalletConnect();

  const handleOpenWalletConnectModal = useCallback(() => {
    // Do not set global loading here; just open the modal
    dispatch(APPEND_MODAL({ key: "wallet-modal", params: {} }));
  }, [dispatch]);

  if (publicKey) {
    return <ProfileDropdown />;
  }

  return (
    <button
      aria-label="wallet-connect-button"
      className={cx("button")}
      onClick={handleOpenWalletConnectModal}
    >
      <span className={cx("button-title")}>Connect</span>
    </button>
  );
};

export default WalletConnectButton;

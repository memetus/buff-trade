import React, { useCallback, useRef, useState } from "react";
import styles from "@/components/common/dropdown/profileDropdown/ProfileDropdown.module.scss";
import classNames from "classnames/bind";
import ProfileCard from "../../card/profileCard/ProfileCard";
import Link from "next/link";
import ProfileIcon from "@/public/icons/user.svg";
import CopyIcon from "@/public/icons/copy.svg";
import GreenCheckIcon from "@/public/icons/greenCheck.svg";
import LogoutIcon from "@/public/icons/logout.svg";
import RewardsIcon from "@/public/icons/creatorRewards.svg";
import DownsideIcon from "@/public/icons/downside.svg";
import UpsideIcon from "@/public/icons/upside.svg";
import { useOnClick } from "@/shared/hooks/useOnClick";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletConnect } from "@/shared/hooks/useWalletConnect";

const cx = classNames.bind(styles);

const ProfileDropdown = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const { disconnect, wallet, publicKey } = useWallet();
  const { handleDisconnect: clearAllCache } = useWalletConnect();
  const avatarUrl =
    typeof window !== "undefined"
      ? localStorage.getItem("wallet_avatar")
      : null;
  const displayName =
    typeof window !== "undefined" ? localStorage.getItem("wallet_name") : null;

  useOnClick({
    ref,
    handler: () => setIsOpen(false),
    mouseEvent: "click",
  });

  const handleDisconnect = useCallback(() => {
    // 완전한 캐시 삭제와 함께 연결 해제
    clearAllCache();
    setIsOpen(false);
  }, [clearAllCache]);

  const handleCopyAddress = useCallback(async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey.toString());
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy address:", err);
      }
    }
  }, [publicKey]);

  return (
    <div className={cx("dropdown")} ref={ref}>
      <button
        aria-label="profile-dropdown"
        className={cx("dropdown-header")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ProfileCard isOpen={isOpen} />
      </button>
      {isOpen && (
        <div className={cx("dropdown-list")}>
          <Link href={"/my"} className={cx("dropdown-list-item")}>
            <ProfileIcon
              viewBox="0 0 24 24"
              className={cx("item-icon", { stroke: true })}
            />
            <span className={cx("item-text")}>My creations</span>
          </Link>
          <div className={cx("dropdown-list-item", "rewards-item")}>
            <RewardsIcon viewBox="0 0 24 24" className={cx("item-icon")} />
            <span className={cx("item-text")}>Rewards: $0.01</span>
          </div>
          <button
            className={cx("dropdown-list-item")}
            aria-label="copy-address"
            onClick={handleCopyAddress}
          >
            {isCopied ? (
              <GreenCheckIcon
                className={cx("item-icon")}
                width={18}
                height={18}
                aria-hidden="true"
              />
            ) : (
              <CopyIcon
                viewBox="0 0 24 24"
                className={cx("item-icon", { stroke: true })}
              />
            )}
            <span className={cx("item-text")}>
              {isCopied ? "Copied!" : "Copy address"}
            </span>
          </button>
          <button
            className={cx("dropdown-list-item")}
            aria-label="log-out"
            onClick={handleDisconnect}
          >
            <LogoutIcon
              viewBox="0 0 24 24"
              className={cx("item-icon", { stroke: true, logout: true })}
            />
            <span className={cx("item-text", "logout")}>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;

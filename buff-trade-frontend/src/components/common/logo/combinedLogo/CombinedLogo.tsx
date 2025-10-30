"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "@/components/common/logo/combinedLogo/CombinedLogo.module.scss";
import classNames from "classnames/bind";
import Image from "next/image";

const cx = classNames.bind(styles);

const CombinedLogo = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsMenuOpen(false);
      setHoveredItem(null);
    };
  }, []);

  const handleMouseEnter = () => {
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    setIsMenuOpen(false);
    setHoveredItem(null);
  };

  return (
    <div
      className={cx("logo-container")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href="/main"
        className={cx("base-logo")}
        aria-label="Go to main page"
      >
        <div className={cx("icon")}>
          <Image
            src="/icons/bufflogo.svg"
            alt="buff.trade logo"
            width={32}
            height={32}
            priority
            className={cx("logo-image", "mobile-logo")}
          />
          <Image
            src="/icons/logo_pc.svg"
            alt="buff.trade logo"
            width={132}
            height={32}
            priority
            className={cx("logo-image", "pc-logo")}
          />
          <Image
            src="/icons/logo_pc_hover.svg"
            alt="buff.trade logo"
            width={132}
            height={32}
            priority
            className={cx("logo-image", "pc-logo-hover")}
          />
        </div>
      </Link>

      {isMenuOpen && (
        <div className={cx("dropdown-menu")}>
          <Link
            href="https://t.me/homo_memetus"
            target="_blank"
            rel="noopener noreferrer"
            className={cx("menu-item")}
            onMouseEnter={() => setHoveredItem("telegram")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span>Telegram</span>
            <Image
              src={
                hoveredItem === "telegram"
                  ? "/icons/externalLinkHover.svg"
                  : "/icons/externalLink.svg"
              }
              alt="External link"
              width={16}
              height={16}
              className={cx("external-icon")}
            />
          </Link>
          <Link
            href="https://homo-memetus.gitbook.io/buffdottrade/"
            target="_blank"
            rel="noopener noreferrer"
            className={cx("menu-item")}
            onMouseEnter={() => setHoveredItem("docs")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span>Docs</span>
            <Image
              src={
                hoveredItem === "docs"
                  ? "/icons/externalLinkHover.svg"
                  : "/icons/externalLink.svg"
              }
              alt="External link"
              width={16}
              height={16}
              className={cx("external-icon")}
            />
          </Link>
          <Link
            href="https://x.com/buffdottrade"
            target="_blank"
            rel="noopener noreferrer"
            className={cx("menu-item")}
            onMouseEnter={() => setHoveredItem("twitter")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span>Twitter</span>
            <Image
              src={
                hoveredItem === "twitter"
                  ? "/icons/externalLinkHover.svg"
                  : "/icons/externalLink.svg"
              }
              alt="External link"
              width={16}
              height={16}
              className={cx("external-icon")}
            />
          </Link>
          <Link
            href="https://dexscreener.com/solana/7uuzh9jwqf8z3u6mwpquqjbpd1u46xpdy6pgjwfwth4o"
            target="_blank"
            rel="noopener noreferrer"
            className={cx("menu-item")}
            onMouseEnter={() => setHoveredItem("dexscreener")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span>DexScreener</span>
            <Image
              src={
                hoveredItem === "dexscreener"
                  ? "/icons/externalLinkHover.svg"
                  : "/icons/externalLink.svg"
              }
              alt="External link"
              width={16}
              height={16}
              className={cx("external-icon")}
            />
          </Link>
        </div>
      )}
    </div>
  );
};

export default CombinedLogo;

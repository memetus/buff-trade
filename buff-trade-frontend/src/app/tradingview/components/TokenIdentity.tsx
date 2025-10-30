"use client";

import React from "react";
import Image from "next/image";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

const TokenIdentity: React.FC<{
  imageUrl?: string;
  name?: string;
  symbol?: string;
}> = ({ imageUrl, name, symbol }) => {
  return (
    <div className={cx("agent-header")}>
      <div className={cx("agent-info")}>
        <div className={cx("agent-avatar")}>
          <div className={cx("avatar-circle")}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name || symbol || "Agent"}
                width={52}
                height={52}
                style={{ objectFit: "cover", borderRadius: "50%" }}
                unoptimized
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Image
                src="/images/default-profile.png"
                alt="Agent"
                width={52}
                height={52}
              />
            )}
          </div>
        </div>
        <div className={cx("agent-details")}>
          <h3 className={cx("agent-name")}>{name}</h3>
          <span className={cx("agent-subtitle")}>{symbol}</span>
        </div>
      </div>
    </div>
  );
};

export default TokenIdentity;

"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Props = {
  tokenMint?: string;
  height?: number;
};

const GMGNChartEmbed: React.FC<Props> = ({ tokenMint, height = 400 }) => {
  if (!tokenMint) {
    return (
      <div className={cx("gmgn-chart-placeholder")}>
        Token address missing
      </div>
    );
  }

  const encodedMint = encodeURIComponent(tokenMint);
  const src = `https://www.gmgn.cc/kline/sol/${encodedMint}`;

  return (
    <div className={cx("gmgn-chart-container")} style={{ height }}>
      <iframe
        className={cx("gmgn-chart-frame")}
        src={src}
        title={`GMGN price chart for ${tokenMint}`}
        frameBorder={0}
        loading="lazy"
        allowFullScreen
      />
    </div>
  );
};

export default GMGNChartEmbed;

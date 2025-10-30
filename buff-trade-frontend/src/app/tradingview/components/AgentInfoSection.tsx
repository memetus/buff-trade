"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Props = {
  agentMetadata: any;
  showTitle?: boolean;
};

const AgentInfoSection: React.FC<Props> = ({
  agentMetadata,
  showTitle = true,
}) => {
  const realizedProfit = agentMetadata?.realizedProfit || 0;
  const unrealizedProfit = agentMetadata?.unrealizedProfit || 0;
  const totalPnL = agentMetadata?.totalPnL || 0;
  const nav = agentMetadata?.nav || 0;

  return (
    <div className={cx("agent-info-section")}>
      {showTitle && <h4 className={cx("section-title")}>Agent Info</h4>}
      <div className={cx("agent-stats")}>
        <div className={cx("stat-item")}>
          <span className={cx("stat-label")}>NAV:</span>
          <span className={cx("stat-value")}>{nav.toLocaleString()} SOL</span>
        </div>
        <div className={cx("stat-item")}>
          <span className={cx("stat-label")}>Realized PnL:</span>
          <span
            className={cx(
              "stat-value",
              realizedProfit >= 0 ? "positive" : "negative"
            )}
          >
            {realizedProfit >= 0 ? "+" : ""}
            {realizedProfit.toLocaleString()} SOL
          </span>
        </div>
        <div className={cx("stat-item")}>
          <span className={cx("stat-label")}>Unrealized PnL:</span>
          <span
            className={cx(
              "stat-value",
              unrealizedProfit >= 0 ? "positive" : "negative"
            )}
          >
            {unrealizedProfit >= 0 ? "+" : ""}
            {unrealizedProfit.toLocaleString()} SOL
          </span>
        </div>
        <div className={cx("stat-item")}>
          <span className={cx("stat-label")}>Total PnL:</span>
          <span
            className={cx(
              "stat-value",
              totalPnL >= 0 ? "positive" : "negative"
            )}
          >
            {totalPnL >= 0 ? "+" : ""}
            {totalPnL.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default AgentInfoSection;

"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";
import AgentChart from "@/components/common/chart/AgentChart";
import GMGNChartEmbed from "./GMGNChartEmbed";

const cx = classNames.bind(styles);

type Props = {
  chartTab: string;
  setChartTab: (tab: string) => void;
  tokenMint?: string;
  graphData: any[];
  graphLoading: boolean;
  fundId?: string | null; // fundId 추가
};

const ChartSection: React.FC<Props> = ({
  chartTab,
  setChartTab,
  tokenMint,
  graphData,
  graphLoading,
  fundId,
}) => {
  return (
    <div className={cx("chart-section")}>
      <div className={cx("chart-tabs")}>
        <button
          className={cx("chart-tab", { active: chartTab === "token-graph" })}
          onClick={() => setChartTab("token-graph")}
        >
          Token Graph
        </button>
        <button
          className={cx("chart-tab", { active: chartTab === "agent-graph" })}
          onClick={() => setChartTab("agent-graph")}
        >
          Agent Graph
        </button>
      </div>

      {chartTab === "token-graph" ? (
        <GMGNChartEmbed tokenMint={tokenMint} height={400} />
      ) : (
        <AgentChart
          height={400}
          data={graphData}
          loading={graphLoading}
          fundId={fundId}
        />
      )}
    </div>
  );
};

export default ChartSection;

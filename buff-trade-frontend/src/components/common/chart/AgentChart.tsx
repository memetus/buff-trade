"use client";

import React from "react";
import styles from "./TradingViewChart.module.scss";
import classNames from "classnames/bind";
import {
  Chart,
  LinearScale,
  CategoryScale,
  LineElement,
  PointElement,
  Legend,
  Title,
  Tooltip,
  Filler,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import { formatThousand } from "@/shared/utils/numberFormat";

const cx = classNames.bind(styles);

Chart.register(
  LinearScale,
  CategoryScale,
  LineElement,
  PointElement,
  Legend,
  Title,
  annotationPlugin,
  Tooltip,
  Filler
);

interface AgentChartProps {
  height?: number;
  className?: string;
  data?: Array<{ value: number; timestamp: string }>;
  loading?: boolean;
  fundId?: string | null; // fundId를 props로 받기
}

const AgentChart: React.FC<AgentChartProps> = ({
  height = 400,
  className,
  data,
  loading = false,
  fundId: propFundId,
}) => {
  const [viewState, setViewState] = React.useState<"1D" | "1H" | "12H" | "4H">(
    "1H"
  );

  // 내부 상태로 그래프 데이터 관리
  const [chartData, setChartData] = React.useState<
    Array<{ value: number; timestamp: string }>
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // 그래프 데이터 가져오기
  React.useEffect(() => {
    // API에서 실제 데이터 가져와서 그래프 그리기
    const fetchGraphData = async () => {
      // props에서 fundId를 우선 사용, 없으면 localStorage에서 가져오기
      const fundId = propFundId || localStorage.getItem("fundId");
      const accessToken = localStorage.getItem("accessToken");

      if (!fundId) {
        console.warn("⚠️ No fundId found for graph data");
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`/api/agent-graph/${fundId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
        });

        if (response.ok) {
          const result = await response.json();

          // 데이터 변환 (API 응답을 AgentChart 형식으로)
          if (result.results && result.results.length > 0) {
            const convertedData = result.results.map(
              (item: any, index: number) => {
                // 다양한 필드명에서 timestamp 찾기
                const timestamp =
                  item.timestamp ||
                  item.createdAt ||
                  item.date ||
                  item.time ||
                  new Date().toISOString();

                // 다양한 필드명에서 value 찾기 (total 필드 우선)
                const value =
                  item.total ||
                  item.value ||
                  item.nav ||
                  item.NAV ||
                  item.price ||
                  item.y ||
                  0;

                // 거래 타입에 따라 값 조정 (buy는 양수, sell은 음수)
                const adjustedValue =
                  item.type === "sell" ? -Math.abs(value) : Math.abs(value);

                return {
                  timestamp: timestamp,
                  value: adjustedValue,
                };
              }
            );

            // 상태에 데이터 저장
            setChartData(convertedData);
          } else {
            console.warn("📊 No results found in API response");
            setChartData([]);
          }
        } else {
          const errorText = await response.text();
          console.error("📊 Graph data fetch failed:", errorText);
        }
      } catch (error) {
        console.error("📊 Graph data fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // 그래프 데이터 가져오기 실행
    fetchGraphData();
  }, [propFundId]); // propFundId가 변경될 때마다 실행

  // Sort once and bucketize so 1H/4H/12H/1D are distinct even when timestamps are not exact
  const sortedData = React.useMemo(() => {
    // 내부 상태의 chartData를 우선 사용, 없으면 props의 data 사용
    const dataToUse = chartData.length > 0 ? chartData : data || [];

    if (!dataToUse || dataToUse.length === 0)
      return [] as Array<{ timestamp: string; value: number }>;
    return [...dataToUse].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    );
  }, [chartData, data]);

  const bucketize = React.useCallback(
    (bucketHours: number) => {
      if (!sortedData.length)
        return [] as Array<{ timestamp: string; value: number }>;
      if (bucketHours <= 1) return sortedData;
      const byBucket = new Map<string, { timestamp: string; value: number }>();
      for (const item of sortedData) {
        const d = new Date(item.timestamp);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth();
        const day = d.getUTCDate();
        const h = d.getUTCHours();
        const bucket = Math.floor(h / bucketHours);
        const key = `${y}-${m}-${day}-${bucket}`;
        byBucket.set(key, item);
      }
      return Array.from(byBucket.values());
    },
    [sortedData]
  );

  const filteredData = React.useMemo(() => {
    switch (viewState) {
      case "4H":
        return bucketize(4);
      case "12H":
        return bucketize(12);
      case "1D":
        return bucketize(24);
      case "1H":
      default:
        return bucketize(1);
    }
  }, [viewState, bucketize]);

  const chartXData = React.useMemo(() => {
    return filteredData.map((item) => {
      const month = item.timestamp.slice(5, 7);
      const day = item.timestamp.slice(8, 10);
      const hour = item.timestamp.slice(11, 13);
      return viewState === "1D"
        ? `${month}/${day}`
        : `${month}/${day}:${hour}:00`;
    });
  }, [filteredData, viewState]);

  const values = React.useMemo(() => {
    if (!filteredData || filteredData.length === 0)
      return { scope: [0, 0] as [number, number], result: [] as number[] };
    const result = filteredData.map((d) => parseFloat(d.value.toFixed(2)));
    const min = Math.floor(Math.min(...result));
    const max = Math.ceil(Math.max(...result));
    return { scope: [min, max] as [number, number], result };
  }, [filteredData]);

  const yAxisGraph = React.useMemo(() => {
    return {
      labels: chartXData,
      datasets: [
        {
          data: values.result,
          borderColor: "transparent",
          pointRadius: 0,
        },
      ],
    } as any;
  }, [chartXData, values.result]);

  const graph = React.useMemo(() => {
    const graphData = {
      labels: chartXData,
      datasets: [
        {
          label: "NAV",
          data: values.result,
          fill: true,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const chart = context.chart;
            const gradient = ctx.createLinearGradient(
              0,
              0,
              0,
              chart.height || 300
            );
            gradient.addColorStop(0, "rgba(199, 67, 15, 0.20)");
            gradient.addColorStop(1, "rgba(199, 67, 15, 0.00)");
            return gradient;
          },
          borderColor: "#C7430F",
          borderWidth: 2,
          tension: 0.2,
          pointStyle: "circle" as const,
          pointRadius: 3,
          pointBackgroundColor: "#C7430F",
          pointHoverRadius: 4,
          showLine: true,
        },
      ],
    } as any;

    return graphData;
  }, [chartXData, values.result]);

  const width = React.useMemo(() => {
    const baseWidth = (values.result?.length || 0) * 20 + 150;
    if (baseWidth < 987) return 987;
    return baseWidth;
  }, [values.result?.length]);

  return (
    <div className={cx("tradingview-chart", className)}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 6,
          background: "#0a0a0a",
          height,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
          }}
        >
          <span style={{ color: "#fff", fontWeight: 600 }}>NAV</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["1D", "12H", "4H", "1H"].map((r) => (
              <button
                key={r}
                onClick={() => setViewState(r as any)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #333",
                  background: viewState === r ? "#333" : "#1a1a1a",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                color: "#fff",
                fontSize: "14px",
              }}
            >
              Loading chart data...
            </div>
          ) : (
            <>
              <div style={{ width: 24, paddingLeft: 6 }}>
                <Line
                  className={cx("y-axis-canvas")}
                  data={{ ...yAxisGraph }}
                  width={24}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: { display: false, beginAtZero: false },
                      y: {
                        display: true,
                        grid: { display: false },
                        ticks: { color: "#999" },
                      },
                    },
                    elements: {
                      line: { borderWidth: 0 },
                      point: { radius: 0 },
                    },
                  }}
                />
              </div>
              <div style={{ overflowX: "auto", flex: 1 }}>
                <div style={{ width: `${width}px`, height: height - 48 }}>
                  <Line
                    className={cx("canvas")}
                    data={{ ...graph }}
                    width={width}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      interaction: { mode: "index", intersect: true },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          enabled: true,
                          callbacks: {
                            title: (context: any) =>
                              `Date: ${context[0].label}`,
                            label: (context: any) => {
                              const value = context.parsed.y as number;
                              return `NAV: $${formatThousand(
                                Number(value.toFixed(2))
                              )}`;
                            },
                          },
                        },
                      },
                      scales: {
                        x: {
                          ticks: {},
                          offset: true,
                          display: false,
                          beginAtZero: false,
                        },
                        y: {
                          ticks: { display: false },
                          grid: {
                            display: true,
                            color: "rgba(255, 255, 255, 0.1)",
                            lineWidth: 1,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentChart;

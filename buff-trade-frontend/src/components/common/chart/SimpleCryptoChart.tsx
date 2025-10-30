"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "./SimpleCryptoChart.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface SimpleCryptoChartProps {
  symbol?: string;
  height?: number;
  className?: string;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const SimpleCryptoChart: React.FC<SimpleCryptoChartProps> = ({
  symbol = "BTCUSDT",
  height = 400,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);

  // 크립토 데이터 생성
  const generateCryptoData = useCallback((): CandleData[] => {
    const data: CandleData[] = [];

    const getBasePrice = (symbol: string): number => {
      switch (symbol.toUpperCase()) {
        case "BTCUSDT":
          return 65000;
        case "ETHUSDT":
          return 3500;
        case "SOLUSDT":
          return 150;
        case "ADAUSDT":
          return 0.5;
        case "DOTUSDT":
          return 7;
        default:
          return 1;
      }
    };

    const basePrice = getBasePrice(symbol);
    let currentPrice = basePrice;
    const now = Date.now();

    for (let i = 200; i >= 0; i--) {
      const time = now - i * 15 * 60 * 1000; // 15분 간격
      const open = currentPrice;

      const volatility = basePrice * 0.02;
      const change = (Math.random() - 0.5) * volatility;
      const close = Math.max(basePrice * 0.1, open + change);
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;

      data.push({ time, open, high, low, close });
      currentPrice = close;
    }

    return data;
  }, [symbol]);

  // 차트 그리기
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 배경 지우기
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // 그리드 그리기
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;

    // 수평 그리드
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // 수직 그리드
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // 가격 범위 계산
    const prices = candleData.flatMap((c) => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // 캔들스틱 그리기
    const candleWidth = Math.max(1, chartWidth / candleData.length - 1);

    candleData.forEach((candle, index) => {
      const x = padding + (index * chartWidth) / candleData.length;
      const centerX = x + candleWidth / 2;

      // 고가-저가 선
      const highY =
        padding + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY =
        padding + ((maxPrice - candle.low) / priceRange) * chartHeight;

      ctx.strokeStyle = candle.close >= candle.open ? "#00d4aa" : "#ff6b6b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, highY);
      ctx.lineTo(centerX, lowY);
      ctx.stroke();

      // 캔들 몸체
      const openY =
        padding + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY =
        padding + ((maxPrice - candle.close) / priceRange) * chartHeight;

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);

      if (candle.close >= candle.open) {
        ctx.fillStyle = "#00d4aa";
        ctx.fillRect(x, bodyTop, candleWidth, Math.max(1, bodyHeight));
      } else {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(x, bodyTop, candleWidth, Math.max(1, bodyHeight));
      }
    });

    // 가격 레이블
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.textAlign = "right";

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(2), padding - 10, y + 4);
    }
  }, [candleData]);

  useEffect(() => {
    const data = generateCryptoData();
    setCandleData(data);

    if (data.length > 0) {
      const lastCandle = data[data.length - 1];
      setCurrentPrice(lastCandle.close);
      setPriceChange(
        ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
      );
    }
  }, [generateCryptoData, symbol]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // 실시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCandleData((prev) => {
        const newData = [...prev];
        const lastCandle = newData[newData.length - 1];

        const volatility = lastCandle.close * 0.001;
        const change = (Math.random() - 0.5) * volatility;
        const newClose = Math.max(
          lastCandle.close * 0.5,
          lastCandle.close + change
        );
        const newHigh =
          Math.max(lastCandle.close, newClose) +
          Math.random() * volatility * 0.5;
        const newLow =
          Math.min(lastCandle.close, newClose) -
          Math.random() * volatility * 0.5;

        const newCandle: CandleData = {
          time: Date.now(),
          open: lastCandle.close,
          high: newHigh,
          low: newLow,
          close: newClose,
        };

        newData.push(newCandle);
        if (newData.length > 200) {
          newData.shift();
        }

        setCurrentPrice(newClose);
        setPriceChange(
          ((newClose - lastCandle.close) / lastCandle.close) * 100
        );

        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cx("simple-crypto-chart", className)}>
      <div className={cx("chart-header")}>
        <div className={cx("symbol-info")}>
          <span className={cx("symbol")}>{symbol}</span>
          <span className={cx("price")}>${currentPrice.toFixed(2)}</span>
          <span
            className={cx("change", priceChange >= 0 ? "positive" : "negative")}
          >
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)}%
          </span>
        </div>
        <div className={cx("chart-controls")}>
          <button className={cx("control-btn")}>15m</button>
          <button className={cx("control-btn")}>0</button>
          <select className={cx("indicators-select")}>
            <option>Indicators</option>
            <option>RSI</option>
            <option>MACD</option>
            <option>Bollinger Bands</option>
          </select>
          <button className={cx("control-btn")}>Price/Volume</button>
        </div>
      </div>

      <div className={cx("chart-container")}>
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          className={cx("chart-canvas")}
        />
      </div>

      <div className={cx("chart-footer")}>
        <div className={cx("tradingview-logo")}>
          <span>TV</span>
        </div>
        <div className={cx("chart-info")}>
          <span suppressHydrationWarning>
            {new Date().toLocaleTimeString("en-US", {
              hour12: true,
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            (UTC-4) % log auto
          </span>
        </div>
      </div>
    </div>
  );
};

export default SimpleCryptoChart;

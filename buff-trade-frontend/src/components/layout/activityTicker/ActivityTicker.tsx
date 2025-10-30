"use client";
import React from "react";
import styles from "@/components/layout/activityTicker/ActivityTicker.module.scss";
import classNames from "classnames/bind";
import { useQuery } from "@tanstack/react-query";
import { jsonFetch } from "@/shared/api/client";
import Image from "next/image";

const cx = classNames.bind(styles);

type Activity = {
  user: string;
  action: "bought" | "sold";
  amount: string;
  symbol: string;
  type: "token" | "agent";
  pnl?: { type: "profit" | "loss"; value: string };
};

type TransactionTickerResponse = {
  agentTradingResult?: Array<{
    agentTicker: string;
    type: string;
    solAmount: number;
    tokenTicker: string;
  }>;
  tokenTransaction?: Array<{
    walletAddress: string;
    tokenTicker: string;
    type: string;
    tokenAmount: number;
  }>;
};

const SOL_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const TOKEN_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatSymbol(value: string | null | undefined) {
  const ticker = (value || "").trim();
  if (!ticker) return "-";
  return `$${ticker.toUpperCase()}`;
}

function formatSolAmount(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return `${SOL_FORMATTER.format(Number(value))} SOL`;
}

function formatTokenAmount(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  if (numeric >= 1_000_000) {
    const millions = numeric / 1_000_000;
    return `${TOKEN_FORMATTER.format(millions)}M tokens`;
  }
  if (numeric >= 1_000) {
    return `${TOKEN_FORMATTER.format(numeric)} tokens`;
  }
  return `${TOKEN_FORMATTER.format(numeric)} token${numeric === 1 ? "" : "s"}`;
}

function toAction(type: string | null | undefined) {
  const normalized = (type || "").toLowerCase();
  return normalized === "buy" ? "bought" : "sold";
}

function shortenAddress(address: string | null | undefined) {
  if (!address) return "Unknown";
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function mapTickerResponseToActivities(
  payload: TransactionTickerResponse
): Activity[] {
  const agentActivities = (payload.agentTradingResult ?? []).map<Activity>(
    (item) => ({
      user: item.agentTicker || "Unknown Agent",
      action: toAction(item.type),
      amount: formatSolAmount(item.solAmount),
      symbol: formatSymbol(item.tokenTicker),
      type: "agent",
    })
  );

  const tokenActivities = (payload.tokenTransaction ?? []).map<Activity>(
    (item) => ({
      user: shortenAddress(item.walletAddress),
      action: toAction(item.type),
      amount: formatTokenAmount(item.tokenAmount),
      symbol: formatSymbol(item.tokenTicker),
      type: "token",
    })
  );

  return [...agentActivities, ...tokenActivities];
}

function getStatusMeta(action: Activity["action"]) {
  if (action === "bought") {
    return { text: "profit", tone: "profit" as const };
  }
  if (action === "sold") {
    return { text: "sell", tone: "loss" as const };
  }
  return null;
}

const ActivityTicker = ({
  items = [],
}: {
  items?: Activity[];
}) => {
  const { data: remoteActivities } = useQuery({
    queryKey: ["transactionTicker"],
    queryFn: async () => {
      const response = await jsonFetch<TransactionTickerResponse>(
        "/token/transaction-ticker"
      );
      return mapTickerResponseToActivities(response);
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const activityList =
    remoteActivities && remoteActivities.length ? remoteActivities : items;

  if (!activityList.length) {
    return null;
  }

  const renderChip = (a: Activity, idx: number) => {
    const status = getStatusMeta(a.action);

    return (
      <div className={cx("chip")} key={`${a.user}-${idx}`}>
        <Image
          src={a.type === "token" ? "/icons/Token.svg" : "/icons/Agent.svg"}
          alt={a.type === "token" ? "Token" : "Agent"}
          className={cx("type-icon")}
          width={16}
          height={16}
        />
        <span className={cx("user")}>{a.user}</span>
        <span className={cx("text")}> {a.action} </span>
        <span className={cx("amount")}>{a.amount}</span>
        <span className={cx("text")}> of </span>
        <span className={cx("symbol")}>{a.symbol}</span>
        {a.pnl && (
          <span className={cx("text")}>
            {" "}
            with <span className={cx("pnl", a.pnl.type)}>
              {a.pnl.value}
            </span>{" "}
            {a.pnl.type}
          </span>
        )}
        {status && (
          <span className={cx("pnl", status.tone)}>{status.text}</span>
        )}
      </div>
    );
  };

  return (
    <div className={cx("ticker-root")}>
      <div className={cx("mask-left")} />
      <div className={cx("mask-right")} />
      <div className={cx("track")}>
        <div className={cx("row")}>
          {activityList.map((a, i) => renderChip(a, i))}
          {activityList.map((a, i) => renderChip(a, i + activityList.length))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;

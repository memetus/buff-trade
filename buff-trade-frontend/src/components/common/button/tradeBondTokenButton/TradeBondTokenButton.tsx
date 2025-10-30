"use client";
import React from "react";
import styles from "@/components/common/button/tradeBondTokenButton/TradeBondTokenButton.module.scss";
import classNames from "classnames/bind";
import { useBondingCurve } from "@/shared/hooks/useBondingCurve";

const cx = classNames.bind(styles);

type Props = {
  title: string;
  type: "buy" | "sell";
  pool: string;
  amount: string;
};

const TradeBondTokenButton = ({ title, type, pool, amount }: Props) => {
  const { buyToken, sellToken } = useBondingCurve();
  const handleOnClick = () => {
    if (type === "buy") {
      buyToken(pool, Number(amount));
    } else if (type === "sell") {
      sellToken(pool, Number(amount));
    }
  };
  return (
    <button
      className={cx("button")}
      aria-label="trade-bond-token"
      onClick={handleOnClick}
    >
      <span className={cx("button-text")}>{title}</span>
    </button>
  );
};

export default TradeBondTokenButton;

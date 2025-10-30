"use client";
import React from "react";
import classNames from "classnames/bind";
import SkeletonCard from "./SkeletonCard";
import styles from "./TradingViewSkeleton.module.scss";

const cx = classNames.bind(styles);

const TradingViewSkeleton = () => {
  return (
    <div className={cx("tv-skeleton")}>
      <div className={cx("header")}
      >
        <div className={cx("avatar")} />
        <div className={cx("title-block")}>
          <div className={cx("title-line", "lg")} />
          <div className={cx("title-line", "sm")} />
        </div>
      </div>

      <div className={cx("banner")} />

      <div className={cx("chart")} />

      <div className={cx("cards")}>
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className={cx("table")} />
    </div>
  );
};

export default TradingViewSkeleton;

"use client";
import React from "react";
import styles from "./SkeletonCard.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface SkeletonCardProps {
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <div className={cx("skeleton-card", className)}>
      <div className={cx("skeleton-content")}>
        <div className={cx("skeleton-avatar")}></div>
        <div className={cx("skeleton-text-group")}>
          <div className={cx("skeleton-title")}></div>
          <div className={cx("skeleton-subtitle")}></div>
        </div>
        <div className={cx("skeleton-description")}></div>
        <div className={cx("skeleton-stats")}>
          <div className={cx("skeleton-stat")}></div>
          <div className={cx("skeleton-stat")}></div>
          <div className={cx("skeleton-stat")}></div>
          <div className={cx("skeleton-stat")}></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;

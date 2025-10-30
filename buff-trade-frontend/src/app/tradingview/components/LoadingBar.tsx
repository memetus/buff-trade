"use client";

import React from "react";
import { LoadingState } from "../types";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface LoadingBarProps {
  loadingState: LoadingState;
  loadingMessage: string;
  onClear: () => void;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  loadingState,
  loadingMessage,
  onClear,
}) => {
  if (loadingState === "idle") return null;

  return (
    <div className={cx("loading-bar-overlay")}>
      <div className={cx("loading-bar-container", loadingState)}>
        <div
          className={cx(
            "loading-icon",
            loadingState === "success"
              ? "success-icon"
              : loadingState === "failure"
              ? "failure-icon"
              : "spinner"
          )}
        >
          {loadingState === "success" && "✓"}
          {loadingState === "failure" && "!"}
          {loadingState === "progress" && ""}
        </div>
        <div className={cx("loading-content")}>{loadingMessage}</div>
        <button className={cx("loading-close")} onClick={onClear}>
          ×
        </button>
      </div>
    </div>
  );
};

export default LoadingBar;

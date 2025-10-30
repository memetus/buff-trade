"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type StrategySectionProps = {
  strategy?: string;
  showTitle?: boolean;
};

const StrategySection: React.FC<StrategySectionProps> = ({
  strategy,
  showTitle = true,
}) => {
  return (
    <div className={cx("strategy-section")}>
      {showTitle && <h4 className={cx("section-title")}>Trading Strategy</h4>}
      <p className={cx("strategy-text")}>{strategy || ""}</p>
    </div>
  );
};

export default StrategySection;

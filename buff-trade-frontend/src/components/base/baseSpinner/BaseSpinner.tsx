import React from "react";
import styles from "@/components/base/baseSpinner/BaseSpinner.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Props = {
  type: "base" | "global";
  color: "light" | "dark" | "gray";
  size: number;
};

const BaseSpinner = ({ type, color, size }: Props) => {
  return (
    <div
      className={cx(
        "spinner",
        type === "global" ? "spinner-global" : "spinner-base"
      )}
    >
      <div style={{ width: size }} className={cx(`loader-${color}`)} />
    </div>
  );
};

export default BaseSpinner;

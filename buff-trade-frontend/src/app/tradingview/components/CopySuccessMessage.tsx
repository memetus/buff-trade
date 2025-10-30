"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface CopySuccessMessageProps {
  message: string | null;
}

const CopySuccessMessage: React.FC<CopySuccessMessageProps> = ({ message }) => {
  if (!message) return null;

  return <div className={cx("copy-success-message")}>{message}</div>;
};

export default CopySuccessMessage;

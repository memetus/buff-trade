import React from "react";
import styles from "@/components/common/logo/textLogo/TextLogo.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

const TextLogo = () => {
  return (
    <div className={cx("base-logo")}>
      <span className={cx("base-logo-text", "display-xs-bold")}>
        Homo Memetus
      </span>
    </div>
  );
};

export default TextLogo;

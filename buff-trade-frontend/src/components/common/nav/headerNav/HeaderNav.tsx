import React from "react";
import styles from "@/components/common/nav/headerNav/HeaderNav.module.scss";
import Link from "next/link";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

const HeaderNav = () => {
  return (
    <div className={cx("header-nav-wrapper")}>
      <Link href={"/create-token"} className={cx("launch-button")}>
        <span className={cx("launch-icon")}>+</span>
        <span className={cx("launch-text")}>Launch</span>
      </Link>
    </div>
  );
};

export default HeaderNav;

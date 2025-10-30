import React, { ReactNode } from "react";
import styles from "@/components/base/baseLayout/BaseLayout.module.scss";
import classNames from "classnames/bind";
import Header from "@/components/layout/header/Header";
import Sidebar from "@/components/layout/sidebar/Sidebar";
import ActivityTicker from "@/components/layout/activityTicker/ActivityTicker";

const cx = classNames.bind(styles);

type Props = {
  children: ReactNode;
};

const BaseLayout = ({ children }: Props) => {
  return (
    <div className={cx("layout")}>
      <Header />
      <ActivityTicker />
      <div className={cx("layout-content")}>{children}</div>
    </div>
  );
};

export default BaseLayout;

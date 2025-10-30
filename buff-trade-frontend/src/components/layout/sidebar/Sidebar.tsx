import React from "react";
import styles from "@/components/layout/sidebar/Sidebar.module.scss";
import classNames from "classnames/bind";
import SidebarNav from "@/components/common/nav/sidebarNav/SidebarNav";

const cx = classNames.bind(styles);

const Sidebar = () => {
  return (
    <div className={cx("sidebar")}>
      <SidebarNav />
    </div>
  );
};

export default Sidebar;

import React from "react";
import styles from "@/components/common/nav/sidebarNav/SidebarNav.module.scss";
import classNames from "classnames/bind";
import Link from "next/link";
import HomeIcon from "@/public/icons/home.svg";
import PlusIcon from "@/public/icons/plus.svg";
import DashboardIcon from "@/public/icons/dashboard.svg";
import BarChartIcon from "@/public/icons/bar-chart.svg";

const cx = classNames.bind(styles);

const SidebarNav = () => {
  return (
    <div className={cx("sidebar-nav-wrapper")}>
      <nav className={cx("sidebar-nav")}>
        <Link href={"/"} className={cx("sidebar-nav-item")}>
          <HomeIcon
            viewBox="0 0 20 22"
            className={cx("nav-item-icon", { stroke: true })}
          />
          <span className={cx("nav-item-text")}>Home</span>
        </Link>
        <Link href={"/launch"} className={cx("sidebar-nav-item")}>
          <PlusIcon
            viewBox="0 0 24 24"
            className={cx("nav-item-icon", { stroke: true })}
          />
          <span className={cx("nav-item-text")}>Launch</span>
        </Link>
        <Link href={"/dashboard"} className={cx("sidebar-nav-item")}>
          <DashboardIcon
            viewBox="0 0 15 15"
            className={cx("nav-item-icon", { fill: true })}
          />
          <span className={cx("nav-item-text")}>Dashboard</span>
        </Link>
        <Link href={"/token"} className={cx("sidebar-nav-item")}>
          <BarChartIcon
            viewBox="0 0 24 24"
            className={cx("nav-item-icon", { stroke: true })}
          />
          <span className={cx("nav-item-text")}>Token</span>
        </Link>
        <Link href={"/test"} className={cx("sidebar-nav-item")}>
          <span className={cx("nav-item-text")}>Test</span>
        </Link>
        <Link
          href="https://homo-memetus.gitbook.io/homo-memetus/"
          target="_blank"
          rel="noopener noreferrer"
          className={cx("sidebar-nav-item")}
        >
          <span className={cx("nav-item-text")}>Docs</span>
        </Link>
      </nav>
    </div>
  );
};

export default SidebarNav;

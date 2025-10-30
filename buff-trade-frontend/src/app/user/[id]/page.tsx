import React from "react";
import classNames from "classnames/bind";
import styles from "@/app/user/[id]/page.module.scss";

const cx = classNames.bind(styles);

const UserPage = () => {
  return <div className={cx("page")}></div>;
};

export default UserPage;

import React, { ReactNode } from "react";
import styles from "@/app/main-page/layout.module.scss";
import classNames from "classnames/bind";
import BaseLayout from "@/components/base/baseLayout/BaseLayout";

const cx = classNames.bind(styles);

type Props = {
  children: ReactNode;
};

const MainLayout = ({ children }: Props) => {
  return (
    <div className={cx("gradient-wrapper")}>
      <BaseLayout>{children}</BaseLayout>
    </div>
  );
};

export default MainLayout;

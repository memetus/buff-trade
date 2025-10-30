import React, { ReactNode } from "react";
import BaseLayout from "@/components/base/baseLayout/BaseLayout";
import styles from "@/app/dashboard/layout.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Props = {
  children: ReactNode;
};

const DashboardLayout = ({ children }: Props) => {
  return <BaseLayout>{children}</BaseLayout>;
};

export default DashboardLayout;

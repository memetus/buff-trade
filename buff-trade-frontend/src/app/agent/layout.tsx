import React, { ReactNode } from "react";
import styles from "@/app/agent/layout.module.scss";
import classNames from "classnames/bind";
import BaseLayout from "@/components/base/baseLayout/BaseLayout";

const cx = classNames.bind(styles);

type Props = {
  children: ReactNode;
};

const AgentLayout = ({ children }: Props) => {
  return <BaseLayout>{children}</BaseLayout>;
};

export default AgentLayout;

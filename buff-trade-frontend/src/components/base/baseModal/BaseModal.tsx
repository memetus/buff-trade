import React, { ReactNode } from "react";
import styles from "@/components/base/baseModal/BaseModal.module.scss";
import classNames from "classnames/bind";
import ReactDOM from "react-dom";

const cx = classNames.bind(styles);

type Props = {
  children: ReactNode;
};

const BaseModal = ({ children }: Props) => {
  return ReactDOM.createPortal(
    <div className={cx("modal-wrapper")}>{children}</div>,
    document.getElementById("modal-root") as HTMLElement
  );
};

export default BaseModal;

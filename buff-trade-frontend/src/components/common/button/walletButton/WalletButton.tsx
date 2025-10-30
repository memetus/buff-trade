import React from "react";
import styles from "@/components/common/button/walletButton//WalletButton.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

type Props = {
  walletName: string;
  onClick: () => void;
  icon: string;
};

const WalletButton = ({ walletName, onClick, icon }: Props) => {
  return (
    <button className={cx("button")} onClick={onClick} title={walletName}>
      <i className={cx("icon", icon)} />
      <span className={cx("button-text")}>{walletName}</span>
    </button>
  );
};

export default WalletButton;

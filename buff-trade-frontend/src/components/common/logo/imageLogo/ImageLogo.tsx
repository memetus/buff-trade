import React from "react";
import styles from "@/components/common/logo/imageLogo/ImageLogo.module.scss";
import classNames from "classnames/bind";
import LogoIcon from "@/public/icons/logo.svg";

const cx = classNames.bind(styles);

const ImageLogo = () => {
  return (
    <div className={cx("base-logo")}>
      <LogoIcon viewBox="0 0 520 520" className={cx("icon")} />
    </div>
  );
};

export default ImageLogo;

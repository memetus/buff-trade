"use client";

import React from "react";
import styles from "../page.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

const MigrationBanner: React.FC<{
  isMigration: boolean;
  onClose?: () => void;
}> = ({ isMigration, onClose }) => {
  if (!isMigration) return null;
  return (
    <div className={cx("migration-banner")}>
      <span className={cx("migration-icon")}>⚠️</span>
      <span className={cx("migration-text")}>This token has migrated.</span>
      <button className={cx("migration-close")} onClick={onClose}>
        ×
      </button>
    </div>
  );
};

export default MigrationBanner;

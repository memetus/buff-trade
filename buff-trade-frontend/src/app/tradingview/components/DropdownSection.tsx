"use client";

import React from "react";
import Image from "next/image";
import classNames from "classnames/bind";
import styles from "../page.module.scss";

const cx = classNames.bind(styles);

type DropdownSectionProps = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  headerExtras?: React.ReactNode;
};

const DropdownSection: React.FC<DropdownSectionProps> = ({
  title,
  subtitle,
  defaultOpen = false,
  children,
  headerExtras,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className={cx("dropdown-section", { open: isOpen })}>
      <div className={cx("dropdown-header")}>
        <button
          type="button"
          className={cx("dropdown-heading")}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
        >
          <span className={cx("dropdown-title")}>{title}</span>
          {subtitle && (
            <span className={cx("dropdown-subtitle")}>{subtitle}</span>
          )}
        </button>
        {headerExtras && (
          <div className={cx("dropdown-header-extras")}>{headerExtras}</div>
        )}
        <button
          type="button"
          className={cx("dropdown-toggle")}
          onClick={handleToggle}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
          aria-expanded={isOpen}
          aria-controls={contentId}
        >
          <span className={cx("dropdown-icon")} aria-hidden="true">
            <Image
              src={isOpen ? "/icons/downside.svg" : "/icons/upside.svg"}
              alt=""
              className={cx("dropdown-arrow")}
              width={16}
              height={16}
            />
          </span>
        </button>
      </div>
      {isOpen && (
        <div className={cx("dropdown-content")} id={contentId}>
          {children}
        </div>
      )}
    </div>
  );
};

export default DropdownSection;

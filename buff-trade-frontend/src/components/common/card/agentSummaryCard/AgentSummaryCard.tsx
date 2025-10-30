import React from "react";
import styles from "@/components/common/card/agentSummaryCard/AgentSummaryCard.module.scss";
import classNames from "classnames/bind";
import DoubleUpIcon from "@/public/icons/double-up.svg";
import HeartIcon from "@/public/icons/heart.svg";
import Image from "next/image";
import DefaultImage from "@/public/images/default-profile.png"; // Placeholder image
import { getNumberFormat } from "@/shared/utils/numberFormat";

const cx = classNames.bind(styles);

type Props = {
  name: string;
  symbol: string;
  address: string;
  imageURI: string;
  xLink?: string;
  webSite?: string;
  nav: number;
  totalPNL: number;
};

const AgentSummaryCard = ({
  name,
  symbol,
  address,
  imageURI,
  xLink,
  webSite,
  nav,
  totalPNL,
}: Props) => {
  const navData = getNumberFormat({
    value: nav,
    fixed: 2,
    prefix: "$",
    suffix: "",
    isSign: false,
    notation: "metric",
  });

  const totalPNLData = getNumberFormat({
    value: totalPNL,
    fixed: 2,
    prefix: "",
    suffix: "%",
    isSign: true,
    notation: "thousand",
  });
  return (
    <div className={cx("card")}>
      <div className={cx("card-header")}>
        <div className={cx("card-metadata")}>
          <span className={cx("card-name")}>{name}</span>
          <span className={cx("card-symbol")}>{symbol}</span>
          <span className={cx("card-address")}></span>
        </div>
        <div className={cx("card-button")}>
          <button className={cx("pump-button")} aria-label="boost">
            <DoubleUpIcon viewBox="0 0 48 48" className={cx("pump-icon")} />
          </button>
          <button className={cx("like-button")} aria-label="like">
            <HeartIcon viewBox="0 0 24 24" className={cx("like-icon")} />
          </button>
        </div>
      </div>
      <div className={cx("card-data")}>
        <Image
          src={DefaultImage}
          alt={name}
          width={200}
          height={200}
          priority
          quality={100}
          className={cx("card-image")}
        />
        <div className={cx("card-marketdata")}>
          <div></div>
          <div className={cx("card-market-text-wrapper")}>
            <div className={cx("card-market-text-item")}>
              <span className={cx("market-text-value", { ...navData.style })}>
                {navData.text}
              </span>
            </div>
            <div className={cx("card-market-text-item")}>
              <span className={cx("market-text-label")}>Total PNL</span>
              <span
                className={cx("market-text-value", { ...totalPNLData.style })}
              >
                {totalPNLData.text}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className={cx("card-footer")}>
        <div className={cx("strategy-wrapper")}>
          <span className={cx("strategy-label")}>Strategy</span>
          <span className={cx("strategy-text")}></span>
        </div>
      </div>
    </div>
  );
};

export default AgentSummaryCard;

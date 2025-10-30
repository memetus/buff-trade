"use client";
import React, { useCallback } from "react";
import styles from "@/components/common/button/tradeTokenButton/TradeTokenButton.module.scss";
import classNames from "classnames/bind";
import axios from "axios";
import { GetSwapInstructionParams } from "@/shared/types/data/params/trade";
import { useMutation } from "@tanstack/react-query";
import { useTrade } from "@/shared/hooks/useTrade";

const cx = classNames.bind(styles);

type Props = {
  type?: string;
  params?: GetSwapInstructionParams;
};

const TradeTokenButton: React.FC<Props> = ({ type, params }) => {
  const { getQuote, getSwapInstructions, quoteAndBuildSwapInstructions } =
    useTrade();
  // const apiHandler = useCallback(async () => {
  //   try {
  //     const res = await axios.post("/api/get-instruction", {
  //       ...params,
  //     });

  //     return res.data;
  //   } catch (error) {
  //     console.error("API call error:", error);
  //   }
  // }, []);

  // const tradeMutation = useMutation({
  //   mutationKey: ["tradeToken", type],
  //   mutationFn: apiHandler,
  //   onSuccess: async (data) => {
  //     console.log(data);
  //   },
  // });

  const handleOnClick = useCallback(() => {
    quoteAndBuildSwapInstructions();
  }, [quoteAndBuildSwapInstructions]);

  return (
    <button
      className={cx("button")}
      aria-label="trade-token"
      onClick={handleOnClick}
    >
      <span className={cx("button-text")}>
        {type ? `Trade Token (${type})` : "Trade Token"}
      </span>
    </button>
  );
};

export default TradeTokenButton;

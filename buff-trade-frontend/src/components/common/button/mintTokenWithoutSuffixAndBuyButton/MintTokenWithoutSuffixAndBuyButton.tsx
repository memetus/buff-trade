"use client";
import React from "react";
import styles from "@/components/common/button/mintTokenWithoutSuffixAndBuyButton/MintTokenWithoutSuffixAndBuyButton.module.scss";
import classNames from "classnames/bind";
import { useBondingCurve } from "@/shared/hooks/useBondingCurve";
import { Keypair } from "@solana/web3.js";
import { useWalletConnect } from "@/shared/hooks/useWalletConnect";
import {
  ActivationType,
  BaseFeeMode,
  buildCurve,
  BuildCurveParam,
  CollectFeeMode,
  ConfigParameters,
  MigrationFeeOption,
  MigrationOption,
  TokenDecimal,
  TokenType,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { NATIVE_MINT } from "@solana/spl-token";

const cx = classNames.bind(styles);

const MintTokenWithoutSuffixAndBuyButton = () => {
  const buildParams: BuildCurveParam = {
    totalTokenSupply: 1_000_000_000,
    migrationOption: MigrationOption.MET_DAMM,
    tokenBaseDecimal: TokenDecimal.SIX,
    tokenQuoteDecimal: TokenDecimal.NINE,
    percentageSupplyOnMigration: 20,
    migrationQuoteThreshold: 85,
    lockedVestingParam: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    baseFeeParams: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      feeSchedulerParam: {
        startingFeeBps: 100,
        endingFeeBps: 100,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    },

    dynamicFeeEnabled: true,
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
    tokenType: TokenType.SPL,
    partnerLpPercentage: 7,
    creatorLpPercentage: 0,
    partnerLockedLpPercentage: 93,
    creatorLockedLpPercentage: 0,
    creatorTradingFeePercentage: 0,
    leftover: 10_000,
    tokenUpdateAuthority: 1,
    migrationFee: {
      feePercentage: 0,
      creatorFeePercentage: 0,
    },
  };

  const { publicKey } = useWalletConnect();
  const { mintTokenCreateBondAndBuy } = useBondingCurve();
  const handleOnClick = () => {
    const mint = Keypair.generate();
    const curve = Keypair.generate();
    const config: ConfigParameters = buildCurve(buildParams);

    mintTokenCreateBondAndBuy(
      mint,
      "buff alpha",
      "alpha",
      "https://ipfs.io/ipfs/bafkreibnhnekv72bec4wnz7shphp2rxy5v6cggy3fdlor2vllfcfi6w4bm",
      // "https://ipfs.io/ipfs/bafkreies45wghlmse7hvtln35y3aeezvpd6a5yi42ms5spvxekj4iesjji",
      publicKey!.toBase58(),
      curve,
      config as any,
      NATIVE_MINT.toBase58(),
      publicKey!.toBase58(),
      0.01,
      0
    );
  };
  return (
    <button
      className={cx("button")}
      aria-label="mint-token"
      onClick={handleOnClick}
    >
      <span className={cx("button-text")}>
        Mint Token With Buy(Only Client)
      </span>
    </button>
  );
};

export default MintTokenWithoutSuffixAndBuyButton;

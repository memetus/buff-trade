/**
 * Meteora Dynamic Bonding Curve related types
 */

import { BN } from "@coral-xyz/anchor";

export interface PoolFeeInfo {
  poolAddress: string;
  partnerBaseFee: string; // Hexadecimal string
  partnerQuoteFee: string; // Hexadecimal string
  creatorBaseFee: string; // Hexadecimal string
  creatorQuoteFee: string; // Hexadecimal string
  totalTradingBaseFee: string; // Hexadecimal string
  totalTradingQuoteFee: string; // Hexadecimal string
  unclaimedRewardsLamport?: string; // Hexadecimal string - optional field from API
}

export type PoolsFeesResponse = PoolFeeInfo[]; // API returns array directly

export interface ClaimCreatorTradingFeeParams {
  creator: string;
  payer: string;
  pool: string;
  maxBaseAmount: string;
  maxQuoteAmount: string;
}

export interface ClaimCreatorTradingFeeResponse {
  success: boolean;
  signature?: string;
  pool: string;
  creator: string;
  baseFeesClaimed?: string;
  quoteFeesClaimed?: string;
  message: string;
  error?: string;
}

export interface CreatorRewardInfo {
  tokenAddress: string;
  tokenName: string;
  ticker: string;
  poolAddress: string;
  totalRewards: number; // USD
  unclaimedRewards: number; // USD
  creatorShare: number; // USD (50% of total)
  partnerShare: number; // USD (50% of total)
  isClaimable: boolean;
}

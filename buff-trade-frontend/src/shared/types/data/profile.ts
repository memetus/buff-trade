/**
 * Profile-related type definitions
 */

export interface TokenInfoItem {
  tokenAddress: string;
  name?: string;
  ticker?: string;
  balance: number;
  claimableValue: number; // USD value
  claimableAmount?: number; // Token amount
  poolAddress?: string; // Pool address for claiming
  totalRewards?: number; // Total rewards in USD
  unclaimedRewards?: number; // Unclaimed rewards in USD
}

export interface ProfileTokenResponse {
  tokenInfoList: TokenInfoItem[];
}

export interface ProfileBalanceNative {
  balance: number;
  value: number; // USD value
}

export interface ProfileBalanceToken {
  tokenAddress: string;
  name?: string;
  ticker?: string;
  balance: number;
  value?: number; // USD value
}

export interface ProfileBalanceResponse {
  nativeBalance: ProfileBalanceNative;
  tokens: ProfileBalanceToken[];
}

export interface CombinedTokenDisplay {
  coin: string;
  ticker: string;
  ca: string;
  marketCap: string;
  agentPnL: string;
  balance?: number;
  value?: number;
  tokenAddress?: string;
  claimable: string; // Formatted USD string
  totalRewards: string; // Formatted USD string
  unclaimedRewards: string; // Formatted USD string
  poolAddress: string;
  isClaimable: boolean;
}

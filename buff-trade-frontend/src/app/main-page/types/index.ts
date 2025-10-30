export interface TokenData {
  fundId: string;
  name: string;
  imageUrl: string;
  generation?: number;
  strategyPrompt?: string;
  ticker?: string;
  symbol?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  nav?: number; // optional로 변경
  marketCap?: number; // 새로운 필드
  marketCapChange24h?: number;
  marketCapChangePercent?: number; // 새로운 필드
  realizedProfit?: number;
  unrealizedProfit?: number;
  totalPnL: number;
  totalPnLChange24h?: number;
  totalPnLChangePercent?: number; // 새로운 필드
  survived?: boolean;
  realTrading?: boolean;
  createdAt: string;
  holdingsCount?: number;
  txCount?: number;
  isMigration?: boolean; // 새로운 필드
  isMigrated?: boolean; // 새로운 필드
  tokenAddress?: string; // 새로운 필드
  bondingCurvePool?: string; // 새로운 필드
  dammV2Pool?: string; // 새로운 필드
  poolAddress?: string; // 새로운 필드 - devnet 거래용
  latestTrade?: {
    // 새로운 필드
    symbol: string;
    type: "BUY" | "SELL";
    solAmount: number;
  };
  topPortfolios?: Array<{
    symbol: string;
    totalPnl: number;
  }>;
}

export interface AgentDashboardResponse {
  totalCount: number;
  results: TokenData[];
}

export type CategoryKey = "totalPnL" | "nav" | "txCount" | "createdAt";

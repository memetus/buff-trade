// TradingView 페이지에서 사용하는 타입 정의

export interface AgentMetadata {
  fundId: string;
  name: string;
  ticker: string;
  creator: string;
  tokenAddress: string;
  marketCap: number;
  isMigration: boolean;
  website: string;
  twitter: string;
  telegram: string;
  strategy: string;
  poolAddress?: string;
  imageUrl?: string;
  generation?: number;
  nav?: number;
  realizedProfit?: number;
  unrealizedProfit?: number;
  totalPnL?: number;
  createdAt?: string;
  // merged fields from AgentCardData
  marketCapProgress?: number;
  targetMarketCap?: number;
  // graduation status
  survived?: boolean;
  realTrading?: boolean;
}

export interface PoolInfo {
  poolAddress: string;
  poolInfo: {
    creator: string;
    baseMint: string;
    baseVault: string;
    quoteVault: string;
    baseReserve: string;
    quoteReserve: string;
    sqrtPrice: string;
    activationPoint: string;
    isMigrated: number;
    migrationProgress: number;
    protocolBaseFee: string;
    protocolQuoteFee: string;
    partnerBaseFee: string;
    partnerQuoteFee: string;
    creatorBaseFee: string;
    creatorQuoteFee: string;
    metrics: {
      totalProtocolBaseFee: string;
      totalProtocolQuoteFee: string;
      totalTradingBaseFee: string;
      totalTradingQuoteFee: string;
    };
  };
  tokenPrice: string;
  tokenPriceUSD: number;
  marketCap: number;
}

export interface PoolsResponse {
  success: boolean;
  poolsInfo: PoolInfo[];
  message: string;
}

export type LoadingState = "idle" | "progress" | "success" | "failure";

export type TradeMode = "buy" | "sell";

export type ChartTab = "token-graph" | "agent-graph";

export type ActiveTab =
  | "token-transactions"
  | "token-holders"
  | "agent-activity"
  | "agent-portfolio";
